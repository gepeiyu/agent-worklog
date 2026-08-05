# agent-worklog

**English** | [简体中文](README.zh-CN.md)

`agent-worklog` is a fully local worklog for AI coding agents. It supports Claude Code, Codex CLI, and Cursor. Platform hooks record the start, end, and duration of each completed turn, while the agent itself supplies the work summary. The tool can then generate daily or weekly report drafts and allocate points by recorded duration.

The tool never signs in to, calls, or submits data to a company system. All records, summaries, and exports stay on the local machine, and final submission always remains a manual action.

## Requirements

- Node.js 22.12 or later
- npm 10 or later
- User-level hook support in the selected platforms; Codex requires the new hook to be trusted through `/hooks` on first use

## Installation

Install the package globally, then run the setup wizard once. The wizard writes user-level configuration that applies to every local project opened by the selected agents:

```bash
npm install -g @gepeiyu/agent-worklog
agent-worklog install
```

You can also run the installer without a prior global installation:

```bash
npx @gepeiyu/agent-worklog install
```

The installer does not need to be run from a project directory. Its interactive flow is:

1. Select the worklog and default dashboard language: Simplified Chinese, Japanese, or English.
2. Select one or more platforms: Claude Code, Codex CLI, and Cursor.
3. Install user-level hooks and Skills, so the configuration applies to every local project.
4. Print the installed files and resolved local data directory.
5. Ask whether to start the dashboard immediately. The default answer is yes.

When started from the installer, the dashboard opens in the browser and keeps the current terminal open until you press `Ctrl+C`. Stopping it does not disable worklog recording. After the first installation or a hook update, restart any currently running Claude Code, Codex CLI, and Cursor sessions so they reload their user-level hooks. Starting or stopping the dashboard itself does not require an agent restart.

Codex also requires an explicit trust step after every new or changed command hook. Open `/hooks`, review `UserPromptSubmit` and `Stop`, and select **Trust all and continue**. Codex skips both hooks until they are trusted, so no Codex worklog records will be created before this step.

Non-interactive installation requires both the language and platform list and does not start a long-running server by default. Add `--start-dashboard` when that behavior is intentional:

```bash
agent-worklog install --language en --platforms claude,codex,cursor
agent-worklog install --language en --platforms claude,codex,cursor --start-dashboard
```

The installer stores the language in `config.json` under the local data directory, then generates hook summary instructions and global Skills for that language. Run the installer again to change it. Existing configuration is preserved, while previous `agent-worklog` hook entries are replaced so repeated installation does not create duplicates.

| Platform | User-level hook configuration | User-level Skill |
| --- | --- | --- |
| Claude Code | `~/.claude/settings.json` | `~/.claude/skills/agent-worklog/SKILL.md` |
| Codex CLI | `~/.codex/hooks.json` | `~/.agents/skills/agent-worklog/SKILL.md` |
| Cursor | `~/.cursor/hooks.json` | `~/.agents/skills/agent-worklog/SKILL.md` |

The installer does not modify the current project. The three platform manifests under `templates/manifests/` are available for packaging dedicated platform plugins later; normal installation does not depend on them.

User-level hooks cover every project opened by Claude Code, Codex CLI, or Cursor under the current operating-system account. Cloud agents, remote environments, and other user accounts do not read this machine's user directory and must be configured separately.

## Data files

Data is stored as append-only JSONL text event logs. No database is used. Each day has its own dated file:

```text
config.json
2026-08-04.jsonl
2026-08-05.jsonl
```

The default location follows the operating system's standard application-data directory:

- macOS: `~/Library/Application Support/agent-worklog/`
- Linux: `~/.local/share/agent-worklog/`
- Windows: `%LOCALAPPDATA%/agent-worklog/Data/`

Set `AGENT_WORKLOG_DATA_DIR` to use a different directory. The installer prints the resolved path for the current machine.

When logs are read, their events are projected into task records. Each task record contains:

```json
{
  "id": "uuid",
  "platform": "claude",
  "language": "en",
  "projectPath": "/absolute/project/path",
  "startedAt": "2026-08-04T09:00:00.000Z",
  "endedAt": "2026-08-04T09:30:00.000Z",
  "durationSeconds": 1800,
  "summary": "Refactored the sign-in flow",
  "date": "2026-08-04",
  "points": 2.5,
  "status": "completed"
}
```

The hook asks the agent to write each summary in the language selected during installation, and the language code is stored with the task. Tasks are assigned to their start date, so a task that crosses midnight is not split. A short-lived lock file prevents concurrent local agents from overwriting each other's appends. Point changes are appended to the corresponding daily files, preserving an inspectable history.

## Reports

