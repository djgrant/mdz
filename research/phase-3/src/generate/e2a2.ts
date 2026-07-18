/**
 * E2a2 — optimise v2 (file-backed variables, capable-worker split).
 *
 * The second-run mechanism-fix arm for E2a, mirroring e2b2: the optimise
 * program becomes a real skill invoked by USE from a terse slash command,
 * candidates move by file path (`@(<path>)`), every worker is spawned as
 * `sonnet-5`, and the orchestrator model varies per entry (haiku, opus) via
 * the manifest `model` field.
 *
 * NOTE: content-parity discipline does not apply here — this is a mechanism-
 * fix arm, not a content-matched pair. The five strategy hints carry over
 * from E2a with only a grammatical change (gerunds, so `faster by $item`
 * composes); comparisons against v1 arms are indicative only.
 *
 * 2 targets x 1 arm (skill) x 2 orchestrator models = 4 manifest entries.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { E2A_TARGETS, type E2aTarget } from "./e2a.ts";
import { MAP_REDUCE_PATH, ORCHESTRATOR_MODELS, WORKER_AGENT } from "./e2b2.ts";
import { assertValid, rel, writeJson, writeText, type ManifestEntry } from "./shared.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = join(HERE, "fixtures", "e2a");

export const STRATEGIES_V2 = [
  "reducing algorithmic complexity: replace nested scans over the same data with a single pass that builds a lookup table",
  "caching repeated work: memoise pure functions that are called many times with the same few arguments",
  "picking better data structures: replace linear membership checks against a list or array with a hash-based set",
  "batching the I/O: replace many small reads or writes with one buffered operation",
  "hoisting loop-invariant work: precompute anything inside a hot loop that does not change between iterations",
] as const;

// ---------------------------------------------------------------------------
// The optimise skill v2 — one generic program; targets bind via USE params.
// ---------------------------------------------------------------------------

export const OPTIMISE_SKILL_V2 = `---
name: optimise
input: $file, $tests, $bench
---

$strategies = [
  "${STRATEGIES_V2[0]}",
  "${STRATEGIES_V2[1]}",
  "${STRATEGIES_V2[2]}",
  "${STRATEGIES_V2[3]}",
  "${STRATEGIES_V2[4]}"
]

$base: string @(./base) = a copy of $file

$fastest: string @(./fastest) = USE ~/skills/map-reduce
WITH
  items: $strategies
  map: Make $base faster by $item. Preserve every exported name and all observable behaviour exactly; the test suite ($tests) must still pass.
  map-worker: ${WORKER_AGENT}
  reduce: Benchmark each candidate with $bench (it prints BENCH_MS) and pick the fastest one that passes $tests. If none passes, keep $base.
  reduce-worker: ${WORKER_AGENT}

$file = $fastest

RETURN the winning strategy and its BENCH_MS
`;

// ---------------------------------------------------------------------------
// Command
// ---------------------------------------------------------------------------

function optimiseCommand(t: E2aTarget): string {
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
  const mapReduceSkill = readFileSync(MAP_REDUCE_PATH, "utf8");
  assertValid(mapReduceSkill, "e2a2 skills/map-reduce.mdz");
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
        ".claude/commands/optimise.md": optimiseCommand(target),
        "skills/optimise.mdz": OPTIMISE_SKILL_V2,
        "skills/map-reduce.mdz": mapReduceSkill,
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
        prompt: "/optimise",
        variant: {
          target: target.name,
          arm: "skill",
          orchestrator: model,
          strategies: STRATEGIES_V2.length,
        },
        expected: {
          strategies: [...STRATEGIES_V2],
          targetFile: target.targetFile,
          testCommand: target.testCommand,
          benchCommand: target.benchCommand,
          workerSpawns: STRATEGIES_V2.length,
          reduceSpawns: 1,
          subagentType: WORKER_AGENT,
        },
        sandbox,
        allowedTools: ["Task", "Bash", "Read", "Write", "Edit", "Glob", "Grep"],
        // 5 map workers + a benchmarking reduce over real repos; same
        // headroom as the e2b2 pipelines.
        timeoutMs: 2400 * 1000,
        model,
      });
    }
  }

  writeJson(join(dir, "manifest.json"), entries);
  return entries;
}
