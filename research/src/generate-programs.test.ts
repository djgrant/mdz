import { existsSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";

import { afterAll, describe, expect, it } from "vitest";

import {
  buildQ1,
  buildQ2,
  buildQ3,
  buildQ4,
  buildQ5,
  getValidationFailures,
  resetValidationFailures,
  PHASE_ROOT,
  type ManifestEntry,
} from "./generate-programs.ts";

// Output inside the phase folder so manifest paths remain relative to the phase root.
const OUT = join(PHASE_ROOT, "programs", ".test-out");

function absOf(entry: ManifestEntry, key: "programPath" | "tracePath"): string | null {
  const p = entry[key];
  return p === null ? null : join(PHASE_ROOT, p);
}

describe("generate-programs manifests", () => {
  resetValidationFailures();
  const q1 = buildQ1(OUT, 3);
  const q2 = buildQ2(OUT, 2);
  const q3 = buildQ3(OUT);
  const q4 = buildQ4(OUT, 2);
  const q5 = buildQ5(OUT, 2);

  afterAll(() => rmSync(OUT, { recursive: true, force: true }));

  it("produces no canonical grammar-validation failures", () => {
    expect(getValidationFailures()).toBe(0);
  });

  it("writes every referenced program and trace file", () => {
    for (const entry of [...q1, ...q2, ...q4, ...q5]) {
      expect(existsSync(absOf(entry, "programPath")!), entry.programPath).toBe(true);
      if (entry.tracePath) expect(existsSync(absOf(entry, "tracePath")!), entry.tracePath).toBe(true);
    }
  });

  it("flags malformed programs in the q1 manifest", () => {
    const malformed = q1.filter((e) => e.variant.malformed === true);
    expect(malformed.length).toBe(3); // one per seed
    for (const entry of malformed) {
      expect(entry.variant.notation).toBe("malformed");
      expect(existsSync(absOf(entry, "programPath")!)).toBe(true);
    }
    // Non-malformed variants are not flagged.
    expect(q1.filter((e) => e.variant.malformed === false).every((e) => e.variant.notation !== "malformed")).toBe(true);
  });

  it("labels q3 arms and q5 external-state arms", () => {
    expect(q3.filter((e) => e.arm === "A-procedure").length).toBe(10);
    expect(q3.filter((e) => e.arm === "B-goal").length).toBe(10);
    expect(new Set(q5.map((e) => e.arm))).toEqual(new Set(["A-internal", "B-state-ledger"]));
  });

  it("q4 traces contain one call step per boundary at each depth", () => {
    for (const entry of q4) {
      const trace = JSON.parse(readFileSync(absOf(entry, "tracePath")!, "utf-8"));
      const calls = trace.filter((s: { action: string }) => s.action === "call");
      expect(calls.length).toBe(entry.variant.callDepth);
    }
  });

  it("well-formed manifest entries carry variant + seed", () => {
    for (const entry of [...q1, ...q2, ...q3, ...q4, ...q5]) {
      expect(typeof entry.programPath).toBe("string");
      expect(entry.variant).toBeTypeOf("object");
      expect(entry.seed).toBeGreaterThanOrEqual(1);
    }
  });
});
