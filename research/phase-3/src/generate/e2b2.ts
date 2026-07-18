/**
 * E2b2 — simplify v2 (file-backed variables, capable-worker split).
 *
 * A second-run mechanism-fix arm for E2b, motivated by the phase-3 findings
 * (RESEARCH-NOTES.md): the v1 skill relayed $code by value in prompts, so
 * behaviour drifted undetected between iterations; and sonnet orchestrators
 * defected from the program. v2 fixes both:
 *
 *   - file-backed variables: `$code: string @(./candidate.ts)` — assignments
 *     write the file, reads read it, and code travels between agents as file
 *     paths only, never inline in a prompt;
 *   - a capable-worker/varied-orchestrator split: every worker is spawned as
 *     `sonnet-5` (SPAWN <model> runs a subagent on that model), while the
 *     orchestrator model varies per entry (haiku, opus) via the manifest's
 *     `model` field.
 *
 * NOTE: content-parity discipline does not apply here — this is a mechanism-
 * fix arm, not a content-matched pair. The three heuristic strings are still
 * carried verbatim from E2b so mechanism extraction stays comparable.
 *
 * 2 targets x 1 arm (skill) x 3 orchestrator models = 6 manifest entries.
 */

import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { E2B_TARGETS, HEURISTICS, ITERATIONS } from "./e2b.ts";
import { assertValid, PHASE_ROOT, rel, writeJson, writeText, type ManifestEntry } from "./shared.ts";

const HERE = dirname(fileURLToPath(import.meta.url));

/** Fixtures are reused verbatim from E2b. */
const FIXTURES = join(HERE, "fixtures", "e2b");

/** The inner higher-order skill, copied verbatim from examples/. */
export const MAP_REDUCE_PATH = resolve(PHASE_ROOT, "..", "..", "examples", "skills", "map-reduce.mdz");

/** Orchestrator models, pinned per entry via the manifest `model` field. */
export const ORCHESTRATOR_MODELS = ["haiku", "sonnet", "opus"] as const;

/** Every worker spawn is addressed to this pinned agent definition. */
export const WORKER_AGENT = "sonnet-5";

// ---------------------------------------------------------------------------
// The simplify skill v2 (file-backed $code, sonnet-5 workers)
// ---------------------------------------------------------------------------

export const HEURISTICS_V2 = [
  "making it more direct",
  "making it more obvious",
  "making it smaller",
] as const;

export const SIMPLIFY_SKILL_V2 = `---
name: simplify
input: $file, $n
---

$heuristics = ["making it more direct", "making it more obvious", "making it smaller"]
$candidate: string @(./candidate.ts) = a copy of $file
$iterations = []

FOR $i IN [1 .. $n]
  $base: string @(./base-$i.ts) = a copy of $candidate
  $simplified: string @(./iterations-$i.ts) = USE ~/skills/map-reduce
  WITH
    items: $heuristics
    map: Simplify $base by $item. Preserve the module's behaviour and public interface exactly; its test suite must still pass.
    map-worker: ${WORKER_AGENT}
    reduce: Pick the candidate that most improves the code, or merge two if they compose cleanly: simpler, clearer, behaviour unchanged.
    reduce-worker: ${WORKER_AGENT}
  Append $simplified to $iterations
  $candidate = $simplified
END

$winner = SPAWN ${WORKER_AGENT}
WITH
  instruction: Compare these versions of the same module and return the best one: the simplest version that is still clear, complete, and behaviour-preserving. The winner need not be the last.
  iterations: $iterations

$file = $winner

RETURN $winner
`;

// ---------------------------------------------------------------------------
// Command
// ---------------------------------------------------------------------------

const SIMPLIFY_COMMAND_V2 = `You are an MDZ executor.

MDZ syntax:
- \`$var\` holds a value. \`$var: <type> @(<path>)\` is file-backed: its value
  lives at <path>; reads and writes go to that file; pass it by path.
- \`USE ~/skills/<name>\` executes ./skills/<name>.mdz with the WITH params.
- \`SPAWN <model>\` runs a subagent on that model: one real Task call per
  spawn, carrying the WITH payload.

PRAGMA STRICT

USE ~/skills/simplify
WITH
  file: $ARGUMENTS
  n: ${ITERATIONS}
`;

// ---------------------------------------------------------------------------
// Build
// ---------------------------------------------------------------------------

function fixture(target: string, file: string): string {
  return readFileSync(join(FIXTURES, target, file), "utf8");
}

export function buildE2b2(outDir: string): ManifestEntry[] {
  const dir = join(outDir, "e2b2");
  const mapReduceSkill = readFileSync(MAP_REDUCE_PATH, "utf8");
  assertValid(mapReduceSkill, "e2b2 skills/map-reduce.mdz");
  assertValid(SIMPLIFY_SKILL_V2, "e2b2 skills/simplify.mdz");

  const entries: ManifestEntry[] = [];

  for (const target of E2B_TARGETS) {
    const moduleSource = fixture(target.name, `${target.name}.ts`);
    // As in E2b: .check.ts in fixtures, conventional .test.ts in the sandbox.
    const testSource = fixture(target.name, `${target.name}.check.ts`);

    for (const model of ORCHESTRATOR_MODELS) {
      const folder = join(dir, `${target.name}-${model}`);
      const sandbox: Record<string, string> = {
        [target.moduleFile]: moduleSource,
        [target.testFile]: testSource,
        ".claude/commands/simplify.md": SIMPLIFY_COMMAND_V2,
        "skills/simplify.mdz": SIMPLIFY_SKILL_V2,
        "skills/map-reduce.mdz": mapReduceSkill,
      };
      for (const [relPath, content] of Object.entries(sandbox)) {
        writeText(join(folder, relPath), content);
      }

      entries.push({
        id: `e2b2-${target.name}-${model}`,
        experiment: "e2b2",
        runMode: "agentic",
        programPath: rel(join(folder, "skills/simplify.mdz")),
        tracePath: null,
        prompt: `/simplify ${target.moduleFile}`,
        variant: {
          target: target.name,
          arm: "skill",
          orchestrator: model,
          iterations: ITERATIONS,
        },
        expected: {
          heuristics: [...HEURISTICS_V2],
          targetFile: target.moduleFile,
          testFile: target.testFile,
          iterations: ITERATIONS,
          workerSpawnsPerIteration: HEURISTICS.length,
          reduceSpawnsPerIteration: 1,
          judgeSpawn: true,
          subagentType: WORKER_AGENT,
          candidateFile: "candidate.ts",
        },
        sandbox,
        allowedTools: ["Task", "Read", "Write", "Edit", "Bash", "Glob", "Grep"],
        // Same headroom as the E2b skill arm: a full pipeline is 9 map
        // workers + 3 reduce workers + a judge over a ~400-line module.
        timeoutMs: 2400 * 1000,
        // Pins the orchestrator; the harness drops the model suffix from the
        // record id because the entry id already encodes it.
        model,
      });
    }
  }

  writeJson(join(dir, "manifest.json"), entries);
  return entries;
}
