import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { startDashboardServer } from "../src/dashboard-server/server.js";
import { finishRecord, startRecord, writeConfig } from "../src/store/db.js";

test("serves records and reallocates points through the local API", async (context) => {
  process.env.AGENT_WORKLOG_DATA_DIR = await mkdtemp(path.join(os.tmpdir(), "worklog-dashboard-"));
  await writeConfig({ language: "en" });
  const record = await startRecord({
    platform: "codex",
    projectPath: "/tmp/dashboard-project",
    sessionId: "dashboard-session",
    turnId: "dashboard-turn",
    startedAt: "2026-08-04T01:00:00.000Z"
  });
  await finishRecord({
    platform: "codex",
    sessionId: "dashboard-session",
    turnId: "dashboard-turn",
    endedAt: "2026-08-04T02:00:00.000Z",
    responseText: "<!-- agent-worklog-summary: 构建仪表盘 -->"
  });
  const otherRecord = await startRecord({
    platform: "cursor",
    projectPath: "/tmp/other-project",
    sessionId: "other-session",
    turnId: "other-turn",
    startedAt: "2026-08-04T03:00:00.000Z"
  });
  await finishRecord({
    platform: "cursor",
    sessionId: "other-session",
    turnId: "other-turn",
    endedAt: "2026-08-04T04:00:00.000Z",
    responseText: "<!-- agent-worklog-summary: 构建其他功能 -->"
  });
  assert.equal(otherRecord.date, record.date);

  const dashboard = await startDashboardServer({ port: 0 });
  context.after(() => dashboard.close());

  const page = await fetch(dashboard.url);
  assert.equal(page.status, 200);
  const pageHtml = await page.text();
  assert.match(pageHtml, /agent-worklog/);
  assert.match(pageHtml, /<select id="language"/);
  assert.match(pageHtml, /简体中文/);
  assert.match(pageHtml, /日本語/);
  assert.match(pageHtml, />English</);

  const recordsResponse = await fetch(
    `${dashboard.url}/api/records?date=${record.date}`
  );
  const recordsBody = await recordsResponse.json();
  assert.equal(recordsBody.records.length, 2);
  assert.equal(recordsBody.stats.totalDurationSeconds, 7200);
  assert.equal(recordsBody.dailyStats.totalDurationSeconds, 7200);
  assert.equal(recordsBody.filters.date, record.date);
  assert.ok(recordsBody.dataFile.endsWith(`/${record.date}.jsonl`));

  const filteredResponse = await fetch(
    `${dashboard.url}/api/records?date=${record.date}&project=${encodeURIComponent(record.projectPath)}`
  );
  const filteredBody = await filteredResponse.json();
  assert.equal(filteredBody.records.length, 1);
  assert.equal(filteredBody.stats.totalDurationSeconds, 3600);
  assert.equal(filteredBody.dailyStats.totalDurationSeconds, 7200);

  const metadataResponse = await fetch(`${dashboard.url}/api/meta`);
  const metadata = await metadataResponse.json();
  assert.equal(metadata.language, "en");
  assert.ok(metadata.languageUpdatedAt);

  const pointsResponse = await fetch(`${dashboard.url}/api/points`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      date: record.date,
      project: record.projectPath,
      total: "8"
    })
  });
  const pointsBody = await pointsResponse.json();
  assert.equal(pointsResponse.status, 200);
  assert.equal(pointsBody.allocation.recordCount, 2);
  assert.equal(pointsBody.records.length, 1);
  assert.equal(pointsBody.records[0].points, 4);
  assert.equal(pointsBody.stats.totalPoints, 4);
  assert.equal(pointsBody.dailyStats.totalPoints, 8);
});
