import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { open, readFile, rename, stat, unlink, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { getDataPaths, initializeStore } from "../store/db.js";
import { startDashboardServer } from "./server.js";

const require = createRequire(import.meta.url);
const { version: PACKAGE_VERSION } = require("../../package.json");
const CLI_PATH = fileURLToPath(new URL("../../bin/cli.js", import.meta.url));
const SERVICE_NAME = "agent-worklog-dashboard";
const STATE_VERSION = 1;
const PORT_SCAN_COUNT = 11;
const HEALTH_TIMEOUT_MS = 600;
const START_TIMEOUT_MS = 8_000;
const STOP_TIMEOUT_MS = 5_000;
const LOCK_STALE_MS = 15_000;
const LOCK_RETRIES = 500;
const LOCK_RETRY_MS = 25;

export async function ensureDashboard({
  host = "127.0.0.1",
  port = 4789,
  cliPath = CLI_PATH,
  spawnProcess = spawn
} = {}) {
  return withDashboardLock(async (paths) => {
    const current = await inspectDashboard(paths, { host, port });
    if (current.running && current.managed && current.version !== PACKAGE_VERSION) {
      await stopManagedDashboard(paths, current);
    } else if (current.running) {
      return {
        ...current,
        started: false,
        requiresLegacyCleanup: !current.managed
      };
    }

    const token = randomUUID();
    const child = spawnProcess(
      process.execPath,
      [
        cliPath,
        "dashboard-serve",
        "--host",
        host,
        "--port",
        String(port),
        "--token",
        token
      ],
      {
        detached: true,
        stdio: "ignore",
        windowsHide: true,
        env: { ...process.env }
      }
    );
    child.unref();

    try {
      const childExit = new Promise((resolve, reject) => {
        child.once("error", reject);
        child.once("exit", (code, signal) => {
          reject(new Error(
            `Dashboard service exited before startup${signal ? ` from ${signal}` : ` with code ${code}`}`
          ));
        });
      });
      const started = await Promise.race([
        waitForDashboard(paths, token, START_TIMEOUT_MS),
        childExit
      ]);
      return { ...started, started: true };
    } catch (error) {
      if (child.pid) {
        try {
          process.kill(child.pid, "SIGTERM");
        } catch {
          // The failed child may already have exited.
        }
      }
      throw error;
    }
  });
}

export async function dashboardStatus({ host = "127.0.0.1", port = 4789 } = {}) {
  return withDashboardLock((paths) => inspectDashboard(paths, { host, port }));
}

export async function stopDashboard({ host = "127.0.0.1", port = 4789 } = {}) {
  return withDashboardLock(async (paths) => {
    const current = await inspectDashboard(paths, { host, port });
    if (!current.running) return { ...current, stopped: false };
    if (!current.managed) {
      return { ...current, stopped: false, requiresLegacyCleanup: true };
    }
    await stopManagedDashboard(paths, current);
    return { ...current, running: false, stopped: true };
  });
}

export async function runDashboardService({ host, port, token }) {
  const instance = { token, version: PACKAGE_VERSION };
  const dashboard = await startDashboardServer({ host, port, instance });
  const state = {
    stateVersion: STATE_VERSION,
    service: SERVICE_NAME,
    pid: process.pid,
    token,
    version: PACKAGE_VERSION,
    host: dashboard.host,
    port: dashboard.port,
    url: dashboard.url,
    startedAt: new Date().toISOString()
  };
  await writeDashboardState(state);

  let stopping = false;
  const shutdown = async () => {
    if (stopping) return;
    stopping = true;
    await dashboard.close().catch(() => {});
    await removeOwnedState(token).catch(() => {});
    process.exit(0);
  };
  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}

async function inspectDashboard(paths, { host, port }) {
  const state = await readDashboardState(paths.dashboardStateFile);
  if (state) {
    const health = await probeManagedState(state);
    if (health) {
      return { running: true, managed: true, ...state };
    }
    await removeStateIfMatches(paths.dashboardStateFile, state.token);
  }

  const discovered = await discoverDashboard(host, port);
  if (discovered?.managed) {
    await writeDashboardState(discovered);
    return { running: true, ...discovered };
  }
  if (discovered) return { running: true, ...discovered };
  return { running: false, managed: false, url: null, pid: null, version: null };
}

async function discoverDashboard(host, preferredPort) {
  if (Number(preferredPort) === 0) return null;
  const candidates = Array.from(
    { length: PORT_SCAN_COUNT },
    (_, offset) => Number(preferredPort) + offset
  ).filter((port) => port <= 65535);
  const results = await Promise.all(candidates.map((port) => probePort(host, port)));
  return results.find(Boolean) ?? null;
}

async function probePort(host, port) {
  const url = `http://${formatHost(host)}:${port}`;
  const health = await fetchJson(`${url}/api/health`);
  if (health?.service === SERVICE_NAME && health.token && Number.isInteger(health.pid)) {
    return {
      stateVersion: STATE_VERSION,
      service: SERVICE_NAME,
      running: true,
      managed: true,
      pid: health.pid,
      token: health.token,
      version: health.version,
      host,
      port,
      url,
      startedAt: null
    };
  }

  const metadata = await fetchJson(`${url}/api/meta`);
  if (metadata?.dataDirectory && metadata?.filePattern === "YYYY-MM-DD.jsonl") {
    return {
      running: true,
      managed: false,
      legacy: true,
      pid: null,
      version: null,
      host,
      port,
      url
    };
  }
  return null;
}

async function probeManagedState(state) {
  if (!state?.url || !state.token || !Number.isInteger(state.pid)) return null;
  const health = await fetchJson(`${state.url}/api/health`);
  if (
    health?.service !== SERVICE_NAME ||
    health.token !== state.token ||
    health.pid !== state.pid
  ) {
    return null;
  }
  return health;
}

async function fetchJson(url) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(HEALTH_TIMEOUT_MS) });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

