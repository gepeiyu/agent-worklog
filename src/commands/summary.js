import path from "node:path";
import { getRecordStats, listRecords } from "../store/db.js";
import { formatClock, formatDuration, resolveDateRange } from "../utils.js";

export async function buildSummary(options = {}) {
  const range = resolveDateRange(options);
  const filters = {
    ...range,
    platform: options.platform || null,
    project: options.project ? path.resolve(options.project) : null
  };
  const records = await listRecords(filters);
  const stats = getRecordStats(records);
  return { range, filters, records, stats };
}

export function renderMarkdownSummary({ range, records, stats }) {
  const title = range.from === range.to ? "日报草稿" : "工作汇总草稿";
  const lines = [
    `# ${title}：${range.from}${range.from === range.to ? "" : ` 至 ${range.to}`}`,
    "",
    "## 总览",
    "",
    `- 完成轮次：${stats.completedCount}`,
    `- 总耗时：${formatDuration(stats.totalDurationSeconds)}`,
    `- 总点数：${stats.totalPoints.toFixed(1)}`
  ];

  for (const project of stats.byProject) {
    const projectRecords = records
      .filter((record) => record.projectPath === project.projectPath)
      .sort((a, b) => a.startedAt.localeCompare(b.startedAt));
    lines.push("", `## ${path.basename(project.projectPath) || project.projectPath}`, "");
    lines.push(
      `小计：${formatDuration(project.durationSeconds)} / ${project.points.toFixed(1)} 点`,
      ""
    );
    for (const record of projectRecords) {
      const time = `${formatClock(record.startedAt)}-${formatClock(record.endedAt)}`;
      const summary = record.summary || "Agent 未提供摘要";
      const points = record.points == null ? "未分配" : `${record.points.toFixed(1)} 点`;
      lines.push(
        `- ${time} · ${record.platform} · ${formatDuration(record.durationSeconds)} · ${points}`,
        `  ${summary}`
      );
    }
  }

  const incomplete = records.filter((record) => !record.endedAt);
  if (incomplete.length > 0) {
    lines.push("", "## 未完成记录", "");
    for (const record of incomplete) {
      lines.push(`- ${formatClock(record.startedAt)} · ${record.platform} · ${record.status}`);
    }
  }

  if (records.length === 0) {
    lines.push("", "该范围内暂无记录。");
  }
  return `${lines.join("\n")}\n`;
}

export async function runSummary(options) {
  const result = await buildSummary(options);
  if (options.json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }
  process.stdout.write(renderMarkdownSummary(result));
}
