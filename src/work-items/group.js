/**
 * Groups turn-level records into daily session work items without changing the
 * underlying records. Records without a session ID remain independent items.
 *
 * @param {Array<object>} records public records returned by the store
 * @returns {Array<object>} session work items sorted newest first
 */
export function groupRecordsBySession(records) {
  const groups = new Map();

  for (const record of records) {
    const key = record.sessionId
      ? [record.date, record.platform, record.projectPath, record.sessionId].join("\u0000")
      : `record\u0000${record.id}`;
    const group = groups.get(key) ?? [];
    group.push(record);
    groups.set(key, group);
  }

  return [...groups.entries()]
    .map(([id, turns]) => createWorkItem(id, turns))
    .sort((a, b) => b.lastActivityAt.localeCompare(a.lastActivityAt));
}

function createWorkItem(id, records) {
  const turns = [...records].sort((a, b) => a.startedAt.localeCompare(b.startedAt));
  const first = turns[0];
  const summaries = uniqueSummaries(turns);
  const durations = turns
    .map((record) => record.durationSeconds)
    .filter((duration) => duration != null);
  const points = turns
    .map((record) => record.points)
    .filter((value) => value != null);
  const endedTimes = turns
    .map((record) => record.endedAt)
    .filter(Boolean)
    .sort();
  const lastTurn = turns.at(-1);

  return {
    id,
    platform: first.platform,
    language: first.language,
    projectPath: first.projectPath,
    sessionId: first.sessionId,
    date: first.date,
    startedAt: turns[0].startedAt,
    endedAt: turns.some((record) => record.status === "running")
      ? null
      : endedTimes.at(-1) ?? lastTurn.startedAt,
    lastActivityAt: lastTurn.endedAt ?? lastTurn.startedAt,
    durationSeconds: durations.length > 0
      ? Math.round(durations.reduce((sum, duration) => sum + Number(duration), 0) * 1000) / 1000
      : null,
    summary: summaries.at(-1) ?? null,
    summaries,
    summaryCount: summaries.length,
    points: points.length > 0
      ? Math.round(points.reduce((sum, value) => sum + Number(value), 0) * 100) / 100
      : null,
    status: aggregateStatus(turns),
    turnCount: turns.length,
    turns
  };
}

function uniqueSummaries(records) {
  const seen = new Set();
  const summaries = [];
  for (const record of records) {
    if (!record.summary || seen.has(record.summary)) continue;
    seen.add(record.summary);
    summaries.push(record.summary);
  }
  return summaries;
}

function aggregateStatus(records) {
  if (records.some((record) => record.status === "running")) return "running";
  return records.at(-1)?.status ?? "completed";
}
