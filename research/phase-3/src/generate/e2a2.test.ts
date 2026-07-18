/**
 * Tests for the E2a2 generator: entry counts, per-entry orchestrator model,
 * the file-backed optimise skill, and the terse syntax-first command.
 */

import { existsSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

import { E2A_TARGETS } from "./e2a.ts";
import { buildE2a2, OPTIMISE_SKILL_V2, STRATEGIES_V2 } from "./e2a2.ts";
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

  it("expects 5 map workers plus a reduce worker, all sonnet-5", () => {
    for (const e of entries) {
      expect(e.expected).toMatchObject({
        workerSpawns: STRATEGIES_V2.length,
        reduceSpawns: 1,
        subagentType: WORKER_AGENT,
      });
    }
  });
});

describe("optimise.mdz v2", () => {
  it("is valid canonical MDZ", () => {
    expect(validateMdz(OPTIMISE_SKILL_V2).ok).toBe(true);
  });

  it("moves code by file-backed paths and pins workers", () => {
    expect(OPTIMISE_SKILL_V2).toContain("@(./base)");
    expect(OPTIMISE_SKILL_V2).toContain("@(./fastest)");
    expect(OPTIMISE_SKILL_V2).toContain(`map-worker: ${WORKER_AGENT}`);
    expect(OPTIMISE_SKILL_V2).toContain(`reduce-worker: ${WORKER_AGENT}`);
    for (const s of STRATEGIES_V2) expect(OPTIMISE_SKILL_V2).toContain(s);
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
});