async function waitForDashboard(paths, token, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const state = await readDashboardState(paths.dashboardStateFile);
    if (state?.token === token && await probeManagedState(state)) {
      return { running: true, managed: true, ...state };
    }
    await delay(50);
  }
  throw new Error("Dashboard did not start within 8 seconds");
}

async function stopManagedDashboard(paths, state) {
  try {
    process.kill(state.pid, "SIGTERM");
  } catch (error) {
    if (error.code !== "ESRCH") throw error;
  }

  const deadline = Date.now() + STOP_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (!await probeManagedState(state)) {
      await removeStateIfMatches(paths.dashboardStateFile, state.token);
      return;
    }
    await delay(50);
  }
  throw new Error(`Dashboard process ${state.pid} did not stop within 5 seconds`);
}

async function writeDashboardState(state) {
  const paths = await initializeStore();
  const temporaryPath = `${paths.dashboardStateFile}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(state, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600
  });
  await rename(temporaryPath, paths.dashboardStateFile);
}

async function readDashboardState(stateFile) {
  try {
    return JSON.parse(await readFile(stateFile, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT" || error instanceof SyntaxError) return null;
    throw error;
  }
}

async function removeOwnedState(token) {
  const paths = getDataPaths();
  await removeStateIfMatches(paths.dashboardStateFile, token);
}

async function removeStateIfMatches(stateFile, token) {
  const current = await readDashboardState(stateFile);
  if (!current || current.token !== token) return;
  await unlink(stateFile).catch((error) => {
    if (error.code !== "ENOENT") throw error;
  });
}

async function withDashboardLock(callback) {
  const paths = await initializeStore();
  const lock = await acquireLock(paths.dashboardLockFile);
  try {
    return await callback(paths);
  } finally {
    await lock.close();
    await unlink(paths.dashboardLockFile).catch((error) => {
      if (error.code !== "ENOENT") throw error;
    });
  }
}

async function acquireLock(lockFile) {
  for (let attempt = 0; attempt < LOCK_RETRIES; attempt += 1) {
    try {
      const handle = await open(lockFile, "wx");
      await handle.writeFile(`${process.pid} ${new Date().toISOString()}\n`);
      return handle;
    } catch (error) {
      if (error.code !== "EEXIST") throw error;
      try {
        const lockStats = await stat(lockFile);
        if (Date.now() - lockStats.mtimeMs > LOCK_STALE_MS) {
          await unlink(lockFile);
          continue;
        }
      } catch (statError) {
        if (statError.code === "ENOENT") continue;
        throw statError;
      }
      await delay(LOCK_RETRY_MS);
    }
  }
  throw new Error(`Timed out waiting for dashboard lock: ${lockFile}`);
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function formatHost(host) {
  return host.includes(":") ? `[${host}]` : host;
}
