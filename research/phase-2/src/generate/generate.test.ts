/**
 * Tests for the phase-2 generator: artefact integrity, fault minimality,
 * canary uniqueness, and E4 checker strictness.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

import { buildAll } from "./index.ts";
import { PHASE_ROOT, PROGRAMS_DIR, type ManifestEntry } from "./shared.ts";
import { validateMdz } from "../../../src/interpreter/validate.ts";
import { checkOutput } from "../score/checkers.ts";
import { E4_TASKS } from "./e4-tasks.ts";

let manifests: Record<string, ManifestEntry[]>;

beforeAll(() => {
  manifests = buildAll();
});

function allEntries(): ManifestEntry[] {
  return Object.values(manifests).flat();
}

describe("manifests and referenced files", () => {
  it("writes one parseable manifest per experiment", () => {
    for (const exp of ["e1", "e2", "e3", "e4"]) {
      const path = join(PROGRAMS_DIR, exp, "manifest.json");
      expect(existsSync(path), path).toBe(true);
      const parsed = JSON.parse(readFileSync(path, "utf8"));
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBe(manifests[exp].length);
    }
  });

  it("has the specified entry counts", () => {
    expect(manifests.e1.length).toBe(30);
    expect(manifests.e2.length).toBe(4);
    expect(manifests.e3.length).toBe(8);
    expect(manifests.e4.length).toBe(20);
  });

  it("every programPath and tracePath exists relative to phase-2/", () => {
    for (const e of allEntries()) {
      expect(existsSync(join(PHASE_ROOT, e.programPath)), e.programPath).toBe(true);
      if (e.tracePath != null) {
        expect(existsSync(join(PHASE_ROOT, e.tracePath)), e.tracePath).toBe(true);
      }
    }
  });

  it("every entry has a non-empty verbatim prompt and unique id", () => {
    const ids = new Set<string>();
    for (const e of allEntries()) {
      expect(e.prompt.length).toBeGreaterThan(50);
      expect(ids.has(e.id), e.id).toBe(false);
      ids.add(e.id);
      expect(typeof (e.variant as { statements?: unknown }).statements).toBe("number");
    }
  });
});

describe("e1 fault injection", () => {
  function lines(name: string): string[] {
    return readFileSync(join(PROGRAMS_DIR, "e1", name), "utf8").split("\n");
  }

  function seeds(): number[] {
    return [...new Set(manifests.e1.map((e) => (e.variant as { seed: number }).seed))];
  }

  it("syntax fault removes IN from exactly one FOR header", () => {
    for (const seed of seeds()) {
      const clean = lines(`default-clean-seed${seed}.mdz`);
      const faulted = lines(`default-syntax-seed${seed}.mdz`);
      expect(faulted.length).toBe(clean.length);
      const diffs = clean
        .map((l, i) => [l, faulted[i], i] as const)
        .filter(([a, b]) => a !== b);
      expect(diffs.length).toBe(1);
      const [before, after] = diffs[0];
      expect(before).toMatch(/^\s*FOR \$\w+ IN \[/);
      expect(after).toBe(before.replace(" IN ", " "));
      expect(validateMdz(faulted.join("\n")).ok).toBe(false);
    }
  });

  it("type fault mistypes exactly one literal assignment used downstream", () => {
    for (const seed of seeds()) {
      const clean = lines(`default-clean-seed${seed}.mdz`);
      const faulted = lines(`default-type-seed${seed}.mdz`);
      expect(faulted.length).toBe(clean.length);
      const diffs = clean
        .map((l, i) => [l, faulted[i], i] as const)
        .filter(([a, b]) => a !== b);
      expect(diffs.length).toBe(1);
      const [before, after, idx] = diffs[0];
      const m = /^(\s*)\$(\w+): (String|Number) = (.+)$/.exec(after);
      expect(m, after).not.toBeNull();
      const [, , name, declared, literal] = m!;
      // Annotation contradicts the literal.
      if (declared === "String") expect(literal).toMatch(/^\d+$/);
      else expect(literal).toMatch(/^"[^"]*"$/);
      // Only the annotation was added.
      expect(before).toBe(after.replace(`: ${declared}`, ""));
      // The variable is read downstream.
      const downstream = faulted.slice(idx + 1).join("\n");
      expect(downstream).toMatch(new RegExp(`\\$${name}\\b`));
      // Still grammatically valid (the fault is semantic, not syntactic).
      expect(validateMdz(faulted.join("\n")).ok).toBe(true);
    }
  });

  it("strict programs start with PRAGMA STRICT and strict prompts define halt", () => {
    for (const e of manifests.e1) {
      const mode = (e.variant as { mode: string }).mode;
      const source = readFileSync(join(PHASE_ROOT, e.programPath), "utf8");
      const firstStatement = source
        .split("\n")
        .find((l) => l.trim() !== "" && !l.startsWith("---") && !l.startsWith("#") && !/^name:/.test(l));
      if (mode === "strict") {
        expect(firstStatement).toBe("PRAGMA STRICT");
        expect(e.prompt).toContain('"action": "halt"');
      } else {
        expect(firstStatement).not.toBe("PRAGMA STRICT");
        expect(e.prompt).not.toContain("halt");
      }
    }
  });
});

describe("e2 canaries", () => {
  it("are unique across the whole manifest and present in prompts and sandbox", () => {
    const seen = new Set<string>();
    for (const e of manifests.e2) {
      const canaries = (e.expected as { canaries: string[] }).canaries;
      const spawnCount = (e.expected as { spawnCount: number }).spawnCount;
      expect(canaries.length).toBe(spawnCount);
      const sandboxText = Object.values(e.sandbox!).join("\n");
      for (const c of canaries) {
        expect(seen.has(c), c).toBe(false);
        seen.add(c);
        expect(c).toMatch(/^CANARY-E2-[a-z0-9-]+-\d+$/);
        expect(sandboxText).toContain(c);
      }
      expect(e.allowedTools).toEqual(["Task"]);
      expect(e.runMode).toBe("agentic");
    }
  });

  it("lambda-fidelity carries the exact map wording in program and expected", () => {
    const e = manifests.e2.find((x) => x.id === "e2-lambda-fidelity")!;
    const lambda = (e.expected as { lambda: string }).lambda;
    expect(lambda.length).toBeGreaterThan(20);
    expect(e.prompt).toContain(lambda);
    expect(e.sandbox!["program.mdz"]).toContain(lambda);
  });
});

describe("e3 arms", () => {
  it("pairs internal (single-turn) with store (agentic + mcp) per program", () => {
    for (const e of manifests.e3) {
      if (e.arm === "internal") {
        expect(e.runMode).toBe("single-turn");
        expect(e.mcp).toBeUndefined();
      } else {
        expect(e.arm).toBe("store");
        expect(e.runMode).toBe("agentic");
        expect(e.mcp).toBe("state");
        expect(e.allowedTools).toEqual(["mcp__state__get", "mcp__state__set"]);
        expect(e.prompt).toContain("mcp__state__set");
      }
      expect(e.tracePath).not.toBeNull();
    }
  });
});

describe("e4 checkers", () => {
  it("fail the intuitive non-compliant answer and pass the compliant one, for every task", () => {
    expect(E4_TASKS.length).toBe(10);
    for (const task of E4_TASKS) {
      const bad = checkOutput(task.checkerId, task.checkerArgs, task.nonCompliantSample);
      expect(bad.pass, `${task.id} should FAIL non-compliant: ${bad.note}`).toBe(false);
      const good = checkOutput(task.checkerId, task.checkerArgs, task.compliantSample);
      expect(good.pass, `${task.id} should PASS compliant: ${good.note}`).toBe(true);
    }
  });

  it("each task has both arms sharing the checker spec", () => {
    for (const task of E4_TASKS) {
      const arms = manifests.e4.filter((e) => (e.variant as { task: string }).task === task.id);
      expect(arms.map((a) => a.arm).sort()).toEqual(["A-procedure", "B-goal"]);
      for (const arm of arms) {
        const exp = arm.expected as { checkerId: string; procedureText: string };
        expect(exp.checkerId).toBe(task.checkerId);
        expect(exp.procedureText).toBe(task.procedure);
      }
      // Arm A carries the MDZ procedure; arm B must not.
      const [a, b] = [
        arms.find((x) => x.arm === "A-procedure")!,
        arms.find((x) => x.arm === "B-goal")!,
      ];
      expect(a.prompt).toContain("BEGIN PROCEDURE");
      expect(b.prompt).not.toContain("BEGIN PROCEDURE");
      // Both arms share the input verbatim.
      expect(a.prompt).toContain(task.input);
      expect(b.prompt).toContain(task.input);
    }
  });
});
