import {
  classifyHookEvent,
  createHookResponse,
  normalizeHookInput
} from "../hooks/normalize.js";
import { captureResponse, finishRecord } from "../store/db.js";

export async function recordEndCommand({ platform, input } = {}) {
  const payload = input ?? await readStdinJson();
  const normalized = normalizeHookInput(platform, payload);
  const phase = classifyHookEvent(platform, normalized.eventName);

  if (phase === "response") {
    await captureResponse(normalized);
  } else if (phase === "finish") {
    await finishRecord(normalized);
  }

  return createHookResponse(platform, normalized.eventName);
}

export async function runRecordEnd(options) {
  try {
    const response = await recordEndCommand(options);
    process.stdout.write(`${JSON.stringify(response)}\n`);
  } catch (error) {
    process.stderr.write(`[agent-worklog] record-end failed: ${error.message}\n`);
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
