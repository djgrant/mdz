/**
 * Behavioural tests for the ledger reporter. Any optimisation must keep every
 * assertion green: the report bytes, the aggregates, and the unit-level
 * semantics are all pinned. Run with:  node ledger.test.ts
 */

import assert from "node:assert/strict";
import test from "node:test";

import {
  TEST_CONFIG,
  buildFeeTable,
  categoryLabel,
  countDuplicates,
  runPipeline,
  type Txn,
} from "./ledger.ts";

test("pipeline aggregates and report bytes are unchanged", () => {
  const s = runPipeline(TEST_CONFIG, "test-report.out");
  assert.equal(s.duplicates, 0);
  assert.equal(s.flagged, 36);
  assert.deepEqual(s.categoryTotals, [
    473993, 523226, 526777, 477122, 524651, 390526, 419927, 413298,
  ]);
  assert.equal(s.feeTotal, 36033);
  assert.equal(s.reportLines, 810);
  assert.equal(s.checksum, 2037432415);
});

test("category labels are stable", () => {
  assert.equal(categoryLabel(3), "CAT-3-19530");
  assert.equal(categoryLabel(3), "CAT-3-19530");
});

test("fee table is stable for the test config", () => {
  assert.deepEqual(buildFeeTable(TEST_CONFIG), [11, 81, 54, 27, 87, 60, 33, 6]);
});

test("duplicate pairs are counted combinatorially", () => {
  const t = (id: number, account: string, amount: number, day: number): Txn => ({
    id,
    account,
    amount,
    category: 0,
    day,
  });
  const txns = [
    t(1, "AC1001", 500, 3),
    t(2, "AC1001", 500, 3),
    t(3, "AC1001", 500, 3),
    t(4, "AC1002", 500, 3),
    t(5, "AC1001", 501, 3),
    t(6, "AC1002", 500, 4),
    t(7, "AC1002", 500, 4),
  ];
  // Three identical entries give three pairs; the pair of day-4 entries gives one.
  assert.equal(countDuplicates(txns), 4);
});
