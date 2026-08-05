import path from "node:path";
import { setPointsForScope } from "../store/db.js";
import { resolveDateRange } from "../utils.js";

export async function setPointsCommand(options) {
  if (options.total == null) throw new Error("--total is required");
  const range = resolveDateRange(options);
  return setPointsForScope({
    filters: {
      ...range,
      platform: options.platform || null,
      project: options.project ? path.resolve(options.project) : null
    },
    totalPoints: options.total
  });
}

export async function runSetPoints(options) {
  const result = await setPointsCommand(options);
  process.stdout.write(
    `已将 ${Number(result.totalPoints).toFixed(1)} 点分配给 ${result.records.length} 条记录。\n`
  );
  for (const record of result.records.sort((a, b) => a.startedAt.localeCompare(b.startedAt))) {
    process.stdout.write(`- ${record.date} ${record.platform}: ${record.points.toFixed(1)} 点\n`);
  }
}
