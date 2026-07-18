/**
 * Tests for the E2b2 generator: entry counts, the per-entry orchestrator
 * model field, the file-backed @(path) annotation, the sonnet-5 agent
 * definition, and the v2 skill's no-inline-code invariants.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

import { E2B_TARGETS, ITERATIONS } from "./e2b.ts";
import { buildE2b2, HEURISTICS_V2, ORCHESTRATOR_MODELS, SIMPLIFY_SKILL_V2, WORKER_AGENT } from "./e2b2.ts";
import { PHASE_ROOT, PROGRAMS_DIR, type ManifestEntry } from "./shared.ts";
import { parseMdz, validateMdz } from "../../../src/interpreter/validate.ts";

let entries: ManifestEntry[];

beforeAll(() => {
  entries = buildE2b2(PROGRAMS_DIR);
});

function entry(id: string): ManifestEntry {
  const e = entries.find((x) => x.id === id);
  if (!e) throw new Error(`missing entry ${id}`);
  return e;
}

describe("file-backed @(path) annotation", () => {
  it("parses as annotatedType plus a backing path", () => {
    const [node] = parseMdz("$code: string @(./candidate.ts)\n") as Record<string, unknown>[];
    expect(node).toEqual({
      type: "assign",
      target: "$code",
      annotatedType: { type: "ref", name: "string" },
      backing: "./candidate.ts",
    });
  });

  it("leaves un-backed annotations unchanged", () => {
    const [node] = parseMdz("$n: number = 3\n") as Record<string, unknown>[];
    expect(node).not.toHaveProperty("backing");
    expect(node).toMatchObject({ annotatedType: { type: "ref", name: "number" } });
  });
});

describe("manifest", () => {
  it("has 2 targets x 3 orchestrator models = 6 skill-arm entries", () => {
    expect(entries.length).toBe(6);
    expect(new Set(entries.map((e) => e.id)).size).toBe(6);
    for (const e of entries) {
      expect(e.experiment).toBe("e2b2");
      expect(e.runMode).toBe("agentic");
      expect((e.variant as { arm: string }).arm).toBe("skill");
      expect(e.allowedTools).toContain("Task");
      expect(e.timeoutMs).toBe(2400 * 1000);
      expect(existsSync(join(PHASE_ROOT, e.programPath)), e.programPath).toBe(true);
    }
  });

  it("pins the orchestrator model per entry via the manifest model field", () => {
    for (const target of E2B_TARGETS) {
      for (const model of ORCHESTRATOR_MODELS) {
        const e = entry(`e2b2-${target.name}-${model}`);
        expect(e.model).toBe(model);
        expect((e.variant as { orchestrator: string }).orchestrator).toBe(model);
      }
    }
  });

  it("expects the full mechanism: 3x3 workers, per-iteration reduce, judge, all sonnet-5", () => {
    for (const e of entries) {
      expect(e.expected).toMatchObject({
        iterations: ITERATIONS,
        workerSpawnsPerIteration: HEURISTICS_V2.length,
        reduceSpawnsPerIteration: 1,
        judgeSpawn: true,
        subagentType: WORKER_AGENT,
      });
    }
  });
});

describe("sandbox", () => {
  it("ships the v2 skill, map-reduce, and the command — no agent definitions", () => {
    for (const e of entries) {
      const keys = Object.keys(e.sandbox!);
      expect(keys).toContain("skills/simplify.mdz");
      expect(keys).toContain("skills/map-reduce.mdz");
      expect(keys).toContain(".claude/commands/simplify.md");
      expect(keys.some((k) => k.startsWith(".claude/agents/"))).toBe(false);
    }
  });

  it("the command explains the syntax tersely: file-backed vars and SPAWN <model>", () => {
    const command = entries[0].sandbox![".claude/commands/simplify.md"];
    expect(command).toContain("@(<path>)");
    expect(command).toContain("SPAWN <model>");
  });
});

describe("simplify.mdz v2 structure", () => {
  it("is valid canonical MDZ with file-backed variables", () => {
    expect(validateMdz(SIMPLIFY_SKILL_V2).ok).toBe(true);
    const nodes = parseMdz(SIMPLIFY_SKILL_V2) as Record<string, unknown>[];
    const backed = nodes.filter((n) => n.backing !== undefined);
    expect(backed).toContainEqual(
      expect.objectContaining({ target: "$candidate", backing: "./candidate.ts" }),
    );
  });

  it("keeps the three heuristics verbatim and addresses every worker as sonnet-5", () => {
    for (const h of HEURISTICS_V2) expect(SIMPLIFY_SKILL_V2).toContain(h);
    expect(SIMPLIFY_SKILL_V2).toContain(`map-worker: ${WORKER_AGENT}`);
    expect(SIMPLIFY_SKILL_V2).toContain(`reduce-worker: ${WORKER_AGENT}`);
    expect(SIMPLIFY_SKILL_V2).toContain(`SPAWN ${WORKER_AGENT}`);
    expect(SIMPLIFY_SKILL_V2).not.toMatch(/SPAWN general|worker: general/);
  });

  it("relays code by path, never by value", () => {
    // The v1 defect: `Code: {$code}` pasted the module into the map prompt.
    expect(SIMPLIFY_SKILL_V2).not.toContain("{$code}");
    expect(SIMPLIFY_SKILL_V2).not.toContain("{$candidate}");
    expect(SIMPLIFY_SKILL_V2).toContain("@(./candidate.ts)");
    expect(SIMPLIFY_SKILL_V2).toContain("@(./base-$i.ts)");
    expect(SIMPLIFY_SKILL_V2).toContain("@(./iterations-$i.ts)");
  });
});

describe("determinism", () => {
  it("regenerating produces byte-identical manifests", () => {
    const first = JSON.stringify(entries);
    const manifestPath = join(PROGRAMS_DIR, "e2b2", "manifest.json");
    const firstManifest = readFileSync(manifestPath, "utf8");
    expect(JSON.stringify(buildE2b2(PROGRAMS_DIR))).toBe(first);
    expect(readFileSync(manifestPath, "utf8")).toBe(firstManifest);
  });
});
