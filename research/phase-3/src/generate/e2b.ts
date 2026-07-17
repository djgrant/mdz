/**
 * E2b — simplify (compounding map-reduce, subjective selection).
 *
 * Two over-abstracted target modules, each simplified under two arms:
 *   skill — /simplify, an MDZ consumer skill that compounds map-reduce.mdz:
 *           three heuristics fan out per iteration, an inner reduce selects,
 *           the winner seeds the next iteration, and a spawned fresh-context
 *           judge picks the best iteration at the end
 *   goal  — /simplify-goal, the same heuristics and the same iterate-diverge-
 *           select plan as a prose slash command, no notation
 *
 * Content-matched: the three heuristic strings appear verbatim in both arms.
 * The prompt invokes the command on the target file; nothing else. Outcome
 * scoring (pairwise judge across arms) lives in ../score/e2b-judge.py and
 * ../score/e2b-score.ts, not in the run itself.
 *
 * 2 targets x 2 arms = 4 manifest entries.
 */

import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { assertValid, PHASE_ROOT, rel, writeJson, writeText, type ManifestEntry } from "./shared.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURES = join(HERE, "fixtures", "e2b");

/** The inner higher-order skill, copied verbatim from examples/. */
const MAP_REDUCE_PATH = resolve(PHASE_ROOT, "..", "..", "examples", "skills", "map-reduce.mdz");

export const ITERATIONS = 3;

export const HEURISTICS = [
  "make it more direct",
  "make it more obvious",
  "make it smaller",
] as const;

// ---------------------------------------------------------------------------
// The simplify skill (the DESIGN.md program)
// ---------------------------------------------------------------------------

export const SIMPLIFY_SKILL = `---
name: simplify
input: $file, $n
---

# Simplify

Iteratively simplify the code in $file without changing its behaviour: each
iteration diverges along three heuristics and selects, and a fresh-context
judge picks the best iteration at the end.

$heuristics = ["make it more direct", "make it more obvious", "make it smaller"]
$code = the contents of $file
$iterations = []

FOR $i IN [1 .. $n]
  $simplified = USE ~/skills/map-reduce
  WITH
    worker: general
    items: $heuristics
    map: Simplify this code, pushing in one direction: {$item}. Preserve the module's behaviour and public interface exactly; its test suite must still pass. Return the complete revised file, nothing else. Code: {$code}
    reduce: Pick the candidate that most improves the code, or merge two if they compose cleanly: simpler, clearer, behaviour unchanged. Return one file.
  Append $simplified to $iterations
  $code = $simplified
END

$winner = SPAWN general
WITH
  instruction: Compare these versions of the same module and return the best one: the simplest version that is still clear, complete, and behaviour-preserving. The winner need not be the last.
  iterations: $iterations

RETURN $winner
`;

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

const TEST_NOTE =
  "confirm the module's test suite still passes: npx tsx --test <the .test.ts file next to the module>";

/** /simplify — invoke the MDZ skill on the target file. */
const SIMPLIFY_COMMAND = `---
description: Simplify a module by executing the MDZ simplify skill
---

You are an MDZ executor. Execute the program in ./skills/simplify.mdz EXACTLY
as written, step by step, with:

- $file = $ARGUMENTS
- $n = ${ITERATIONS}

Execution rules:
- Resolve \`~/skills/<name>\` to ./skills/<name>.mdz in this working directory,
  and read the skill file to resolve any USE target before executing it.
- Every SPAWN MUST be performed as a real Task tool call: exactly one Task call
  per spawned worker, carrying the WITH payload for that worker verbatim. Do
  not simulate, merge, or skip spawns, and do not answer on a worker's behalf.
- Do not optimise, summarise, or "improve" the program.

When the program RETURNs, write the winning version back to $file and ${TEST_NOTE}.
`;

