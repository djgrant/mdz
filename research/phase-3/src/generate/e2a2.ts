/**
 * E2a2 — mdz-ralph (the ralph loop written as an MDZ skill).
 *
 * The v1 finding was that the e2a skill lost by construction: a single
 * fan-out with a pick-one reduce cannot compound independent fixes, and the
 * targets' speedups are a product of five of them. So the second-run arm
 * replaces the shape rather than tuning it: a generic `ralph` skill (WHILE
 * loop spawning fresh workers on the whole goal) plus an `optimise` caller
 * that is content-matched to the v1 prompt-ralph command — same five
 * strategy bullets verbatim, same 3-round budget, same self-verify
 * discipline. The pair under test is prompt-ralph (loop in the harness) vs
 * mdz-ralph (loop in the orchestrator).
 *
 * 2 targets x 1 arm (skill) x 3 orchestrator models = 6 manifest entries.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { E2A_TARGETS, PASSES, STRATEGIES, type E2aTarget } from "./e2a.ts";
import { ORCHESTRATOR_MODELS, WORKER_AGENT } from "./e2b2.ts";
import { assertValid, rel, writeJson, writeText, type ManifestEntry } from "./shared.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = join(HERE, "fixtures", "e2a");

// ---------------------------------------------------------------------------
// The generic ralph skill
// ---------------------------------------------------------------------------

export const RALPH_SKILL = `---
name: ralph
input: $task, $worker, $max-rounds
---

$round = 0

WHILE $round < $max-rounds
  SPAWN $worker
  WITH
    instruction: $task
  $round = $round + 1
END

RETURN $round
`;

// ---------------------------------------------------------------------------
// The optimise caller — content-matched to the v1 prompt-ralph command.
// ---------------------------------------------------------------------------

export const OPTIMISE_SKILL_V2 = `---
name: optimise
input: $file, $tests, $bench
---

$strategies = [
  "${STRATEGIES[0]}",
  "${STRATEGIES[1]}",
  "${STRATEGIES[2]}",
  "${STRATEGIES[3]}",
  "${STRATEGIES[4]}"
]

USE ~/skills/ralph
WITH
  task: Make $file faster without changing its observable behaviour. The tests ($tests) must stay green; the benchmark ($bench) prints its result as a line of the form BENCH_MS: <number>. Strategies worth applying: $strategies. Edit $file in place, keeping every exported name and all observable behaviour identical. Run $tests to confirm the tests still pass, then run $bench and report the final BENCH_MS.
  worker: ${WORKER_AGENT}
  max-rounds: ${PASSES}

RETURN the final BENCH_MS
`;

// ---------------------------------------------------------------------------
// Prompt — fed to the orchestrator directly, NEVER written into the sandbox:
// a prompt on disk is visible to spawned workers, and the opus smoke showed a
// worker invoking it and reading the MDZ-executor role as prompt injection.
// ---------------------------------------------------------------------------

function optimisePrompt(t: E2aTarget): string {
  return `You are an MDZ executor.

MDZ syntax:
- \`$var\` holds a value. \`$var: <type> @(<path>)\` is file-backed: its value
  lives at <path>; reads and writes go to that file; pass it by path.
- \`USE ~/skills/<name>\` executes ./skills/<name>.mdz with the WITH params.
- \`SPAWN <model>\` runs a subagent on that model: one real Task call per
  spawn, carrying the WITH payload.

PRAGMA STRICT

USE ~/skills/optimise
WITH
  file: ./${t.targetFile}
  tests: ${t.testCommand}
  bench: ${t.benchCommand}
`;
}

// ---------------------------------------------------------------------------
// Build
// ---------------------------------------------------------------------------

export function buildE2a2(outDir: string): ManifestEntry[] {
  const dir = join(outDir, "e2a2");
  assertValid(RALPH_SKILL, "e2a2 skills/ralph.mdz");
  assertValid(OPTIMISE_SKILL_V2, "e2a2 skills/optimise.mdz");

  const entries: ManifestEntry[] = [];

  for (const target of E2A_TARGETS) {
    const targetFiles: Record<string, string> = {};
    for (const f of target.files) {
      targetFiles[f] = readFileSync(join(FIXTURES_DIR, target.name, f), "utf8");
    }

    for (const model of ORCHESTRATOR_MODELS) {
      const folder = join(dir, `${target.name}-${model}`);
      const sandbox: Record<string, string> = {
        ...targetFiles,
        "skills/optimise.mdz": OPTIMISE_SKILL_V2,
        "skills/ralph.mdz": RALPH_SKILL,
      };
      for (const [relPath, content] of Object.entries(sandbox)) {
        writeText(join(folder, relPath), content);
      }

      entries.push({
        id: `e2a2-${target.name}-${model}`,
        experiment: "e2a2",
        runMode: "agentic",
        programPath: rel(join(folder, "skills/optimise.mdz")),
        tracePath: null,
        prompt: optimisePrompt(target),
        variant: {
          target: target.name,
          arm: "skill",
          orchestrator: model,
          rounds: PASSES,
        },
        expected: {
          strategies: [...STRATEGIES],
          targetFile: target.targetFile,
          testCommand: target.testCommand,
          benchCommand: target.benchCommand,
          workerSpawns: PASSES,
          subagentType: WORKER_AGENT,
        },
        sandbox,
        allowedTools: ["Task", "Bash", "Read", "Write", "Edit", "Glob", "Grep"],
        // 3 sequential whole-goal workers over real repos; same headroom as
        // the e2b2 pipelines.
        timeoutMs: 2400 * 1000,
        model,
      });
    }
  }

  writeJson(join(dir, "manifest.json"), entries);
  return entries;
}
