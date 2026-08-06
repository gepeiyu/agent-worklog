import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
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
