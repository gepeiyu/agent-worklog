import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  getDailyEventsFile,
  getMetadata,
  getRecordStats,
  listRecords,
  setPointsForScope
} from "../store/db.js";
import { resolveDateRange } from "../utils.js";

const UI_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../dashboard-ui");
const STATIC_FILES = new Map([
  ["/", ["index.html", "text/html; charset=utf-8"]],
  ["/index.html", ["index.html", "text/html; charset=utf-8"]],
  ["/app.js", ["app.js", "text/javascript; charset=utf-8"]],
  ["/styles.css", ["styles.css", "text/css; charset=utf-8"]]
]);

export async function startDashboardServer({ host = "127.0.0.1", port = 4789 } = {}) {
  if (!isLoopbackHost(host)) {
    throw new Error("Dashboard host must be a loopback address");
  }

  const server = createServer(async (request, response) => {
    try {
      await handleRequest(request, response);
    } catch (error) {
      const statusCode = error.statusCode ?? 500;
      sendJson(response, statusCode, { error: error.message });
    }
  });
  const actualPort = await listenWithFallback(server, host, Number(port));
  return {
    server,
    host,
    port: actualPort,
    url: `http://${formatHost(host)}:${actualPort}`,
    close: () => new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    })
  };
}

async function handleRequest(request, response) {
  if (!isAllowedHostHeader(request.headers.host)) {
    sendJson(response, 403, { error: "Invalid dashboard host" });
    return;
  }
  const url = new URL(request.url, "http://127.0.0.1");
  if (request.method === "GET" && url.pathname === "/api/meta") {
    sendJson(response, 200, await getMetadata());
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/records") {
    const filters = queryFilters(url.searchParams);
    const storeFilters = toStoreFilters(filters);
    const records = await listRecords(storeFilters);
    const dailyRecords = filters.platform || filters.project
      ? await listRecords(toDailyStoreFilters(filters.date))
      : records;
    sendJson(response, 200, {
      filters,
      dataFile: getDailyEventsFile(filters.date),
      records,
      stats: getRecordStats(records),
      dailyStats: getRecordStats(dailyRecords)
    });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/points") {
    const body = await readJsonBody(request);
    if (body.total == null || body.total === "") {
      throw badRequest("total is required");
    }
    const filters = {
      date: resolveDateRange({ date: body.date }).from,
      platform: body.platform || null,
      project: body.project || null
    };
    const storeFilters = toStoreFilters(filters);
    const dailyStoreFilters = toDailyStoreFilters(filters.date);
    let allocation;
    try {
      allocation = await setPointsForScope({
        filters: dailyStoreFilters,
        totalPoints: body.total
      });
    } catch (error) {
      throw badRequest(error.message);
    }
    const dailyRecords = await listRecords(dailyStoreFilters);
    const records = filters.platform || filters.project
      ? await listRecords(storeFilters)
      : dailyRecords;
    sendJson(response, 200, {
      allocation: {
        id: allocation.id,
        totalPoints: allocation.totalPoints,
        recordCount: allocation.records.length
      },
      filters,
      dataFile: getDailyEventsFile(filters.date),
      records,
      stats: getRecordStats(records),
      dailyStats: getRecordStats(dailyRecords)
    });
    return;
  }

  if (request.method === "GET" && url.pathname === "/favicon.ico") {
    response.writeHead(204, securityHeaders());
    response.end();
    return;
  }

  const staticFile = STATIC_FILES.get(url.pathname);
  if (request.method === "GET" && staticFile) {
    const [fileName, contentType] = staticFile;
    const content = await readFile(path.join(UI_ROOT, fileName));
    response.writeHead(200, securityHeaders({ "Content-Type": contentType }));
    response.end(content);
    return;
  }

  sendJson(response, 404, { error: "Not found" });
}

function queryFilters(searchParams) {
  return {
    date: resolveDateRange({ date: searchParams.get("date") || undefined }).from,
    platform: searchParams.get("platform") || null,
    project: searchParams.get("project") || null
  };
}

function toStoreFilters(filters) {
  return {
    from: filters.date,
    to: filters.date,
    platform: filters.platform,
    project: filters.project
  };
}

function toDailyStoreFilters(date) {
  return {
    from: date,
    to: date,
    platform: null,
    project: null
  };
}

async function readJsonBody(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 64 * 1024) throw badRequest("Request body is too large");
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
  } catch {
    throw badRequest("Request body must be valid JSON");
  }
}

async function listenWithFallback(server, host, preferredPort) {
  const maxOffset = preferredPort === 0 ? 0 : 10;
  for (let offset = 0; offset <= maxOffset; offset += 1) {
    const candidate = preferredPort + offset;
    try {
      await listen(server, candidate, host);
      return server.address().port;
    } catch (error) {
      if (error.code !== "EADDRINUSE" || offset === maxOffset) throw error;
    }
  }
  throw new Error("No dashboard port available");
}

function listen(server, port, host) {
  return new Promise((resolve, reject) => {
    const onError = (error) => {
      server.off("listening", onListening);
      reject(error);
    };
    const onListening = () => {
      server.off("error", onError);
      resolve();
    };
    server.once("error", onError);
    server.once("listening", onListening);
    server.listen(port, host);
  });
}

function sendJson(response, statusCode, body) {
  response.writeHead(statusCode, securityHeaders({
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  }));
  response.end(`${JSON.stringify(body)}\n`);
}

function securityHeaders(extra = {}) {
  return {
    "Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    ...extra
  };
}

function badRequest(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

function isLoopbackHost(host) {
  return host === "127.0.0.1" || host === "localhost" || host === "::1";
}

function isAllowedHostHeader(hostHeader) {
  if (!hostHeader) return false;
  const host = hostHeader.startsWith("[")
    ? hostHeader.slice(1, hostHeader.indexOf("]"))
    : hostHeader.split(":")[0];
  return isLoopbackHost(host);
}

function formatHost(host) {
  return host.includes(":") ? `[${host}]` : host;
}
