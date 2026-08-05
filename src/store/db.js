import { randomUUID } from "node:crypto";
import {
  appendFile,
  mkdir,
  open,
  readFile,
  readdir,
  rename,
  stat,
  unlink,
  writeFile
} from "node:fs/promises";
import path from "node:path";
import envPaths from "env-paths";
import { DEFAULT_LANGUAGE, validateLanguage } from "../languages.js";
import { allocatePoints } from "../points/allocate.js";
import { formatLocalDate } from "../utils.js";

const EVENT_VERSION = 1;
const LOCK_STALE_MS = 15_000;
const LOCK_RETRIES = 120;
const LOCK_RETRY_MS = 25;
const DAILY_FILE_PATTERN = /^(\d{4}-\d{2}-\d{2})\.jsonl$/;

export function getDataPaths() {
  const override = process.env.AGENT_WORKLOG_DATA_DIR;
  const dataDirectory = override
    ? path.resolve(override)
    : envPaths("agent-worklog", { suffix: "" }).data;

  return {
    dataDirectory,
    configFile: path.join(dataDirectory, "config.json"),
    lockFile: path.join(dataDirectory, "events.lock")
  };
}

export function getDailyEventsFile(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date ?? "")) {
    throw new Error("Daily worklog date must use YYYY-MM-DD format");
  }
  return path.join(getDataPaths().dataDirectory, `${date}.jsonl`);
}

export async function initializeStore() {
  const paths = getDataPaths();
  await mkdir(paths.dataDirectory, { recursive: true });
  return paths;
}

export async function readConfig() {
  const paths = await initializeStore();
  try {
    const config = JSON.parse(await readFile(paths.configFile, "utf8"));
    return {
      version: 1,
      language: validateLanguage(config.language),
      updatedAt: typeof config.updatedAt === "string" ? config.updatedAt : null
    };
  } catch (error) {
    if (error.code === "ENOENT") {
      return { version: 1, language: DEFAULT_LANGUAGE, updatedAt: null };
    }
    if (error instanceof SyntaxError) {
      throw new Error(`Cannot parse worklog config: ${paths.configFile}`);
    }
    throw error;
  }
}

