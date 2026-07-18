/**
 * E2c — rewrite (prose editing under explicit writing requirements).
 *
 * The e2a/e2b targets fall to a single whole-goal session, so those arms can
 * only measure compliance. E2c targets a task where decomposition is the
 * designed behaviour: rewriting the phase-1 report against a requirements
 * doc, one skeleton pass (headings and captions) plus one worker per
 * paragraph. Goal and ralph arms get the same requirements and the whole
 * document; only MDZ lets the author define the decomposition.
 *
 * Arms: goal (one session), ralph (3 whole-goal passes, loop in the
 * harness), skill (the rewrite.mdz program). Prompts are fed to the
 * orchestrator directly, never written into the sandbox; requirements.md is
 * task material and ships in the sandbox for every arm.
 *
 * 1 target x 3 arms x 3 orchestrator models = 9 manifest entries.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { PASSES } from "./e2a.ts";
import { ORCHESTRATOR_MODELS, WORKER_AGENT } from "./e2b2.ts";
import { assertValid, rel, writeJson, writeText, type ManifestEntry } from "./shared.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = join(HERE, "fixtures", "e2c");

// ---------------------------------------------------------------------------
// Requirements — given verbatim to every arm and to the judge.
// ---------------------------------------------------------------------------

export const REQUIREMENTS = `# Writing Requirements

## Skeleton assessment

Read the headings and captions alone:

- a reader scrolling will grasp the central story arc and findings
- every heading explains what the central finding
- every caption says what is being measured and which direction is good

## Inductive explanation

- establish facts first – do not reference them before the reader has been introduced properly
- build the reader's context brick by brick
- summarisation is a tool to tell someone what they've been told, never to be used before the content has been explored

## Flow

- try to keep paragraphs under 50 words – split rather than compact
- no filler: if deleting a sentence loses nothing, it goes
- continually ask yourself at each sentence: has the reader lost interest yet?
- lean on examples – code, tables, graphs

## Language

- do not coin jargon; if there is no well-known word for a concept, just explain the concept
- avoid using codenames for ideas – just explain the idea
- do not compress or summarise just to avoid repeating yourself
- could a half drunk colleague parse this sentence?
- no aphoristic phrases
`;

// ---------------------------------------------------------------------------
// The rewrite skill
// ---------------------------------------------------------------------------

export function rewriteSkill(worker: string): string {
  return `---
name: rewrite
input: $file, $requirements
---

SPAWN ${worker}
WITH
  instruction: Apply the following requirements to $file. $requirements#skeleton-assessment

SPAWN ${worker}
WITH
  instruction: Apply the following requirements to $file. $requirements#inductive-explanation $requirements#flow

SPAWN ${worker}
WITH
  instruction: Apply the following requirements to $file. $requirements#language

RETURN $file
`;
}

export const REWRITE_SKILL = rewriteSkill(WORKER_AGENT);

/** The opus-worker variant runs only under the opus orchestrator. */
export const OPUS_WORKER = "opus-4-8";

// ---------------------------------------------------------------------------
// Prompts — fed to the orchestrator directly, never written into the sandbox.
// ---------------------------------------------------------------------------

const GOAL_PROMPT = `Rewrite ./report.md in place so it satisfies every requirement in ./requirements.md. Preserve the report's factual claims and numbers exactly.`;

const RALPH_PROMPT = `Improve ./report.md in place against the requirements in ./requirements.md, in a single pass. Preserve the report's factual claims and numbers exactly.`;

const SKILL_PROMPT = `You are an MDZ executor.

MDZ syntax:
- \`$var\` holds a value. \`$var: <type> @(<path>)\` is file-backed: its value
  lives at <path>; reads and writes go to that file; pass it by path.
- \`USE ~/skills/<name>\` executes ./skills/<name>.mdz with the WITH params.
- \`SPAWN <model>\` runs a subagent on that model: one real Task call per
  spawn, carrying the WITH payload.
- \`DO <step>\` is a step you perform yourself.

PRAGMA STRICT

USE ~/skills/rewrite
WITH
  file: ./report.md
  requirements: ./requirements.md
`;

// ---------------------------------------------------------------------------
// Build
// ---------------------------------------------------------------------------

const ALLOWED_TOOLS = ["Task", "Bash", "Read", "Write", "Edit", "Glob", "Grep"];

/** Paragraph blocks in the fixture: blank-line-separated, headings excluded. */
export function countParagraphs(markdown: string): number {
  return markdown
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter((b) => b.length > 0 && !b.startsWith("#")).length;
}

export function buildE2c(outDir: string): ManifestEntry[] {
  const dir = join(outDir, "e2c");
  const report = readFileSync(join(FIXTURES_DIR, "report.md"), "utf8");
  assertValid(REWRITE_SKILL, "e2c skills/rewrite.mdz");
  const paragraphs = countParagraphs(report);

  const entries: ManifestEntry[] = [];

  // The skill arm also runs an all-opus cell: opus orchestrator, opus workers.
  const cells: Array<{ form: "goal" | "ralph" | "skill"; model: string; worker: string; id: string }> = [];
  for (const form of ["goal", "ralph", "skill"] as const) {
    for (const model of ORCHESTRATOR_MODELS) {
      cells.push({ form, model, worker: WORKER_AGENT, id: `e2c-${form}-${model}` });
    }
  }
  cells.push({ form: "skill", model: "opus", worker: OPUS_WORKER, id: "e2c-skill-opus-opus" });

  for (const { form, model, worker, id } of cells) {
    {
      const folder = join(dir, id.replace(/^e2c-/, ""));
      const sandbox: Record<string, string> = {
        "report.md": report,
        "requirements.md": REQUIREMENTS,
      };
      if (form === "skill") sandbox["skills/rewrite.mdz"] = rewriteSkill(worker);
      for (const [relPath, content] of Object.entries(sandbox)) {
        writeText(join(folder, relPath), content);
      }

      entries.push({
        id,
        experiment: "e2c",
        runMode: "agentic",
        programPath: rel(
          join(folder, form === "skill" ? "skills/rewrite.mdz" : "requirements.md"),
        ),
        tracePath: null,
        prompt: form === "goal" ? GOAL_PROMPT : form === "ralph" ? RALPH_PROMPT : SKILL_PROMPT,
        variant: {
          target: "phase-1-report",
          form,
          orchestrator: model,
          paragraphs,
          ...(form === "skill" ? { worker } : {}),
          ...(form === "ralph" ? { passes: PASSES } : {}),
        },
        expected: {
          targetFile: "report.md",
          requirementsFile: "requirements.md",
          paragraphs,
          // Skill arm: skeleton, structure/flow, and language passes.
          workerSpawns: form === "skill" ? 3 : 0,
          ...(form === "skill" ? { subagentType: worker } : {}),
        },
        sandbox,
        allowedTools: ALLOWED_TOOLS,
        // Prose workers are cheap but numerous; same headroom as e2b2.
        timeoutMs: 2400 * 1000,
        model,
        ...(form === "ralph" ? { passes: PASSES } : {}),
      });
    }
  }

  writeJson(join(dir, "manifest.json"), entries);
  return entries;
}
