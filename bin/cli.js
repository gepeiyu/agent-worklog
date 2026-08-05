#!/usr/bin/env node

import { Command } from "commander";
import { runDashboard } from "../src/commands/dashboard.js";
import { runInstall } from "../src/commands/install.js";
import { runRecordEnd } from "../src/commands/record-end.js";
import { runRecordStart } from "../src/commands/record-start.js";
import { runSetPoints } from "../src/commands/set-points.js";
import { runSummary } from "../src/commands/summary.js";

const program = new Command();

program
  .name("agent-worklog")
  .description("Local worklog for AI coding agents")
  .version("0.1.0");

program
  .command("install")
  .description("Install user-level hooks and the shared worklog skill")
  .option("--platforms <list>", "comma-separated platforms for non-interactive use")
  .option("--language <language>", "worklog language: zh-CN, ja-JP, or en")
  .option("--hook-command <command>", "override the command prefix written to hooks")
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
  .description("Start the local worklog dashboard")
  .option("--host <host>", "listen host", "127.0.0.1")
  .option("--port <port>", "listen port", parsePort, 4789)
  .option("--no-open", "do not open a browser")
  .action(runDashboard);

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
