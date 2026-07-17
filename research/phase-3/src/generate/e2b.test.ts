/**
 * Tests for the E2b generator: entry counts, content matching between arms,
 * simplify-skill structure, fixture test suites, and determinism.
 */

import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

import { buildE2b, E2B_TARGETS, HEURISTICS, ITERATIONS } from "./e2b.ts";
import { PHASE_ROOT, PROGRAMS_DIR, type ManifestEntry } from "./shared.ts";
import { validateMdz } from "../../../src/interpreter/validate.ts";
import { extractMechanism, extractWinnerIndex, runTargetTests } from "../score/e2b-score.ts";

let entries: ManifestEntry[];

beforeAll(() => {
  entries = buildE2b(PROGRAMS_DIR);
});

function entry(id: string): ManifestEntry {
  const e = entries.find((x) => x.id === id);
  if (!e) throw new Error(`missing entry ${id}`);
  return e;
}

describe("manifest", () => {
  it("has 2 targets x 2 arms = 4 agentic entries with unique ids", () => {
    expect(entries.length).toBe(4);
    const ids = entries.map((e) => e.id);
    expect(new Set(ids).size).toBe(4);
    for (const e of entries) {
      expect(e.experiment).toBe("e2b");
      expect(e.runMode).toBe("agentic");
      expect(e.allowedTools).toContain("Task");
      expect((e.variant as { iterations: number }).iterations).toBe(ITERATIONS);
    }
  });

  it("writes a parseable manifest and every programPath exists", () => {
    const manifestPath = join(PROGRAMS_DIR, "e2b", "manifest.json");
    expect(existsSync(manifestPath)).toBe(true);
    const parsed = JSON.parse(readFileSync(manifestPath, "utf8"));
    expect(parsed.length).toBe(4);
    for (const e of entries) {
      expect(existsSync(join(PHASE_ROOT, e.programPath)), e.programPath).toBe(true);
    }
  });

  it("prompts invoke the command on the target file and are otherwise identical", () => {
    for (const target of E2B_TARGETS) {
      const skill = entry(`e2b-${target.name}-skill`);
      const goal = entry(`e2b-${target.name}-goal`);
      expect(skill.prompt).toBe(`/simplify ${target.moduleFile}`);
      expect(goal.prompt).toBe(`/simplify-goal ${target.moduleFile}`);
      expect(goal.prompt.replace("/simplify-goal", "/simplify")).toBe(skill.prompt);
    }
  });
});

describe("content matching", () => {
  it("all three heuristic strings appear verbatim in both arms' sandboxes", () => {
    expect(HEURISTICS).toEqual(["make it more direct", "make it more obvious", "make it smaller"]);
    for (const e of entries) {
      const sandboxText = Object.values(e.sandbox!).join("\n");
      for (const h of HEURISTICS) {
        expect(sandboxText, `${e.id} missing "${h}"`).toContain(h);
      }
    }
  });

  it("only the skill arm carries MDZ; the goal arm is notation-free prose", () => {
    for (const target of E2B_TARGETS) {
      const skill = entry(`e2b-${target.name}-skill`);
      const goal = entry(`e2b-${target.name}-goal`);
      expect(Object.keys(skill.sandbox!)).toContain("skills/simplify.mdz");
      expect(Object.keys(skill.sandbox!)).toContain("skills/map-reduce.mdz");
      expect(Object.keys(goal.sandbox!).some((k) => k.startsWith("skills/"))).toBe(false);
      const goalCommand = goal.sandbox![".claude/commands/simplify-goal.md"];
      expect(goalCommand).toBeDefined();
      expect(goalCommand).not.toMatch(/^\s*(FOR|SPAWN|USE|RETURN|END)\b/m);
      // Same plan stated in prose: iterate, diverge, select, fresh-eyes final pick.
      expect(goalCommand).toContain(`${ITERATIONS} iterations`);
      expect(goalCommand).toContain("fresh perspective");
      expect(goalCommand).toContain("The winner need not be the last");
    }
  });
});