export async function writeConfig({ language }) {
  const paths = await initializeStore();
  const config = {
    version: 1,
    language: validateLanguage(language),
    updatedAt: new Date().toISOString()
  };
  const temporaryPath = `${paths.configFile}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");
  await rename(temporaryPath, paths.configFile);
  return config;
}

export async function readState(filters = {}) {
  return withStoreLock((paths) => loadState(paths, filters));
}

export async function listRecords(filters = {}) {
  const { records } = await readState(filters);
  return [...records.values()]
    .filter((record) => matchesFilters(record, filters))
    .map(toPublicRecord)
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}

export async function getMetadata() {
  const [records, config] = await Promise.all([listRecords(), readConfig()]);
  const dates = [...new Set(records.map((record) => record.date))].sort();
  return {
    dataDirectory: getDataPaths().dataDirectory,
    filePattern: "YYYY-MM-DD.jsonl",
    language: config.language,
    languageUpdatedAt: config.updatedAt,
    platforms: [...new Set(records.map((record) => record.platform))].sort(),
    projects: [...new Set(records.map((record) => record.projectPath))].sort(),
    firstDate: dates[0] ?? null,
    lastDate: dates.at(-1) ?? null
  };
}

export async function startRecord(input) {
  return withStoreLock(async (paths) => {
    const state = await loadState(paths);
    const exact = findTurnRecord(state.records, input);
    if (exact) return toPublicRecord(exact);

    const stale = [...state.records.values()].filter(
      (record) =>
        record.status === "running" &&
        record.platform === input.platform &&
        record.sessionId === input.sessionId
    );
    const eventsByDate = new Map();
    for (const record of stale) {
      addDatedEvent(eventsByDate, record.date, createEvent("task.abandoned", {
        recordId: record.id,
        reason: "superseded-by-next-turn"
      }));
    }

    const startedAt = input.startedAt ?? new Date().toISOString();
    const record = {
      id: randomUUID(),
      platform: input.platform,
      language: validateLanguage(input.language ?? DEFAULT_LANGUAGE),
      projectPath: path.resolve(input.projectPath),
      sessionId: input.sessionId ?? null,
      turnId: input.turnId ?? null,
      startedAt,
      endedAt: null,
      durationSeconds: null,
      summary: null,
      date: formatLocalDate(startedAt),
      points: null,
      status: "running"
    };
    addDatedEvent(eventsByDate, record.date, createEvent("task.started", { record }));
    await appendDatedEvents(paths, eventsByDate);
    return record;
  });
}

export async function captureResponse(input) {
  return withStoreLock(async (paths) => {
    const state = await loadState(paths);
    const record = findRunningRecord(state.records, input);
    if (!record || !input.responseText) return null;
    await appendEvents(dailyEventsFile(paths, record.date), [createEvent("task.response", {
      recordId: record.id,
      responseText: input.responseText
    })]);
    return toPublicRecord(record);
  });
}

export async function finishRecord(input) {
  return withStoreLock(async (paths) => {
    const state = await loadState(paths);
    const record = findRunningRecord(state.records, input);
    if (!record) return null;

    const endedAt = input.endedAt ?? new Date().toISOString();
    const durationSeconds = Math.max(
      0,
      Math.round((new Date(endedAt).getTime() - new Date(record.startedAt).getTime())) / 1000
    );
    const responseText = input.responseText ?? record.responseText ?? null;
    const summary = input.summary ?? extractAgentSummary(responseText);
    const status = input.status ?? (summary ? "completed" : "completed-missing-summary");

    await appendEvents(dailyEventsFile(paths, record.date), [createEvent("task.finished", {
      recordId: record.id,
      endedAt,
      durationSeconds,
      summary,
      status
    })]);

    return toPublicRecord({
      ...record,
      endedAt,
      durationSeconds,
      summary,
      status
    });
  });
}

export async function setPointsForScope({ filters, totalPoints }) {
  return withStoreLock(async (paths) => {
    const state = await loadState(paths, filters);
    const records = [...state.records.values()].filter(
      (record) =>
        matchesFilters(record, filters) &&
        record.endedAt &&
        Number(record.durationSeconds) > 0
    );
    const allocations = allocatePoints(records, totalPoints);
    const allocation = {
      id: randomUUID(),
      scopeKey: createScopeKey(filters),
      filters: normalizeFilters(filters),
      totalPoints: Number(totalPoints),
      minimumUnit: 0.5,
      allocations: allocations.map(({ recordId, points }) => ({ recordId, points }))
    };
    const allocationsByDate = new Map();
    for (const record of records) {
      const assigned = allocations.find((item) => item.recordId === record.id);
      const datedAllocation = allocationsByDate.get(record.date) ?? [];
      datedAllocation.push({ recordId: record.id, points: assigned.points });
      allocationsByDate.set(record.date, datedAllocation);
    }
    const eventsByDate = new Map();
    for (const [date, datedAllocations] of allocationsByDate) {
      addDatedEvent(eventsByDate, date, createEvent("points.allocated", {
        allocation: { ...allocation, allocations: datedAllocations }
      }));
    }
    await appendDatedEvents(paths, eventsByDate);
    return {
      ...allocation,
      records: records.map((record) => {
        const assigned = allocations.find((item) => item.recordId === record.id);
        return { ...toPublicRecord(record), points: assigned.points };
      })
    };
  });
}

export function getRecordStats(records) {
  const completed = records.filter((record) => record.endedAt && record.durationSeconds != null);
  const totalDurationSeconds = completed.reduce(
    (sum, record) => sum + Number(record.durationSeconds || 0),
    0
  );
  const recordsWithPoints = completed.filter((record) => record.points != null);
  const totalPoints = recordsWithPoints.reduce(
    (sum, record) => sum + Number(record.points),
    0
  );
  const byProject = new Map();

  for (const record of completed) {
    const current = byProject.get(record.projectPath) ?? {
      projectPath: record.projectPath,
      recordCount: 0,
      durationSeconds: 0,
      points: 0
    };
    current.recordCount += 1;
    current.durationSeconds += Number(record.durationSeconds || 0);
    current.points += Number(record.points || 0);
    byProject.set(record.projectPath, current);
  }

  return {
    recordCount: records.length,
    completedCount: completed.length,
    totalDurationSeconds,
    totalPoints: Math.round(totalPoints * 100) / 100,
    byProject: [...byProject.values()].sort((a, b) =>
      b.durationSeconds - a.durationSeconds || a.projectPath.localeCompare(b.projectPath)
    )
  };
}

export function extractAgentSummary(text) {
  if (!text) return null;
  const match = String(text).match(/<!--\s*agent-worklog-summary:\s*([\s\S]*?)\s*-->/i);
  const summary = match?.[1]?.replace(/\s+/g, " ").trim();
  return summary || null;
}

async function loadState(paths, filters = {}) {
  const records = new Map();
  const allocations = new Map();
  const eventsFiles = await listEventsFiles(paths, filters);
  for (const eventsFile of eventsFiles) {
    await applyEventsFile({ records, allocations }, eventsFile);
  }
  return { records, allocations };
}

async function applyEventsFile(state, eventsFile) {
  let content = "";
  try {
    content = await readFile(eventsFile, "utf8");
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }

  const lines = content.split("\n");
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (!line) continue;
    let event;
    try {
      event = JSON.parse(line);
    } catch {
      throw new Error(`Invalid JSON in ${eventsFile} at line ${index + 1}`);
    }
    applyEvent(state, event);
  }
}

function applyEvent(state, event) {
  if (event.event === "task.started" && event.record?.id) {
    state.records.set(event.record.id, { ...event.record, responseText: null });
    return;
  }

  if (event.event === "task.response") {
    const record = state.records.get(event.recordId);
    if (record) record.responseText = event.responseText ?? null;
    return;
  }

  if (event.event === "task.finished") {
    const record = state.records.get(event.recordId);
    if (record && record.status === "running") {
      Object.assign(record, {
        endedAt: event.endedAt,
        durationSeconds: event.durationSeconds,
        summary: event.summary ?? null,
        status: event.status
      });
    }
    return;
  }

  if (event.event === "task.abandoned") {
    const record = state.records.get(event.recordId);
    if (record && record.status === "running") record.status = "interrupted";
    return;
  }

  if (event.event === "points.allocated" && event.allocation) {
    state.allocations.set(event.allocation.scopeKey, event.allocation);
    for (const item of event.allocation.allocations ?? []) {
      const record = state.records.get(item.recordId);
      if (record) record.points = item.points;
    }
  }
}

function createEvent(event, payload) {
  return {
    version: EVENT_VERSION,
    event,
    recordedAt: new Date().toISOString(),
    ...payload
  };
}

async function appendEvents(eventsFile, events) {
  if (events.length === 0) return;
  const content = `${events.map((event) => JSON.stringify(event)).join("\n")}\n`;
  await appendFile(eventsFile, content, "utf8");
}

async function appendDatedEvents(paths, eventsByDate) {
  await Promise.all([...eventsByDate].map(([date, events]) =>
    appendEvents(dailyEventsFile(paths, date), events)
  ));
}

function addDatedEvent(eventsByDate, date, event) {
  const events = eventsByDate.get(date) ?? [];
  events.push(event);
  eventsByDate.set(date, events);
}

async function listEventsFiles(paths, filters) {
  const entries = await readdir(paths.dataDirectory, { withFileTypes: true });
  const dailyFiles = entries
    .filter((entry) => entry.isFile() && DAILY_FILE_PATTERN.test(entry.name))
    .map((entry) => {
      const date = entry.name.match(DAILY_FILE_PATTERN)[1];
      return { date, filePath: path.join(paths.dataDirectory, entry.name) };
    })
    .filter(({ date }) => !filters.from || date >= filters.from)
    .filter(({ date }) => !filters.to || date <= filters.to)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(({ filePath }) => filePath);

  return dailyFiles;
}

function dailyEventsFile(paths, date) {
  return path.join(paths.dataDirectory, `${date}.jsonl`);
}

async function withStoreLock(callback) {
  const paths = await initializeStore();
  const lockHandle = await acquireLock(paths.lockFile);
  try {
    return await callback(paths);
  } finally {
    await lockHandle.close();
    await unlink(paths.lockFile).catch((error) => {
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
      await new Promise((resolve) => setTimeout(resolve, LOCK_RETRY_MS));
    }
  }
  throw new Error(`Timed out waiting for worklog lock: ${lockFile}`);
}

function findTurnRecord(records, input) {
  if (!input.turnId) return null;
  return [...records.values()].find(
    (record) => record.platform === input.platform && record.turnId === input.turnId
  ) ?? null;
}

function findRunningRecord(records, input) {
  const running = [...records.values()].filter(
    (record) => record.status === "running" && record.platform === input.platform
  );
  if (input.turnId) {
    const exact = running.find((record) => record.turnId === input.turnId);
    if (exact) return exact;
  }
  return running
    .filter((record) => !input.sessionId || record.sessionId === input.sessionId)
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0] ?? null;
}

function matchesFilters(record, filters) {
  if (filters.from && record.date < filters.from) return false;
  if (filters.to && record.date > filters.to) return false;
  if (filters.platform && record.platform !== filters.platform) return false;
  if (filters.project && record.projectPath !== filters.project) return false;
  return true;
}

function normalizeFilters(filters = {}) {
  return {
    from: filters.from ?? null,
    to: filters.to ?? null,
    platform: filters.platform ?? null,
    project: filters.project ? path.resolve(filters.project) : null
  };
}

function createScopeKey(filters) {
  const normalized = normalizeFilters(filters);
  return [normalized.from, normalized.to, normalized.platform, normalized.project]
    .map((value) => value ?? "*")
    .join("|");
}

function toPublicRecord(record) {
  const { responseText, ...publicRecord } = record;
  return { ...publicRecord };
}
