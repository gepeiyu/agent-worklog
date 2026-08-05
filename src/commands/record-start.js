import { readFile } from "node:fs/promises";
import {
  classifyHookEvent,
  createHookResponse,
  normalizeHookInput
} from "../hooks/normalize.js";
import { readConfig, startRecord } from "../store/db.js";

export async function recordStartCommand({ platform, input } = {}) {
  const payload = input ?? await readStdinJson();
  const normalized = normalizeHookInput(platform, payload);
  const phase = classifyHookEvent(platform, normalized.eventName);
  const config = await readConfig();

  if (phase === "start") {
    await startRecord({ ...normalized, language: config.language });
  }

  return createHookResponse(platform, normalized.eventName, {
    includeSummaryInstruction: phase === "start" || phase === "session",
    language: config.language
  });
}

export async function runRecordStart(options) {
  try {
    const response = await recordStartCommand(options);
    process.stdout.write(`${JSON.stringify(response)}\n`);
  } catch (error) {
    process.stderr.write(`[agent-worklog] record-start failed: ${error.message}\n`);
    process.stdout.write(`${JSON.stringify({ continue: true })}\n`);
  }
}

async function readStdinJson() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8").trim();
  if (!raw) throw new Error("Expected hook JSON on stdin");
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error("Hook stdin is not valid JSON");
  }
}
