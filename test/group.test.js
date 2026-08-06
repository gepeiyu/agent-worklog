import assert from "node:assert/strict";
import test from "node:test";
import { groupRecordsBySession } from "../src/work-items/group.js";

test("groups turns by date, platform, project, and session", () => {
  const records = [
    record({
      id: "two",
      sessionId: "session-a",
      startedAt: "2026-08-05T02:00:00.000Z",
      endedAt: "2026-08-05T02:02:00.000Z",
      durationSeconds: 120,
      summary: "Published the package",
      points: 1.5
    }),
    record({
      id: "one",
      sessionId: "session-a",
      startedAt: "2026-08-05T01:00:00.000Z",
      endedAt: "2026-08-05T01:01:00.000Z",
      durationSeconds: 60,
      summary: "Prepared the release",
      points: 0.5
    }),
    record({
      id: "other",
      sessionId: "session-b",
      startedAt: "2026-08-05T03:00:00.000Z",
      endedAt: null,
      durationSeconds: null,
      summary: null,
      points: null,
      status: "running"
    })
  ];

  const groups = groupRecordsBySession(records);
  assert.equal(groups.length, 2);
  assert.equal(groups[0].sessionId, "session-b");
  assert.equal(groups[0].status, "running");
  assert.equal(groups[0].lastActivityAt, "2026-08-05T03:00:00.000Z");
  assert.equal(groups[1].turnCount, 2);
  assert.equal(groups[1].durationSeconds, 180);
  assert.equal(groups[1].points, 2);
  assert.equal(groups[1].summary, "Published the package");
  assert.deepEqual(groups[1].summaries, ["Prepared the release", "Published the package"]);
  assert.equal(groups[1].summaryCount, 2);
  assert.deepEqual(groups[1].turns.map((turn) => turn.id), ["one", "two"]);
});

test("does not merge records that have no session ID", () => {
  const groups = groupRecordsBySession([
    record({ id: "one", sessionId: null }),
    record({ id: "two", sessionId: null })
  ]);

  assert.equal(groups.length, 2);
  assert.ok(groups.every((group) => group.turnCount === 1));
});

test("uses the latest turn status after a session recovers", () => {
  const [group] = groupRecordsBySession([
    record({ id: "failed", status: "error", startedAt: "2026-08-05T01:00:00.000Z" }),
    record({ id: "recovered", status: "completed", startedAt: "2026-08-05T02:00:00.000Z" })
  ]);

  assert.equal(group.status, "completed");
});

function record(overrides) {
  return {
    id: "record",
    platform: "codex",
    language: "en",
    projectPath: "/tmp/project",
    sessionId: "session",
    turnId: "turn",
    startedAt: "2026-08-05T01:00:00.000Z",
    endedAt: "2026-08-05T01:01:00.000Z",
    durationSeconds: 60,
    summary: "Completed work",
    date: "2026-08-05",
    points: 0.5,
    status: "completed",
    ...overrides
  };
}
