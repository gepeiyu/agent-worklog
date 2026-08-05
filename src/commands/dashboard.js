import open from "open";
import { startDashboardServer } from "../dashboard-server/server.js";

export async function runDashboard(options) {
  const dashboard = await startDashboardServer({ host: options.host, port: options.port });
  process.stdout.write(`agent-worklog dashboard: ${dashboard.url}\n`);

  if (options.open) {
    await open(dashboard.url, { wait: false });
  }

  const shutdown = async () => {
    await dashboard.close();
    process.exit(0);
  };
  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}
