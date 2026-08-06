#!/usr/bin/env node

import { Command } from "commander";
import { createRequire } from "node:module";
import {
  runDashboard,
  runDashboardServiceCommand
} from "../src/commands/dashboard.js";
import { runInstall } from "../src/commands/install.js";
import { runRecordEnd } from "../src/commands/record-end.js";
import { runRecordStart } from "../src/commands/record-start.js";
import { runSetPoints } from "../src/commands/set-points.js";
import { runSummary } from "../src/commands/summary.js";

const program = new Command();
const require = createRequire(import.meta.url);
const { version } = require("../package.json");

program
  .name("agent-worklog")
  .description("Local worklog for AI coding agents")
  .version(version);

program
  .command("install")
  .description("Install user-level hooks and the shared worklog skill")
  .option("--platforms <list>", "comma-separated platforms for non-interactive use")
  .option("--language <language>", "worklog language: zh-CN, ja-JP, or en")
  .option("--hook-command <command>", "override the command prefix written to hooks")
  .option("--start-dashboard", "start the dashboard after installation")
  .action(runInstall);

program
  .command("record-start", { hidden: true })
  .requiredOption("--platform <platform>", "claude, codex, or cursor")
  .action(runRecordStart);

program
  .command("record-end", { hidden: true })
  .requiredOption("--platform <platform>", "claude, codex, or cursor")
  .action(runRecordEnd);

addRangeOptions(
  program.command("summary").description("Generate a local daily or weekly report draft")
)
  .option("--json", "emit structured JSON")
  .action(runSummary);

addRangeOptions(
  program.command("set-points").description("Allocate points by recorded duration")
)
  .requiredOption("--total <points>", "total points, in multiples of 0.5")
  .action(runSetPoints);

program
  .command("dashboard")
  .description("Manage the singleton local worklog dashboard")
  .argument("[action]", "start, status, stop, or restart", "start")
  .option("--host <host>", "listen host", "127.0.0.1")
  .option("--port <port>", "listen port", parsePort, 4789)
  .option("--no-open", "do not open a browser")
  .action((action, options) => runDashboard({ ...options, action }));

program
  .command("dashboard-serve", { hidden: true })
  .requiredOption("--host <host>", "listen host")
  .requiredOption("--port <port>", "listen port", parseServicePort)
  .requiredOption("--token <token>", "dashboard instance token")
  .action(runDashboardServiceCommand);

program.parseAsync().catch((error) => {
  process.stderr.write(`agent-worklog: ${error.message}\n`);
  process.exitCode = 1;
});

function addRangeOptions(command) {
  return command
    .option("--date <date>", "single date in YYYY-MM-DD format")
    .option("--from <date>", "range start in YYYY-MM-DD format")
    .option("--to <date>", "range end in YYYY-MM-DD format")
    .option("--week <date>", "week containing this date")
    .option("--platform <platform>", "filter by claude, codex, or cursor")
    .option("--project <path>", "filter by exact project path");
}

function parsePort(value) {
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("port must be an integer between 1 and 65535");
  }
  return port;
}

function parseServicePort(value) {
  const port = Number(value);
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error("service port must be an integer between 0 and 65535");
  }
  return port;
}
