/**
 * Tests for the E2c generator: arms x models, prompt-not-in-sandbox
 * discipline, the rewrite skill's two-loop structure, and requirements
 * anchors.
 */

import { existsSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

import { PASSES } from "./e2a.ts";
import { buildE2c, countParagraphs, REQUIREMENTS, REWRITE_SKILL } from "./e2c.ts";
import { ORCHESTRATOR_MODELS, WORKER_AGENT } from "./e2b2.ts";
import { PHASE_ROOT, PROGRAMS_DIR, type ManifestEntry } from "./shared.ts";
import { validateMdz } from "../../../src/interpreter/validate.ts";

let entries: ManifestEntry[];

beforeAll(() => {
  entries = buildE2c(PROGRAMS_DIR);
});

function entry(id: string): ManifestEntry {
  const e = entries.find((x) => x.id === id);
  if (!e) throw new Error(`missing entry ${id}`);
  return e;
}

describe("manifest", () => {
  it("has 3 arms x 3 orchestrator models = 9 entries", () => {
    expect(entries.length).toBe(9);
    for (const e of entries) {
      expect(e.experiment).toBe("e2c");
      expect(e.runMode).toBe("agentic");
      expect(existsSync(join(PHASE_ROOT, e.programPath)), e.programPath).toBe(true);
    }
  });

  it("pins the orchestrator model per entry", () => {
    for (const form of ["goal", "ralph", "skill"] as const) {
      for (const model of ORCHESTRATOR_MODELS) {
        expect(entry(`e2c-${form}-${model}`).model).toBe(model);
      }
    }
  });

  it("ralph gets 3 harness passes; goal and skill get one", () => {
    for (const model of ORCHESTRATOR_MODELS) {
      expect(entry(`e2c-ralph-${model}`).passes).toBe(PASSES);
      expect(entry(`e2c-goal-${model}`).passes).toBeUndefined();
      expect(entry(`e2c-skill-${model}`).passes).toBeUndefined();
    }
  });

  it("expects one skeleton worker plus one per paragraph on the skill arm", () => {
    const paragraphs = (entries[0].expected as { paragraphs: number }).paragraphs;
    expect(paragraphs).toBeGreaterThan(10);
    for (const model of ORCHESTRATOR_MODELS) {
      expect(entry(`e2c-skill-${model}`).expected).toMatchObject({
        workerSpawns: 1 + paragraphs,
        subagentType: WORKER_AGENT,
      });
      expect(entry(`e2c-goal-${model}`).expected).toMatchObject({ workerSpawns: 0 });
    }
  });
});

describe("sandbox", () => {
  it("ships report + requirements everywhere, the skill only on the skill arm, no prompts", () => {
    for (const e of entries) {
      const keys = Object.keys(e.sandbox!);
      expect(keys).toContain("report.md");
      expect(keys).toContain("requirements.md");
      expect(keys.some((k) => k.startsWith(".claude/"))).toBe(false);
      const form = (e.variant as { form: string }).form;
      expect(keys.includes("skills/rewrite.mdz")).toBe(form === "skill");
    }
  });
});

describe("rewrite.mdz", () => {
  it("is valid canonical MDZ", () => {
    expect(validateMdz(REWRITE_SKILL).ok).toBe(true);
  });

  it("has the two loops: one skeleton spawn, one spawn per paragraph", () => {
    expect(REWRITE_SKILL).toContain("$skeleton = the headings and captions of $file");
    expect(REWRITE_SKILL).toContain("FOR $paragraph IN the paragraphs of $file");
    expect(REWRITE_SKILL.match(new RegExp(`SPAWN ${WORKER_AGENT}`, "g"))!.length).toBe(2);
  });

  it("filters requirements per spawn via section anchors that exist in the doc", () => {
    expect(REWRITE_SKILL).toContain("$requirements#skeleton-assessment");
    expect(REWRITE_SKILL).toContain("$requirements#paragraph-by-paragraph-assessment");
    expect(REQUIREMENTS).toContain("## Skeleton assessment");
    expect(REQUIREMENTS).toContain("## Paragraph-by-paragraph assessment");
  });
});

describe("countParagraphs", () => {
  it("counts blank-line blocks, excluding headings", () => {
    expect(countParagraphs("# h\n\npara one\n\n## h2\n\npara two\n")).toBe(2);
  });
});
