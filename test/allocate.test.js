import assert from "node:assert/strict";
import test from "node:test";
import { allocatePoints, parsePointUnits } from "../src/points/allocate.js";

test("allocates points by duration and preserves the exact half-point total", () => {
  const result = allocatePoints([
    { id: "short", durationSeconds: 60 },
    { id: "medium", durationSeconds: 120 },
    { id: "long", durationSeconds: 300 }
  ], "8");

  assert.deepEqual(result, [
    { recordId: "long", points: 5, units: 10 },
    { recordId: "medium", points: 2, units: 4 },
    { recordId: "short", points: 1, units: 2 }
  ]);
  assert.equal(result.reduce((sum, item) => sum + item.units, 0), 16);
});

test("uses largest remainder and a deterministic id tie-break", () => {
  const result = allocatePoints([
    { id: "c", durationSeconds: 1 },
    { id: "a", durationSeconds: 1 },
    { id: "b", durationSeconds: 1 }
  ], "1");

  assert.deepEqual(result, [
    { recordId: "a", points: 0.5, units: 1 },
    { recordId: "b", points: 0.5, units: 1 },
    { recordId: "c", points: 0, units: 0 }
  ]);
});

test("rejects non-half-point totals and zero durations", () => {
  assert.equal(parsePointUnits("8.50"), 17);
  assert.throws(() => parsePointUnits("1.25"), /multiple of 0.5/);
  assert.throws(
    () => allocatePoints([{ id: "zero", durationSeconds: 0 }], "1"),
    /positive duration/
  );
});