/** /simplify-goal — the same heuristics and plan as prose; no notation. */
const SIMPLIFY_GOAL_COMMAND = `---
description: Simplify a module by iterating, diverging, and selecting
---

Simplify the module at $ARGUMENTS without changing its behaviour or its public
interface.

Work in ${ITERATIONS} iterations. In each iteration, produce three candidate
simplifications of the current code, each pushing in one direction:
"make it more direct", "make it more obvious", "make it smaller".
Then pick the candidate that most improves the code, or merge two if they
compose cleanly — simpler, clearer, behaviour unchanged — and carry it into
the next iteration. Keep a copy of
each iteration's chosen version.

When all ${ITERATIONS} iterations are done, compare the kept versions with a
fresh perspective and pick the best one overall: the simplest version that is
still clear, complete, and behaviour-preserving.
The winner need not be the last — simplification can overshoot.

Write the winning version back to $ARGUMENTS and ${TEST_NOTE}.
`;

// ---------------------------------------------------------------------------
// Build
// ---------------------------------------------------------------------------

export interface E2bTarget {
  name: string;
  /** sandbox path of the module under simplification */
  moduleFile: string;
  /** sandbox path of its test suite */
  testFile: string;
}

export const E2B_TARGETS: E2bTarget[] = [
  { name: "pricing", moduleFile: "src/pricing.ts", testFile: "src/pricing.test.ts" },
  { name: "report", moduleFile: "src/report.ts", testFile: "src/report.test.ts" },
];

function fixture(target: string, file: string): string {
  return readFileSync(join(FIXTURES, target, file), "utf8");
}

export function buildE2b(outDir: string): ManifestEntry[] {
  const dir = join(outDir, "e2b");
  const mapReduceSkill = readFileSync(MAP_REDUCE_PATH, "utf8");
  assertValid(mapReduceSkill, "e2b skills/map-reduce.mdz");
  assertValid(SIMPLIFY_SKILL, "e2b skills/simplify.mdz");

  const entries: ManifestEntry[] = [];

  for (const target of E2B_TARGETS) {
    const moduleSource = fixture(target.name, `${target.name}.ts`);
    // In the sandbox the suite takes the conventional .test.ts name; in the
    // fixtures it is .check.ts so the repo's vitest glob does not collect it.
    const testSource = fixture(target.name, `${target.name}.check.ts`);
    const targetFiles: Record<string, string> = {
      [target.moduleFile]: moduleSource,
      [target.testFile]: testSource,
    };

    for (const arm of ["skill", "goal"] as const) {
      const folder = join(dir, `${target.name}-${arm}`);
      const command = arm === "skill" ? "/simplify" : "/simplify-goal";
      const commandFile =
        arm === "skill"
          ? ".claude/commands/simplify.md"
          : ".claude/commands/simplify-goal.md";

      const sandbox: Record<string, string> = {
        ...targetFiles,
        [commandFile]: arm === "skill" ? SIMPLIFY_COMMAND : SIMPLIFY_GOAL_COMMAND,
        ...(arm === "skill"
          ? {
              "skills/simplify.mdz": SIMPLIFY_SKILL,
              "skills/map-reduce.mdz": mapReduceSkill,
            }
          : {}),
      };
      for (const [relPath, content] of Object.entries(sandbox)) {
        writeText(join(folder, relPath), content);
      }

      const programPath = join(
        folder,
        arm === "skill" ? "skills/simplify.mdz" : commandFile,
      );

      entries.push({
        id: `e2b-${target.name}-${arm}`,
        experiment: "e2b",
        runMode: "agentic",
        programPath: rel(programPath),
        tracePath: null,
        prompt: `${command} ${target.moduleFile}`,
        variant: { target: target.name, arm, iterations: ITERATIONS },
        expected: {
          heuristics: [...HEURISTICS],
          iterations: ITERATIONS,
          targetFile: target.moduleFile,
          testFile: target.testFile,
          ...(arm === "skill"
            ? { workerSpawnsPerIteration: HEURISTICS.length, judgeSpawn: true }
            : {}),
        },
        sandbox,
        allowedTools: ["Task", "Read", "Write", "Edit", "Bash"],
      });
    }
  }

  writeJson(join(dir, "manifest.json"), entries);
  return entries;
}
