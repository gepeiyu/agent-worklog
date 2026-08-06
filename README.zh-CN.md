# agent-worklog

[English](README.md) | **简体中文**

`agent-worklog` 是一个完全本地运行的 AI coding agent 工作记录工具，支持 Claude Code、Codex CLI 和 Cursor。它通过平台 hooks 记录正常完成轮次的开始、结束和耗时，由 agent 本身提供工作摘要，并生成日报、周报及点数分摊草稿。

工具不会登录、调用或提交到任何公司系统。数据、汇总和导出内容始终保留在本机，最终提交必须由人完成。

## 环境要求

- Node.js 22.12 或更高版本
- npm 10 或更高版本
- 所选平台支持用户级 hooks；Codex 首次运行时需要在 `/hooks` 中信任新 hook

## 安装

全局安装后运行一次向导。配置写入用户目录，对这台机器上的所有本地项目生效：

```bash
npm install -g @gepeiyu/agent-worklog
agent-worklog install
```

也可以不预先全局安装：

```bash
npx @gepeiyu/agent-worklog install
```

安装时不需要进入某个项目目录。交互式安装流程如下：

1. 选择工作记录及仪表盘默认语言：简体中文、日语或英语。
2. 选择一个或多个平台：Claude Code、Codex CLI、Cursor。
3. 安装用户级 hooks 和 Skills，使配置覆盖本机上的所有项目。
4. 打印已写入的配置文件及本地数据目录。
5. 询问是否立即启动仪表盘，默认选择“是”。

从安装向导启动仪表盘时会自动打开浏览器。仪表盘作为单实例后台服务运行，启动后安装向导会立即返回终端；停止仪表盘不会影响 hooks 继续记录工作。首次安装或 hooks 更新后，需要重启当前正在运行的 Claude Code、Codex CLI 和 Cursor 会话，让它们重新加载用户级 hooks。单独启动或停止仪表盘不需要重启这些工具。

Codex 对每条新增或变更的命令 hook 还要求显式信任。打开 `/hooks`，审核 `UserPromptSubmit` 和 `Stop`，然后选择 **Trust all and continue**。完成信任之前 Codex 会跳过这两条 hook，因此不会产生 Codex 工作记录。

非交互环境必须同时指定语言和平台，默认不会启动后台仪表盘；明确需要启动时可添加 `--start-dashboard`：

```bash
agent-worklog install --language zh-CN --platforms claude,codex,cursor
agent-worklog install --language zh-CN --platforms claude,codex,cursor --start-dashboard
```

安装器会把语言写入本地数据目录的 `config.json`，并按该语言生成 hook 摘要指令和全局 Skill。重新运行安装向导可以修改语言。安装器会保留已有配置，删除旧的 `agent-worklog` hook 条目后写入当前版本，重复执行不会产生重复 hook。

| 平台 | 用户级 Hook 配置 | 用户级 Skill |
| --- | --- | --- |
| Claude Code | `~/.claude/settings.json` | `~/.claude/skills/agent-worklog/SKILL.md` |
| Codex CLI | `~/.codex/hooks.json` | `~/.agents/skills/agent-worklog/SKILL.md` |
| Cursor | `~/.cursor/hooks.json` | `~/.agents/skills/agent-worklog/SKILL.md` |

安装器不会修改当前项目。三份平台 manifest 位于 `templates/manifests/`，用于后续制作独立平台插件；普通安装不依赖 manifest。

用户级 hooks 覆盖本机 Claude Code、Codex CLI 和 Cursor 打开的所有项目。云端 agent、远程运行环境和其他操作系统账户不会读取这台机器的用户目录，需要在对应环境单独部署。

## 数据文件

数据使用追加式 JSONL 文本事件日志，不使用数据库。每天生成一个以日期命名的文件：

```text
config.json
2026-08-04.jsonl
2026-08-05.jsonl
```

默认目录由操作系统标准数据目录决定：

- macOS：`~/Library/Application Support/agent-worklog/`
- Linux：`~/.local/share/agent-worklog/`
- Windows：`%LOCALAPPDATA%/agent-worklog/Data/`

可以通过 `AGENT_WORKLOG_DATA_DIR` 指定其他目录。安装向导会打印当前机器上的实际路径。

读取日志时，工具把事件还原成任务记录。每条任务记录包含：

```json
{
  "id": "uuid",
  "platform": "claude",
  "language": "zh-CN",
  "projectPath": "/absolute/project/path",
  "startedAt": "2026-08-04T09:00:00.000Z",
  "endedAt": "2026-08-04T09:30:00.000Z",
  "durationSeconds": 1800,
  "summary": "完成登录流程重构",
  "date": "2026-08-04",
  "points": 2.5,
  "status": "completed"
}
```

hook 会要求 Agent 使用安装时选择的语言撰写摘要，并把语言代码和任务一起记录。任务按开始日期归档，跨午夜任务不会拆分。写入使用短期锁文件，防止多个本地 agent 同时追加时互相覆盖。点数修改会追加到对应日期文件，原始历史仍可审阅。

## 汇总

```bash
agent-worklog summary --date 2026-08-04
agent-worklog summary --week 2026-08-04
agent-worklog summary --from 2026-08-01 --to 2026-08-07
agent-worklog summary --date 2026-08-04 --platform codex
agent-worklog summary --date 2026-08-04 --project "$PWD"
agent-worklog summary --date 2026-08-04 --json
```

输出是供人工检查的 Markdown 或 JSON 草稿。缺少 agent 摘要时会明确显示“Agent 未提供摘要”，脚本不会编造内容。

