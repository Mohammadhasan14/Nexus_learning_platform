import { test } from "node:test";
import assert from "node:assert/strict";
import { estimate } from "../../modules/system-design/estimation";
import { defaultWorksheet } from "../../modules/system-design/content";
import {
  identitySchema,
  worksheetIdentity,
  worksheetSchema,
  workloadFields,
} from "../../modules/system-design/schema";
const w = defaultWorksheet.workload;
const near = (actual: number, expected: number) =>
  assert.ok(Math.abs(actual - expected) < 0.000001, `${actual} ≈ ${expected}`);
test("capacity-v1 golden fixture preserves intermediate precision and units", () => {
  const e = estimate(w);
  near(e.averageRps, 23.14814814814815);
  near(e.peakRps, 115.74074074074075);
  near(e.peakReadRps, 104.16666666666667);
  near(e.peakWriteRps, 11.574074074074074);
  near(e.logicalRetainedWriteBytes / 1e9, 12);
  near(e.logicalRetainedWriteBytes / 2 ** 30, 11.175870895385742);
  near(e.peakReadEgressMbps, 16.666666666666668);
  assert.deepEqual(estimate(w), e);
  assert.equal(
    estimate({ ...w, peakFactor: 10 }).logicalRetainedWriteBytes,
    e.logicalRetainedWriteBytes,
  );
  near(estimate({ ...w, peakFactor: 10 }).peakRps, e.peakRps * 2);
});
test("meaningful zeros, all reads/writes and finite boundary combinations", () => {
  for (const key of ["dailyActiveUsers", "requestsPerUserPerDay"] as const) {
    const e = estimate({ ...w, [key]: 0 });
    assert.equal(e.peakRps, 0);
    assert.equal(e.logicalRetainedWriteBytes, 0);
    assert.equal(e.peakReadEgressMbps, 0);
  }
  assert.equal(
    estimate({ ...w, readPercentage: 100 }).logicalRetainedWriteBytes,
    0,
  );
  assert.equal(estimate({ ...w, readPercentage: 0 }).peakReadEgressMbps, 0);
  for (const key of ["writePayloadBytes", "retentionDays"] as const)
    assert.equal(estimate({ ...w, [key]: 0 }).logicalRetainedWriteBytes, 0);
  assert.equal(estimate({ ...w, readResponseBytes: 0 }).peakReadEgressMbps, 0);
  for (const [key, rule] of Object.entries(workloadFields)) {
    for (const value of [rule.min, rule.max]) {
      const result = estimate({ ...w, retentionDays: 0, [key]: value });
      assert.ok(Object.values(result).every(Number.isFinite));
    }
  }
});
test("invalid, missing, non-finite, unsupported and precision-overflow inputs fail closed", () => {
  for (const [key, rule] of Object.entries(workloadFields)) {
    for (const value of [
      undefined,
      "",
      null,
      NaN,
      Infinity,
      -Infinity,
      rule.min - 1,
      rule.max + 1,
      ...(rule.integer ? [1.5] : []),
    ])
      assert.throws(() => estimate({ ...w, [key]: value }));
  }
  assert.throws(() =>
    estimate({
      ...w,
      dailyActiveUsers: 1e8,
      requestsPerUserPerDay: 1e5,
      writePayloadBytes: 1e7,
      retentionDays: 3650,
    }),
  );
  assert.throws(() => estimate(w, "capacity-v2"));
  assert.equal(
    identitySchema.safeParse({ ...worksheetIdentity, schema: "worksheet-v2" })
      .success,
    false,
  );
  assert.equal(
    worksheetSchema.safeParse({ ...defaultWorksheet, owner: "forged" }).success,
    false,
  );
  assert.equal(
    worksheetSchema.safeParse({
      ...defaultWorksheet,
      explanation: "x".repeat(4001),
    }).success,
    false,
  );
  assert.equal(
    worksheetSchema.safeParse({ ...defaultWorksheet, latencyTargetMs: 0 })
      .success,
    false,
  );
});
