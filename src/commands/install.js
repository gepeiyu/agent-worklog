import { checkbox, confirm, select } from "@inquirer/prompts";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  DEFAULT_LANGUAGE,
  LANGUAGE_CHOICES,
  getSummaryLanguageName,
  validateLanguage
} from "../languages.js";
import { runDashboard } from "./dashboard.js";
import { getDataPaths, initializeStore, writeConfig } from "../store/db.js";

const PACKAGE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const TEMPLATES_ROOT = path.join(PACKAGE_ROOT, "templates");
const SUPPORTED_PLATFORMS = ["claude", "codex", "cursor"];
const DEFAULT_HOOK_COMMAND = "npx --yes @gepeiyu/agent-worklog";

const DASHBOARD_PROMPTS = {
  "zh-CN": "是否立即启动仪表盘？",
  "ja-JP": "ダッシュボードを今すぐ起動しますか？",
  en: "Start the dashboard now?"
};

const DASHBOARD_START_MESSAGES = {
  "zh-CN": "正在启动仪表盘。",
  "ja-JP": "ダッシュボードを起動しています。",
  en: "Starting the dashboard."
};

const CODEX_TRUST_MESSAGES = {
  "zh-CN": "Codex：重启后运行 /hooks，审核并信任 agent-worklog 的 UserPromptSubmit 和 Stop hooks。未信任的 hooks 不会运行。",
  "ja-JP": "Codex：再起動後に /hooks を開き、agent-worklog の UserPromptSubmit と Stop hooks を確認して信頼してください。信頼されていない hooks は実行されません。",
  en: "Codex: after restarting, open /hooks and review and trust the agent-worklog UserPromptSubmit and Stop hooks. Untrusted hooks do not run."
};

const INSTALL_TARGETS = {
  claude: {
    hookTemplate: "hooks/claude/hooks.json",
    hookTarget: ".claude/settings.json"
  },
  codex: {
    hookTemplate: "hooks/codex/hooks.json",
    hookTarget: ".codex/hooks.json"
  },
  cursor: {
    hookTemplate: "hooks/cursor/hooks.json",
    hookTarget: ".cursor/hooks.json"
  }
};

export async function installIntegrations({
  platforms,
  language = DEFAULT_LANGUAGE,
  homeDirectory = homedir(),
  hookCommand = DEFAULT_HOOK_COMMAND
}) {
  const selected = validatePlatforms(platforms);
  const selectedLanguage = validateLanguage(language);
  const writtenFiles = [];

  for (const platform of selected) {
    const target = INSTALL_TARGETS[platform];
    const template = configureHookCommand(
      await readJson(path.join(TEMPLATES_ROOT, target.hookTemplate)),
      hookCommand
    );
    const targetPath = path.join(homeDirectory, target.hookTarget);
    const existing = await readJson(targetPath, { allowMissing: true });
    const merged = mergeHookConfig(existing, template);
    await writeJsonAtomic(targetPath, merged);
    writtenFiles.push(targetPath);
  }

  if (selected.includes("claude")) {
    const target = path.join(
      homeDirectory,
      ".claude/skills/agent-worklog/SKILL.md"
    );
    await writeSkillTemplate(target, selectedLanguage);
    writtenFiles.push(target);
  }

  if (selected.includes("codex") || selected.includes("cursor")) {
    const target = path.join(
      homeDirectory,
      ".agents/skills/agent-worklog/SKILL.md"
    );
    await writeSkillTemplate(target, selectedLanguage);
    writtenFiles.push(target);
  }

  await initializeStore();
  const config = await writeConfig({ language: selectedLanguage });
  return {
    platforms: selected,
    language: config.language,
    writtenFiles,
    dataDirectory: getDataPaths().dataDirectory,
    configFile: getDataPaths().configFile,
    homeDirectory
  };
}

