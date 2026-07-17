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
    for (const exp of ["e1", "e2", "e3", "e3b", "e4"]) {
      const path = join(PROGRAMS_DIR, exp, "manifest.json");
      expect(existsSync(path), path).toBe(true);
      const parsed = JSON.parse(readFileSync(path, "utf8"));
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBe(manifests[exp].length);
    }
  });

  it("has the specified entry counts", () => {
    expect(manifests.e1.length).toBe(55);
    expect(manifests.e2.length).toBe(5);
    expect(manifests.e3.length).toBe(8);
    expect(manifests.e3b.length).toBe(8);
    expect(manifests.e4.length).toBe(33);
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

  it("grammar cells state the grammar; non-grammar cells do not", () => {
    const grammar = manifests.e1.filter((e) => (e.variant as { grammar: boolean }).grammar);
    expect(grammar.length).toBe(25);
    for (const e of manifests.e1) {
      const hasGrammar = (e.variant as { grammar: boolean }).grammar;
      expect(e.prompt.includes("the IN keyword is required"), e.id).toBe(hasGrammar);
      expect(e.id.includes("-grammar-"), e.id).toBe(hasGrammar);
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

  it("lambda-fidelity variants carry the exact map wording in program and expected", () => {
    for (const id of ["e2-lambda-fidelity", "e2-lambda-fidelity-neutral"]) {
      const e = manifests.e2.find((x) => x.id === id)!;
      const lambda = (e.expected as { lambda: string }).lambda;
      expect(lambda.length).toBeGreaterThan(20);
      expect(e.prompt).toContain(lambda);
      expect(e.sandbox!["program.mdz"]).toContain(lambda);
    }
    const neutral = manifests.e2.find((x) => x.id === "e2-lambda-fidelity-neutral")!;
    expect((neutral.expected as { lambda: string }).lambda).not.toContain("PATTERN-BLUE");
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

describe("e3b chunking", () => {
  it("chunks are block-balanced and concatenate to the program body", () => {
    for (const e of manifests.e3b) {
      const source = readFileSync(join(PHASE_ROOT, e.programPath), "utf8");
      const body = source
        .split("\n")
        .slice(source.startsWith("---") ? source.split("\n").indexOf("---", 1) + 1 : 0)
        .filter((l) => !l.startsWith("# "))
        .join("\n")
        .replace(/\s+/g, " ")
        .trim();
      const chunks = Object.entries(e.sandbox!)
        .filter(([k]) => k.startsWith("chunks/"))
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([, v]) => v);
      expect(chunks.length).toBe((e.variant as { chunks: number }).chunks);
      expect(chunks.length).toBeGreaterThanOrEqual(2);
      for (const c of chunks) {
        const opens = (c.match(/^\s*(?:FOR|IF|WHILE|CASE)\b/gm) ?? []).length;
        const closes = (c.match(/^\s*END\b/gm) ?? []).length;
        expect(opens).toBe(closes);
      }
      const joined = chunks.join("\n").replace(/\s+/g, " ").trim();
      expect(joined).toBe(body);
    }
  });
});

describe("e4 checkers", () => {
  it("fail the intuitive non-compliant answer and pass the compliant one, for every task", () => {
    expect(E4_TASKS.length).toBe(11);
    for (const task of E4_TASKS) {
      const bad = checkOutput(task.checkerId, task.checkerArgs, task.nonCompliantSample);
      expect(bad.pass, `${task.id} should FAIL non-compliant: ${bad.note}`).toBe(false);
      const good = checkOutput(task.checkerId, task.checkerArgs, task.compliantSample);
      expect(good.pass, `${task.id} should PASS compliant: ${good.note}`).toBe(true);
    }
  });

  it("pass compliant answers that echo the procedure's own prohibitions", () => {
    const withEcho = E4_TASKS.filter((t) => t.echoSample);
    expect(withEcho.length).toBeGreaterThanOrEqual(4);
    for (const task of withEcho) {
      const echo = checkOutput(task.checkerId, task.checkerArgs, task.echoSample!);
      expect(echo.pass, `${task.id} should PASS echoing compliant: ${echo.note}`).toBe(true);
    }
  });

  it("each task has all three variants sharing the checker spec", () => {
    for (const task of E4_TASKS) {
      const arms = manifests.e4.filter((e) => (e.variant as { task: string }).task === task.id);
      expect(arms.map((a) => a.arm).sort()).toEqual(["A-procedure", "B-goal", "C-rules"]);
      for (const arm of arms) {
        const exp = arm.expected as { checkerId: string; procedureText: string };
        expect(exp.checkerId).toBe(task.checkerId);
        expect(exp.procedureText).toBe(task.procedure);
        // All variants share the input verbatim.
        expect(arm.prompt).toContain(task.input);
      }
      // Only variant A carries the MDZ procedure; only C carries the policy block.
      const [a, b, c] = ["A-procedure", "B-goal", "C-rules"].map(
        (name) => arms.find((x) => x.arm === name)!,
      );
      expect(a.prompt).toContain("BEGIN PROCEDURE");
      expect(b.prompt).not.toContain("BEGIN PROCEDURE");
      expect(c.prompt).not.toContain("BEGIN PROCEDURE");
      expect(c.prompt).toContain("BEGIN POLICY");
      expect(b.prompt).not.toContain("BEGIN POLICY");
      // C states the rules declaratively: no MDZ keywords in the policy block.
      expect(task.rules).not.toMatch(/^\s*(IF|FOR|WHILE|CASE|END)\b/m);
      expect(typeof task.depth).toBe("number");
    }
  });
});
