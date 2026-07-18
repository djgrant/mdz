/**
 * Tests for the E2a2 generator: entry counts, per-entry orchestrator model,
 * the generic ralph skill, the content-matched optimise caller, and the
 * terse syntax-first command.
 */

import { existsSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

import { E2A_TARGETS, PASSES, STRATEGIES } from "./e2a.ts";
import { buildE2a2, OPTIMISE_SKILL_V2, RALPH_SKILL } from "./e2a2.ts";
import { ORCHESTRATOR_MODELS, WORKER_AGENT } from "./e2b2.ts";
import { PHASE_ROOT, PROGRAMS_DIR, type ManifestEntry } from "./shared.ts";
import { validateMdz } from "../../../src/interpreter/validate.ts";

let entries: ManifestEntry[];

beforeAll(() => {
  entries = buildE2a2(PROGRAMS_DIR);
});

describe("manifest", () => {
  it("has 2 targets x 3 orchestrator models = 6 skill-arm entries", () => {
    expect(entries.length).toBe(6);
    for (const e of entries) {
      expect(e.experiment).toBe("e2a2");
      expect(e.runMode).toBe("agentic");
      expect(e.timeoutMs).toBe(2400 * 1000);
      expect(existsSync(join(PHASE_ROOT, e.programPath)), e.programPath).toBe(true);
    }
  });

  it("pins the orchestrator model per entry", () => {
    for (const target of E2A_TARGETS) {
      for (const model of ORCHESTRATOR_MODELS) {
        const e = entries.find((x) => x.id === `e2a2-${target.name}-${model}`);
        expect(e?.model).toBe(model);
      }
    }
  });

  it("expects one whole-goal sonnet-5 worker per round", () => {
    for (const e of entries) {
      expect(e.expected).toMatchObject({
        workerSpawns: PASSES,
        subagentType: WORKER_AGENT,
      });
    }
  });
});

describe("ralph.mdz", () => {
  it("is valid canonical MDZ", () => {
    expect(validateMdz(RALPH_SKILL).ok).toBe(true);
  });

  it("is generic: no scoring, no strategies, loop bounded in the WHILE condition", () => {
    expect(RALPH_SKILL).toContain("WHILE $round < $max-rounds");
    expect(RALPH_SKILL).toContain("SPAWN $worker");
    expect(RALPH_SKILL).not.toContain("BENCH_MS");
    expect(RALPH_SKILL).not.toContain("$done");
  });
});

describe("optimise.mdz", () => {
  it("is valid canonical MDZ", () => {
    expect(validateMdz(OPTIMISE_SKILL_V2).ok).toBe(true);
  });

  it("is content-matched to prompt-ralph: same bullets, same round budget", () => {
    for (const s of STRATEGIES) expect(OPTIMISE_SKILL_V2).toContain(s);
    expect(OPTIMISE_SKILL_V2).toContain(`max-rounds: ${PASSES}`);
    expect(OPTIMISE_SKILL_V2).toContain(`worker: ${WORKER_AGENT}`);
    expect(OPTIMISE_SKILL_V2).toContain("USE ~/skills/ralph");
  });
});

describe("command", () => {
  it("is syntax-first, strict, and invokes the skill via USE", () => {
    const command = entries[0].sandbox![".claude/commands/optimise.md"];
    expect(command.indexOf("MDZ syntax")).toBeLessThan(command.indexOf("PRAGMA STRICT"));
    expect(command.indexOf("PRAGMA STRICT")).toBeLessThan(command.indexOf("USE ~/skills/optimise"));
    expect(command).not.toContain("BEGIN PROGRAM");
  });

  it("binds the target's file, tests, and bench", () => {
    for (const target of E2A_TARGETS) {
      const e = entries.find((x) => x.id === `e2a2-${target.name}-haiku`)!;
      const command = e.sandbox![".claude/commands/optimise.md"];
      expect(command).toContain(`file: ./${target.targetFile}`);
      expect(command).toContain(`tests: ${target.testCommand}`);
      expect(command).toContain(`bench: ${target.benchCommand}`);
    }
  });

  it("ships ralph and optimise skills, no map-reduce, no agent definitions", () => {
    for (const e of entries) {
      const keys = Object.keys(e.sandbox!);
      expect(keys).toContain("skills/ralph.mdz");
      expect(keys).toContain("skills/optimise.mdz");
      expect(keys.some((k) => k.includes("map-reduce"))).toBe(false);
      expect(keys.some((k) => k.startsWith(".claude/agents/"))).toBe(false);
    }
  });
});
