import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { createServer } from "node:http";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { runDashboard } from "../src/commands/dashboard.js";
import {
  dashboardStatus,
  ensureDashboard,
  stopDashboard
} from "../src/dashboard-server/lifecycle.js";

test("starts one background dashboard and manages its lifecycle", async (context) => {
  process.env.AGENT_WORKLOG_DATA_DIR = await mkdtemp(
    path.join(os.tmpdir(), "agent-worklog-dashboard-lifecycle-")
  );

  context.after(async () => {
    await stopDashboard({ port: 0 }).catch(() => {});
  });

  const [first, second] = await Promise.all([
    ensureDashboard({ port: 0 }),
    ensureDashboard({ port: 0 })
  ]);

  assert.equal(first.pid, second.pid);
  assert.equal(first.url, second.url);
  assert.deepEqual([first.started, second.started].sort(), [false, true]);

  const status = await dashboardStatus({ port: 0 });
  assert.equal(status.running, true);
  assert.equal(status.managed, true);
  assert.equal(status.pid, first.pid);

  const response = await fetch(`${status.url}/api/health`);
  const health = await response.json();
  assert.equal(health.service, "agent-worklog-dashboard");
  assert.equal(health.pid, first.pid);
  assert.equal(health.token, first.token);

  const stopped = await stopDashboard({ port: 0 });
  assert.equal(stopped.stopped, true);
  assert.equal((await dashboardStatus({ port: 0 })).running, false);

  const stoppedAgain = await stopDashboard({ port: 0 });
  assert.equal(stoppedAgain.stopped, false);
});

test("rejects an unmanaged legacy dashboard instead of reusing it", async (context) => {
  process.env.AGENT_WORKLOG_DATA_DIR = await mkdtemp(
    path.join(os.tmpdir(), "agent-worklog-dashboard-legacy-")
  );

  const legacyServer = createServer((request, response) => {
    if (request.url === "/api/meta") {
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(JSON.stringify({
        dataDirectory: process.env.AGENT_WORKLOG_DATA_DIR,
        filePattern: "YYYY-MM-DD.jsonl"
      }));
      return;
    }
    response.writeHead(404, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ error: "Not found" }));
  });
  await new Promise((resolve, reject) => {
    legacyServer.once("error", reject);
    legacyServer.listen(0, "127.0.0.1", resolve);
  });
  context.after(() => new Promise((resolve, reject) => {
    legacyServer.close((error) => error ? reject(error) : resolve());
  }));

  const port = legacyServer.address().port;
  const detected = await ensureDashboard({
    port,
    spawnProcess() {
      throw new Error("must not start a second dashboard");
    }
  });
  assert.equal(detected.running, true);
  assert.equal(detected.managed, false);
  assert.equal(detected.requiresLegacyCleanup, true);

  await assert.rejects(
    runDashboard({ action: "start", host: "127.0.0.1", port, open: false }),
    /stop that process once, then run agent-worklog dashboard/
  );
});
