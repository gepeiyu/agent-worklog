import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  extractAgentSummary,
  getRecordStats,
  listRecords,
  setPointsForScope,
  startRecord,
  finishRecord
} from "../src/store/db.js";
import { formatLocalDate } from "../src/utils.js";

test("projects idempotent task events from the JSONL log", async () => {
  const dataDirectory = await mkdtemp(path.join(os.tmpdir(), "agent-worklog-store-"));
  process.env.AGENT_WORKLOG_DATA_DIR = dataDirectory;
  const input = {
    platform: "codex",
    projectPath: "/tmp/example-project",
    sessionId: "session-1",
    turnId: "turn-1",
    startedAt: "2026-08-04T01:00:00.000Z"
  };

  const first = await startRecord(input);
  const duplicate = await startRecord(input);
  assert.equal(duplicate.id, first.id);

  await finishRecord({
    ...input,
    endedAt: "2026-08-04T01:15:00.000Z",
    responseText: "Done. <!-- agent-worklog-summary: 完成登录模块重构 -->"
  });

  const records = await listRecords({ from: first.date, to: first.date });
  assert.equal(records.length, 1);
  assert.equal(records[0].durationSeconds, 900);
  assert.equal(records[0].summary, "完成登录模块重构");
  assert.equal(records[0].status, "completed");

  const rawLines = (await readFile(path.join(dataDirectory, `${first.date}.jsonl`), "utf8"))
    .trim()
    .split("\n");
  assert.equal(rawLines.length, 2);
  assert.doesNotThrow(() => rawLines.map(JSON.parse));
});

test("keeps a cross-midnight task in its start-date file", async () => {
  const dataDirectory = await mkdtemp(path.join(os.tmpdir(), "agent-worklog-midnight-"));
  process.env.AGENT_WORKLOG_DATA_DIR = dataDirectory;
  const startedAt = "2026-08-04T01:00:00.000Z";
  const endedAt = "2026-08-05T03:00:00.000Z";
  const startDate = formatLocalDate(startedAt);
  const endDate = formatLocalDate(endedAt);

  await startRecord({
    platform: "codex",
    projectPath: "/tmp/cross-midnight",
    sessionId: "overnight-session",
    turnId: "overnight-turn",
    startedAt
  });
  await finishRecord({
    platform: "codex",
    sessionId: "overnight-session",
    turnId: "overnight-turn",
    endedAt,
    responseText: "<!-- agent-worklog-summary: 完成长任务 -->"
  });

  const files = await readdir(dataDirectory);
  assert.ok(files.includes(`${startDate}.jsonl`));
  if (endDate !== startDate) assert.ok(!files.includes(`${endDate}.jsonl`));
  const lines = (await readFile(path.join(dataDirectory, `${startDate}.jsonl`), "utf8"))
    .trim()
    .split("\n");
  assert.equal(lines.length, 2);
});

test("allocates points and restores them from a text event", async () => {
  const dataDirectory = await mkdtemp(path.join(os.tmpdir(), "agent-worklog-points-"));
  process.env.AGENT_WORKLOG_DATA_DIR = dataDirectory;

  let workDate;
  for (const [turnId, startedAt, endedAt] of [
    ["one", "2026-08-04T02:00:00.000Z", "2026-08-04T02:10:00.000Z"],
    ["two", "2026-08-04T03:00:00.000Z", "2026-08-04T03:30:00.000Z"]
  ]) {
    const record = await startRecord({
      platform: "claude",
      projectPath: "/tmp/project-a",
      sessionId: "session-a",
      turnId,
      startedAt
    });
    workDate = record.date;
    await finishRecord({
      platform: "claude",
      sessionId: "session-a",
      turnId,
      endedAt,
      responseText: `<!-- agent-worklog-summary: 完成任务 ${turnId} -->`
    });
  }

  await setPointsForScope({
    filters: { from: workDate, to: workDate },
    totalPoints: "8"
  });
  const records = await listRecords({ from: workDate, to: workDate });
  const stats = getRecordStats(records);
  assert.deepEqual(records.map((record) => record.points).sort((a, b) => a - b), [2, 6]);
  assert.equal(stats.totalPoints, 8);
});

test("does not invent a summary when the agent omits the marker", () => {
  assert.equal(extractAgentSummary("Implemented the feature."), null);
  assert.equal(
    extractAgentSummary("<!-- agent-worklog-summary:   修复了  空格问题   -->"),
    "修复了 空格问题"
  );
});