## 点数分摊

```bash
agent-worklog set-points --date 2026-08-04 --total 8
agent-worklog set-points --from 2026-08-01 --to 2026-08-07 --total 40
agent-worklog set-points --date 2026-08-04 --total 8 --project "$PWD"
```

点数以 0.5 为最小单位，总点数也必须是 0.5 的倍数。算法按每条记录耗时比例分配，并用最大余数法补齐舍入差额，因此分配结果之和始终等于输入总点数。相同余数按记录 id 排序，结果可复现。

## 仪表盘

```bash
agent-worklog dashboard
agent-worklog dashboard start
agent-worklog dashboard status
agent-worklog dashboard stop
agent-worklog dashboard restart
agent-worklog dashboard restart --port 5000
agent-worklog dashboard start --no-open
```

`agent-worklog dashboard` 等同于 `agent-worklog dashboard start`。启动时会先检查已有的受管实例：如果服务已经运行，只输出并打开现有地址，不会重复启动；如果未运行，则在后台启动并返回访问地址。`status` 用于查看地址和进程 ID，`stop` 用于停止服务，`restart` 用于应用新版本或新的主机、端口参数。服务状态保存在本地数据目录下的 `dashboard.json`。服务仅允许监听 `127.0.0.1`、`localhost` 或 `::1`，默认使用端口 `4789`；端口被占用时会依次尝试后续十个端口。

页面一次只查看一个日期，默认使用安装语言，也支持随时切换简体中文、日语和英语，并提供平台和项目筛选、项目小计，以及重新分摊当天点数。筛选只影响当前显示的记录和小计；“当日总点数”始终表示所选日期全部已完成记录的总点数，并对这些记录整体重新分摊。需要按项目范围分配时可使用 CLI。浏览器会记住当前安装配置下的手动语言选择；重新运行安装向导修改语言后，页面会采用新的安装语言。CLI 的周报和日期区间功能不受影响。

仪表盘不需要一直运行，hooks 记录工作时也不依赖它。可以在安装完成时直接启动，也可以在需要查看数据时再运行 `agent-worklog dashboard`。从 `0.1.1` 或更早版本升级时，需要先把旧终端中仍在运行的仪表盘手动停止一次，再启动新的受管服务；旧版本没有写入服务状态，新命令无法可靠识别并停止旧进程。

## 本地开发与完整演练

在本包目录建立全局链接，然后让 hooks 直接调用这个全局短命令：

```bash
cd /path/to/agent-worklog
npm install
npm test
npm link
agent-worklog install --hook-command agent-worklog
```

`--hook-command agent-worklog` 只用于尚未发布 npm 包的本地链接场景。正式发布后直接运行 `agent-worklog install` 或 `npx @gepeiyu/agent-worklog install`，安装器默认写入 `npx --yes @gepeiyu/agent-worklog ...`。

模拟一条 Codex 记录：

```bash
printf '%s\n' '{"hook_event_name":"UserPromptSubmit","session_id":"demo-session","turn_id":"demo-turn","cwd":"'"$PWD"'","prompt":"实现演示功能"}' | agent-worklog record-start --platform codex
printf '%s\n' '{"hook_event_name":"Stop","session_id":"demo-session","turn_id":"demo-turn","cwd":"'"$PWD"'","last_assistant_message":"<!-- agent-worklog-summary: 完成 agent-worklog 演示 -->"}' | agent-worklog record-end --platform codex
agent-worklog summary --date "$(date +%F)"
agent-worklog set-points --date "$(date +%F)" --total 8
agent-worklog dashboard
```

## 平台限制

- Claude Code 的 `Stop` 不会在用户主动中断时触发。下一轮开始时，工具会把遗留轮次标记为 `interrupted`，但不会猜测结束时间或耗时。
- Codex 的正常 `Stop` 轮次可完整记录；进程崩溃或强制终止没有可靠的逐轮结束事件。
- Cursor 本地 Agent 使用 `sessionStart` 注入摘要约定，并通过 `beforeSubmitPrompt`、`afterAgentResponse`、`stop` 组合记录。Cursor Cloud Agent 不支持 `sessionStart/sessionEnd`，因此云端不能保证摘要约定被注入。
- 操作系统强制结束进程时，任何平台都无法保证收到结束 hook。未完成记录不会参与耗时统计或点数分摊。

## 发布

只在本机使用时，`npm link` 的效果与全局发布后安装相同。

推送 tag 后，[`.github/workflows/publish.yml`](.github/workflows/publish.yml) 会自动发布。参考 `gepeiyu/smart` 的发布方式，工作流从当前仓库的 `NPM_TOKEN` Secret 读取 npm access token，并通过 `NODE_AUTH_TOKEN` 传给 npm。发布前需要在 `agent-worklog` 仓库的 **Settings > Secrets and variables > Actions** 中添加 `NPM_TOKEN`。仅配置在其他仓库（包括 `smart`）中的 Secret 不会自动共享到这里。

发布新版本时，更新版本号并推送对应提交和 tag：

```bash
npm version patch
git push origin main --follow-tags
```

tag 必须严格等于 `v` 加 `package.json` 中的版本号，例如 `v0.2.0`。工作流会拒绝版本不匹配的 tag，检查 `NPM_TOKEN` 是否已配置，运行测试和发布包检查，然后附带 provenance 公开发布。`0.1.0` 已经发布，不要再创建 `v0.1.0` tag。

需要紧急手动发布时，`package.json` 已包含 `publishConfig.access: "public"`；在本地完成 npm 登录后运行 `npm publish --access public`。
