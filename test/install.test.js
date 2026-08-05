import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { installIntegrations } from "../src/commands/install.js";

test("installs user-level integrations, preserves hooks, and remains idempotent", async () => {
  const homeDirectory = await mkdtemp(path.join(os.tmpdir(), "agent-worklog-install-"));
  process.env.AGENT_WORKLOG_DATA_DIR = path.join(homeDirectory, "data");
  await mkdir(path.join(homeDirectory, ".claude"), { recursive: true });
  await writeFile(path.join(homeDirectory, ".claude/settings.json"), JSON.stringify({
    permissions: { allow: ["Read"] },
    hooks: {
      PreToolUse: [{ matcher: "Bash", hooks: [{ type: "command", command: "check.sh" }] }]
    }
  }));

  await installIntegrations({
    platforms: ["claude", "codex", "cursor"],
    language: "ja-JP",
    homeDirectory
  });
  await installIntegrations({
    platforms: ["claude", "codex", "cursor"],
    language: "ja-JP",
    homeDirectory
  });

  const claude = JSON.parse(await readFile(
    path.join(homeDirectory, ".claude/settings.json"),
    "utf8"
  ));
  assert.deepEqual(claude.permissions.allow, ["Read"]);
  assert.equal(claude.hooks.PreToolUse.length, 1);
  assert.equal(claude.hooks.UserPromptSubmit.length, 1);

  const codex = JSON.parse(await readFile(path.join(homeDirectory, ".codex/hooks.json")));
  const cursor = JSON.parse(await readFile(path.join(homeDirectory, ".cursor/hooks.json")));
  assert.equal(codex.hooks.Stop.length, 1);
  assert.equal(cursor.hooks.stop.length, 1);
  assert.match(
    await readFile(path.join(homeDirectory, ".agents/skills/agent-worklog/SKILL.md"), "utf8"),
    /installed worklog language is \*\*Japanese\*\*/
  );
  assert.match(
    await readFile(path.join(homeDirectory, ".claude/skills/agent-worklog/SKILL.md"), "utf8"),
    /in \*\*Japanese\*\*/
  );
  assert.match(JSON.stringify(codex), /npx --yes @gepeiyu\/agent-worklog/);
  const config = JSON.parse(await readFile(path.join(homeDirectory, "data/config.json"), "utf8"));
  assert.equal(config.language, "ja-JP");
  assert.equal(config.version, 1);
  assert.ok(config.updatedAt);

  await installIntegrations({
    platforms: ["codex"],
    language: "ja-JP",
    homeDirectory,
    hookCommand: "agent-worklog"
  });
  const linkedCodex = JSON.parse(
    await readFile(path.join(homeDirectory, ".codex/hooks.json"), "utf8")
  );
  assert.equal(linkedCodex.hooks.UserPromptSubmit.length, 1);
  assert.equal(
    linkedCodex.hooks.UserPromptSubmit[0].hooks[0].command,
    "agent-worklog record-start --platform codex"
  );
});
