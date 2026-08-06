import open from "open";
import {
  dashboardStatus,
  ensureDashboard,
  runDashboardService,
  stopDashboard
} from "../dashboard-server/lifecycle.js";

const ACTIONS = new Set(["start", "status", "stop", "restart"]);

export async function runDashboard(options = {}) {
  const action = options.action ?? "start";
  if (!ACTIONS.has(action)) {
    throw new Error("dashboard action must be start, status, stop, or restart");
  }

  const lifecycleOptions = { host: options.host, port: options.port };
  if (action === "status") {
    const status = await dashboardStatus(lifecycleOptions);
    if (status.running) {
      process.stdout.write(`agent-worklog dashboard: running at ${status.url}${versionSuffix(status)}\n`);
    } else {
      process.stdout.write("agent-worklog dashboard: stopped\n");
    }
    return status;
  }

  if (action === "stop") {
    const result = await stopDashboard(lifecycleOptions);
    if (result.requiresLegacyCleanup) throw legacyDashboardError(result.url);
    process.stdout.write(result.stopped
      ? `agent-worklog dashboard: stopped ${result.url}\n`
      : "agent-worklog dashboard: already stopped\n");
    return result;
  }

  if (action === "restart") {
    const stopped = await stopDashboard(lifecycleOptions);
    if (stopped.requiresLegacyCleanup) throw legacyDashboardError(stopped.url);
  }

  const dashboard = await ensureDashboard(lifecycleOptions);
  process.stdout.write(dashboard.started
    ? `agent-worklog dashboard: started at ${dashboard.url}${versionSuffix(dashboard)}\n`
    : `agent-worklog dashboard: already running at ${dashboard.url}${versionSuffix(dashboard)}\n`);

  if (options.open) {
    await open(dashboard.url, { wait: false });
  }
  return dashboard;
}

export async function runDashboardServiceCommand(options) {
  await runDashboardService(options);
}

function versionSuffix(status) {
  return status.version ? ` (v${status.version}, pid ${status.pid})` : "";
}

function legacyDashboardError(url) {
  return new Error(
    `Dashboard at ${url} was started by agent-worklog 0.1.1 or earlier; stop that process once, then run dashboard restart`
  );
}