describe("simplify.mdz structure", () => {
  function skillSource(): string {
    return entry("e2b-pricing-skill").sandbox!["skills/simplify.mdz"];
  }

  it("is valid canonical MDZ", () => {
    expect(validateMdz(skillSource()).ok).toBe(true);
    expect(validateMdz(entry("e2b-pricing-skill").sandbox!["skills/map-reduce.mdz"]).ok).toBe(true);
  });

  it("has the agreed shape: FOR over n, inner USE of map-reduce, terminal SPAWN, RETURN", () => {
    const src = skillSource();
    expect(src).toContain("input: $file, $n");
    expect(src).toMatch(/^FOR \$i IN \[1 \.\. \$n\]$/m);
    expect(src).toMatch(/\$simplified = USE ~\/skills\/map-reduce/);
    expect(src).toContain("worker: general");
    expect(src).toContain("items: $heuristics");
    expect(src).toMatch(/^ {4}map: /m);
    expect(src).toMatch(/^ {4}reduce: /m);
    expect(src).toContain("Append $simplified to $iterations");
    expect(src).toContain("$code = $simplified");
    // The judge spawn sits after the loop, and the skill returns its verdict.
    const endIdx = src.indexOf("\nEND\n");
    const spawnIdx = src.indexOf("$winner = SPAWN general");
    expect(endIdx).toBeGreaterThan(-1);
    expect(spawnIdx).toBeGreaterThan(endIdx);
    expect(src).toContain("iterations: $iterations");
    expect(src.trimEnd().endsWith("RETURN $winner")).toBe(true);
    // Reassignment happens after the USE result lands in $simplified.
    expect(src.indexOf("$code = $simplified")).toBeGreaterThan(
      src.indexOf("$simplified = USE"),
    );
  });
});

describe("target fixtures", () => {
  it("each sandbox pairs the module with its test suite", () => {
    for (const target of E2B_TARGETS) {
      for (const arm of ["skill", "goal"]) {
        const e = entry(`e2b-${target.name}-${arm}`);
        expect(e.sandbox![target.moduleFile]).toContain("export");
        expect(e.sandbox![target.testFile]).toContain('from "node:test"');
        expect((e.expected as { targetFile: string }).targetFile).toBe(target.moduleFile);
      }
    }
  });

  it("the fixture test suites pass against the original modules", () => {
    for (const target of E2B_TARGETS) {
      const modulePath = join(
        PHASE_ROOT, "src", "generate", "fixtures", "e2b", target.name, `${target.name}.ts`,
      );
      const gate = runTargetTests(target.name, modulePath);
      expect(gate.pass, `${target.name}: ${gate.output.slice(0, 800)}`).toBe(true);
    }
  }, 60_000);

  it("the test gate fails a behaviour-breaking candidate", () => {
    const broken = join(PROGRAMS_DIR, "e2b", "broken-candidate.ts");
    const original = readFileSync(
      join(PHASE_ROOT, "src", "generate", "fixtures", "e2b", "pricing", "pricing.ts"),
      "utf8",
    );
    mkdirSync(join(PROGRAMS_DIR, "e2b"), { recursive: true });
    writeFileSync(broken, original.replace("vatRate: 0.2", "vatRate: 0.25"));
    const gate = runTargetTests("pricing", broken);
    rmSync(broken);
    expect(gate.pass).toBe(false);
  }, 60_000);
});

describe("mechanism extraction", () => {
  function spawnEvent(prompt: string): string {
    return JSON.stringify({
      message: {
        content: [
          { type: "tool_use", name: "Task", input: { subagent_type: "general", prompt } },
        ],
      },
    });
  }

  it("counts worker spawns per iteration and spots the judge spawn", () => {
    const lines: string[] = [];
    for (let i = 0; i < ITERATIONS; i++) {
      for (const h of HEURISTICS) {
        lines.push(spawnEvent(`Simplify this code, pushing in one direction: ${h}. Code: x`));
      }
    }
    lines.push(spawnEvent("Compare these versions of the same module and return the best one."));
    const m = extractMechanism(lines.join("\n"), "The winner is iteration 2.");
    expect(m.workerSpawns).toBe(9);
    expect(m.spawnsPerIteration).toEqual([3, 3, 3]);
    expect(m.judgeSpawn).toBe(true);
    expect(m.winnerIndex).toBe(2);
  });

  it("reports missing spawns and no judge for an inline shortcut run", () => {
    const m = extractMechanism(spawnEvent("Summarise the file"), "done");
    expect(m.workerSpawns).toBe(0);
    expect(m.judgeSpawn).toBe(false);
    expect(m.winnerIndex).toBe(null);
    expect(extractWinnerIndex("no verdict here")).toBe(null);
  });
});

describe("determinism", () => {
  it("regenerating produces byte-identical manifests and sandboxes", () => {
    const first = JSON.stringify(entries);
    const firstManifest = readFileSync(join(PROGRAMS_DIR, "e2b", "manifest.json"), "utf8");
    const again = buildE2b(PROGRAMS_DIR);
    expect(JSON.stringify(again)).toBe(first);
    expect(readFileSync(join(PROGRAMS_DIR, "e2b", "manifest.json"), "utf8")).toBe(firstManifest);
  });
});