```bash
agent-worklog summary --date 2026-08-04
agent-worklog summary --week 2026-08-04
agent-worklog summary --from 2026-08-01 --to 2026-08-07
agent-worklog summary --date 2026-08-04 --platform codex
agent-worklog summary --date 2026-08-04 --project "$PWD"
agent-worklog summary --date 2026-08-04 --json
```

The output is a Markdown or JSON draft for human review. Missing agent summaries are marked explicitly; the script never invents them.

## Point allocation

```bash
agent-worklog set-points --date 2026-08-04 --total 8
agent-worklog set-points --from 2026-08-01 --to 2026-08-07 --total 40
agent-worklog set-points --date 2026-08-04 --total 8 --project "$PWD"
```

Points use increments of 0.5, and the total must also be a multiple of 0.5. Allocation is proportional to task duration. The largest-remainder method resolves rounding differences, guaranteeing that assigned points add up exactly to the requested total. Equal remainders are ordered by record ID for deterministic results.

## Dashboard

```bash
agent-worklog dashboard
agent-worklog dashboard --port 5000
agent-worklog dashboard --no-open
```

The server only listens on `127.0.0.1`, `localhost`, or `::1`. It uses port `4789` by default and tries the next ten ports when that port is occupied. The dashboard displays one date at a time and defaults to the language selected during installation. You can switch between Simplified Chinese, Japanese, and English at any time. It also provides platform and project filters, project subtotals, and same-day point reallocation. Filters affect the visible records and subtotals only; the daily total-points field always represents and reallocates all completed records on the selected date. Use the CLI when a project-specific allocation scope is required.

The dashboard does not need to stay running for hooks to record work. Start it from the installation prompt or run `agent-worklog dashboard` whenever you want to view the data.

The browser remembers a manual language choice for the current installation configuration. If the installer is run again with a different language, the dashboard adopts the newly installed language. CLI weekly reports and date-range operations are unaffected by the dashboard's single-date view.

## Local development and end-to-end walkthrough

From the package directory, create a global link and configure hooks to call the linked short command directly:

```bash
cd /path/to/agent-worklog
npm install
npm test
npm link
agent-worklog install --hook-command agent-worklog
```

`--hook-command agent-worklog` is only needed while using an unpublished package through `npm link`. After publication, run `agent-worklog install` or `npx @gepeiyu/agent-worklog install`; the installer writes `npx --yes @gepeiyu/agent-worklog ...` by default.

Simulate one Codex record:

```bash
printf '%s\n' '{"hook_event_name":"UserPromptSubmit","session_id":"demo-session","turn_id":"demo-turn","cwd":"'"$PWD"'","prompt":"Implement the demo feature"}' | agent-worklog record-start --platform codex
printf '%s\n' '{"hook_event_name":"Stop","session_id":"demo-session","turn_id":"demo-turn","cwd":"'"$PWD"'","last_assistant_message":"<!-- agent-worklog-summary: Completed the agent-worklog demo -->"}' | agent-worklog record-end --platform codex
agent-worklog summary --date "$(date +%F)"
agent-worklog set-points --date "$(date +%F)" --total 8
agent-worklog dashboard
```

## Platform limitations

- Claude Code does not emit `Stop` when the user interrupts a turn. At the start of the next turn, the tool marks the previous running record as `interrupted`, but it does not guess an end time or duration.
- Codex records normal turns through `Stop`; a process crash or force-quit has no reliable per-turn completion event.
- The local Cursor Agent uses `sessionStart` to inject the summary protocol and combines `beforeSubmitPrompt`, `afterAgentResponse`, and `stop` to record a turn. Cursor Cloud Agent does not support `sessionStart/sessionEnd`, so summary-protocol injection cannot be guaranteed in the cloud.
- No platform can guarantee a completion hook when the operating system forcefully terminates the process. Incomplete records are excluded from duration statistics and point allocation.

## Publishing

For local-only use, `npm link` provides the same global-command behavior as an installed package.

Tag pushes are published automatically by [`.github/workflows/publish.yml`](.github/workflows/publish.yml). The workflow uses npm Trusted Publishing through GitHub Actions OIDC, so it does not require an `NPM_TOKEN` repository secret.

Before the first automated release, open the package settings on npm and add a GitHub Actions trusted publisher with these exact values:

- Organization or user: `gepeiyu`
- Repository: `agent-worklog`
- Workflow filename: `publish.yml`
- Environment: leave empty

Create a release by updating the package version and pushing the resulting commit and tag:

```bash
npm version patch
git push origin main --follow-tags
```

The tag must exactly match `v` followed by the version in `package.json`, for example `v0.2.0`. The workflow rejects mismatched tags, runs the test suite and package-content check, then publishes the public package with provenance. Do not create a `v0.1.0` tag because that version has already been published.

For an emergency manual release, `package.json` already contains `publishConfig.access: "public"`; run `npm publish --access public` from an authenticated local checkout.
