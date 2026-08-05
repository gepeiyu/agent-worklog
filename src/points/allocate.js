/**
 * Allocate a point total in proportion to record duration.
 *
 * @param {Array<{id: string, durationSeconds: number}>} records completed records
 * @param {number|string} totalPoints total points, in multiples of 0.5
 * @returns {Array<{recordId: string, points: number, units: number}>}
 *
 * Durations are converted to integer milliseconds. The largest remainder method
 * assigns leftover half-point units deterministically, using record id to break ties.
 */
export function allocatePoints(records, totalPoints) {
  if (!Array.isArray(records) || records.length === 0) {
    throw new Error("At least one record is required for point allocation");
  }

  const totalUnits = parsePointUnits(totalPoints);
  const weighted = records.map((record) => {
    const duration = Number(record.durationSeconds);
    if (!Number.isFinite(duration) || duration <= 0) {
      throw new Error(`Record ${record.id} must have a positive duration`);
    }
    return {
      id: String(record.id),
      weight: BigInt(Math.max(1, Math.round(duration * 1000)))
    };
  });

  const totalWeight = weighted.reduce((sum, item) => sum + item.weight, 0n);
  const unitsAsBigInt = BigInt(totalUnits);
  const shares = weighted.map((item) => {
    const numerator = unitsAsBigInt * item.weight;
    return {
      recordId: item.id,
      units: Number(numerator / totalWeight),
      remainder: numerator % totalWeight
    };
  });

  let remaining = totalUnits - shares.reduce((sum, share) => sum + share.units, 0);
  const ranked = [...shares].sort((a, b) => {
    if (a.remainder === b.remainder) {
      return a.recordId.localeCompare(b.recordId);
    }
    return a.remainder > b.remainder ? -1 : 1;
  });

  for (let index = 0; index < remaining; index += 1) {
    ranked[index].units += 1;
  }

  return shares
    .map(({ recordId, units }) => ({ recordId, units, points: units * 0.5 }))
    .sort((a, b) => a.recordId.localeCompare(b.recordId));
}

export function parsePointUnits(value) {
  const normalized = String(value).trim();
  const match = normalized.match(/^(\d+)(?:\.(\d+))?$/);
  if (!match) {
    throw new Error("total points must be a non-negative number");
  }

  const decimals = (match[2] ?? "").replace(/0+$/, "");
  if (decimals !== "" && decimals !== "5") {
    throw new Error("total points must be a multiple of 0.5");
  }

  const units = Number(match[1]) * 2 + (decimals === "5" ? 1 : 0);
  if (!Number.isSafeInteger(units)) {
    throw new Error("total points is too large");
  }
  return units;
}