export async function runInstall(options) {
  const interactive = Boolean(process.stdin.isTTY);
  let language = options.language;
  if (!language) {
    if (!interactive) {
      throw new Error(
        "Non-interactive install requires --language zh-CN, ja-JP, or en"
      );
    }
    language = await select({
      message: "选择工作记录语言",
      choices: LANGUAGE_CHOICES.map(({ name, value }) => ({ name, value })),
      default: DEFAULT_LANGUAGE
    });
  }

  let platforms;
  if (options.platforms) {
    platforms = options.platforms.split(",").map((value) => value.trim()).filter(Boolean);
  } else {
    if (!interactive) {
      throw new Error("Interactive install needs a TTY; use --platforms claude,codex,cursor");
    }
    platforms = await checkbox({
      message: "选择要启用的平台",
      choices: [
        { name: "Claude Code", value: "claude" },
        { name: "Codex CLI", value: "codex" },
        { name: "Cursor", value: "cursor" }
      ],
      required: true
    });
  }

  const result = await installIntegrations({
    platforms,
    language,
    hookCommand: options.hookCommand
  });
  process.stdout.write("agent-worklog 安装完成\n");
  process.stdout.write(`平台：${result.platforms.join(", ")}\n`);
  process.stdout.write(`工作记录语言：${getLanguageChoiceName(result.language)}\n`);
  process.stdout.write(`数据目录：${result.dataDirectory}（每天一个 YYYY-MM-DD.jsonl）\n`);
  process.stdout.write(`配置文件：${result.configFile}\n`);
  process.stdout.write("用户级配置（对所有本地项目生效）：\n");
  for (const file of result.writtenFiles) {
    process.stdout.write(`- ${formatHomePath(file, result.homeDirectory)}\n`);
  }
  if (result.platforms.includes("codex")) {
    process.stdout.write(`${CODEX_TRUST_MESSAGES[result.language]}\n`);
  }

  const shouldStartDashboard = await resolveDashboardStart({
    requested: options.startDashboard,
    interactive,
    language: result.language
  });
  if (shouldStartDashboard) {
    process.stdout.write(`${DASHBOARD_START_MESSAGES[result.language]}\n`);
    await runDashboard({
      action: "start",
      host: "127.0.0.1",
      port: 4789,
      open: interactive
    });
  }
}

export async function resolveDashboardStart({
  requested = false,
  interactive = Boolean(process.stdin.isTTY),
  language = DEFAULT_LANGUAGE,
  prompt = confirm
} = {}) {
  if (requested) return true;
  if (!interactive) return false;

  const selectedLanguage = validateLanguage(language);
  return prompt({
    message: DASHBOARD_PROMPTS[selectedLanguage],
    default: true
  });
}

export function mergeHookConfig(existing, template) {
  const result = { ...existing, ...template, hooks: { ...(existing.hooks ?? {}) } };
  for (const [eventName, templateEntries] of Object.entries(template.hooks ?? {})) {
    const retained = (existing.hooks?.[eventName] ?? []).filter(
      (entry) => !containsAgentWorklogCommand(entry)
    );
    result.hooks[eventName] = [...retained, ...templateEntries];
  }
  return result;
}

function containsAgentWorklogCommand(entry) {
  const serialized = JSON.stringify(entry);
  return serialized.includes("@gepeiyu/agent-worklog") ||
    serialized.includes("agent-worklog record-");
}

function configureHookCommand(template, hookCommand) {
  const commandPrefix = String(hookCommand ?? DEFAULT_HOOK_COMMAND).trim();
  if (!commandPrefix) throw new Error("Hook command cannot be empty");

  const configured = structuredClone(template);
  for (const entries of Object.values(configured.hooks ?? {})) {
    for (const entry of entries) {
      const handlers = Array.isArray(entry.hooks) ? entry.hooks : [entry];
      for (const handler of handlers) {
        if (typeof handler.command === "string") {
          handler.command = handler.command.replace(DEFAULT_HOOK_COMMAND, commandPrefix);
        }
      }
    }
  }
  return configured;
}

function validatePlatforms(platforms) {
  if (!Array.isArray(platforms) || platforms.length === 0) {
    throw new Error("Select at least one platform");
  }
  const unique = [...new Set(platforms.map((platform) => platform.toLowerCase()))];
  const unsupported = unique.filter((platform) => !SUPPORTED_PLATFORMS.includes(platform));
  if (unsupported.length > 0) {
    throw new Error(`Unsupported platform: ${unsupported.join(", ")}`);
  }
  return unique;
}

async function readJson(filePath, { allowMissing = false } = {}) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch (error) {
    if (allowMissing && error.code === "ENOENT") return {};
    if (error instanceof SyntaxError) {
      throw new Error(`Cannot parse existing JSON file: ${filePath}`);
    }
    throw error;
  }
}

async function writeJsonAtomic(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(temporaryPath, filePath);
}

async function writeSkillTemplate(target, language) {
  await mkdir(path.dirname(target), { recursive: true });
  const template = await readFile(
    path.join(TEMPLATES_ROOT, "skills/agent-worklog/SKILL.md"),
    "utf8"
  );
  const content = template.replaceAll(
    "{{WORKLOG_LANGUAGE}}",
    getSummaryLanguageName(language)
  );
  const temporaryPath = `${target}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(temporaryPath, content, "utf8");
  await rename(temporaryPath, target);
}

function getLanguageChoiceName(language) {
  return LANGUAGE_CHOICES.find((choice) => choice.value === language)?.name ?? language;
}

function formatHomePath(filePath, homeDirectory) {
  const relativePath = path.relative(homeDirectory, filePath);
  return relativePath && !relativePath.startsWith("..")
    ? path.join("~", relativePath)
    : filePath;
}
