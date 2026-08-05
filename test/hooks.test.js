import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { recordEndCommand } from "../src/commands/record-end.js";
import { recordStartCommand } from "../src/commands/record-start.js";
import { listRecords, writeConfig } from "../src/store/db.js";

test("records a Claude turn and injects the summary instruction", async () => {
  process.env.AGENT_WORKLOG_DATA_DIR = await mkdtemp(path.join(os.tmpdir(), "worklog-claude-"));
  const startResponse = await recordStartCommand({
    platform: "claude",
    input: {
      hook_event_name: "UserPromptSubmit",
      session_id: "claude-session",
      prompt_id: "claude-turn",
      cwd: "/tmp/claude-project",
      prompt: "Implement the feature"
    }
  });
  assert.match(startResponse.hookSpecificOutput.additionalContext, /agent-worklog-summary/);
  assert.match(startResponse.hookSpecificOutput.additionalContext, /简体中文/);

  await recordEndCommand({
    platform: "claude",
    input: {
      hook_event_name: "Stop",
      session_id: "claude-session",
      prompt_id: "claude-turn",
      cwd: "/tmp/claude-project",
      last_assistant_message: "<!-- agent-worklog-summary: 完成功能实现 -->"
    }
  });
  const [record] = await listRecords();
  assert.equal(record.summary, "完成功能实现");
  assert.equal(record.language, "zh-CN");
  assert.ok(record.endedAt);
});

test("combines Cursor response and stop events without creating a session task", async () => {
  process.env.AGENT_WORKLOG_DATA_DIR = await mkdtemp(path.join(os.tmpdir(), "worklog-cursor-"));
  await writeConfig({ language: "ja-JP" });
  const sessionResponse = await recordStartCommand({
    platform: "cursor",
    input: {
      hook_event_name: "sessionStart",
      conversation_id: "cursor-session",
      workspace_roots: ["/tmp/cursor-project"]
    }
  });
  assert.match(sessionResponse.additional_context, /agent-worklog-summary/);
  assert.match(sessionResponse.additional_context, /日本語/);
  assert.equal((await listRecords()).length, 0);

  const common = {
    conversation_id: "cursor-session",
    generation_id: "cursor-turn",
    workspace_roots: ["/tmp/cursor-project"]
  };
  await recordStartCommand({
    platform: "cursor",
    input: { ...common, hook_event_name: "beforeSubmitPrompt", prompt: "Fix tests" }
  });
  await recordEndCommand({
    platform: "cursor",
    input: {
      ...common,
      hook_event_name: "afterAgentResponse",
      text: "<!-- agent-worklog-summary: テストを修正 -->"
    }
  });
  await recordEndCommand({
    platform: "cursor",
    input: { ...common, hook_event_name: "stop", status: "completed", loop_count: 1 }
  });

  const [record] = await listRecords();
  assert.equal(record.summary, "テストを修正");
  assert.equal(record.language, "ja-JP");
  assert.equal(record.status, "completed");
});
