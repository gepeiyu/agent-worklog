import path from "node:path";
import { DEFAULT_LANGUAGE, getSummaryInstruction } from "../languages.js";

export const SUMMARY_INSTRUCTION = getSummaryInstruction(DEFAULT_LANGUAGE);

const PLATFORMS = new Set(["claude", "codex", "cursor"]);

export function normalizeHookInput(platform, payload, fallbackCwd = process.cwd()) {
  if (!PLATFORMS.has(platform)) {
    throw new Error(`Unsupported platform: ${platform}`);
  }

  const eventName = String(payload.hook_event_name ?? "");
  const workspaceRoot = getWorkspaceRoot(payload.workspace_roots);
  const projectPath = path.resolve(payload.cwd || workspaceRoot || fallbackCwd);
  const sessionId = stringOrNull(
    payload.session_id ?? payload.conversation_id ?? payload.sessionId
  );
  const turnId = stringOrNull(
    platform === "claude"
      ? payload.prompt_id
      : platform === "codex"
        ? payload.turn_id
        : payload.generation_id
  );

  return {
    platform,
    eventName,
    projectPath,
    sessionId,
    turnId,
    startedAt: validIsoOrNull(payload.started_at),
    endedAt: validIsoOrNull(payload.ended_at),
    prompt: stringOrNull(payload.prompt),
    responseText: stringOrNull(payload.last_assistant_message ?? payload.text),
    status: normalizeStatus(platform, eventName, payload.status)
  };
}

export function classifyHookEvent(platform, eventName) {
  if (platform === "cursor") {
    if (eventName === "sessionStart") return "session";
    if (eventName === "beforeSubmitPrompt") return "start";
    if (eventName === "afterAgentResponse") return "response";
    if (eventName === "stop") return "finish";
  } else {
    if (eventName === "UserPromptSubmit") return "start";
    if (eventName === "Stop" || eventName === "StopFailure") return "finish";
  }
  return "ignore";
}

export function createHookResponse(
  platform,
  eventName,
  { includeSummaryInstruction = false, language = DEFAULT_LANGUAGE } = {}
) {
  const summaryInstruction = getSummaryInstruction(language);
  if (platform === "cursor") {
    if (eventName === "sessionStart" && includeSummaryInstruction) {
      return { additional_context: summaryInstruction };
    }
    return { continue: true };
  }

  if (includeSummaryInstruction && eventName === "UserPromptSubmit") {
    return {
      hookSpecificOutput: {
        hookEventName: "UserPromptSubmit",
        additionalContext: summaryInstruction
      }
    };
  }
  return { continue: true };
}

function getWorkspaceRoot(workspaceRoots) {
  if (!Array.isArray(workspaceRoots) || workspaceRoots.length === 0) return null;
  const root = workspaceRoots[0];
  if (typeof root === "string") return root;
  return root?.path ?? root?.uri ?? null;
}

function normalizeStatus(platform, eventName, status) {
  if (eventName === "StopFailure") return "error";
  if (platform === "cursor" && status && status !== "completed") return String(status);
  return null;
}

function stringOrNull(value) {
  if (value == null) return null;
  const stringValue = String(value).trim();
  return stringValue || null;
}

function validIsoOrNull(value) {
  const normalized = stringOrNull(value);
  if (!normalized) return null;
  return Number.isNaN(new Date(normalized).getTime()) ? null : new Date(normalized).toISOString();
}
