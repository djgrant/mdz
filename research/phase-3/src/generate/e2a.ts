/**
 * E2a — optimise under objective selection.
 *
 * Two slow-but-correct target repos (a TypeScript ledger reporter and a
 * Python log analyser) each ship with a pinned test suite and a benchmark
 * that prints BENCH_MS. Two content-matched commands drive the optimisation:
 * /optimise is an MDZ consumer skill fanning five strategy workers out
 * through skills/map-reduce.mdz; /optimise-goal states the SAME five
 * strategies and the same explore-then-select plan as prose. The harness
 * re-runs tests and benchmark afterwards; model-reported numbers are never
 * trusted (see ../score/e2a-score.ts).
 *
 * Targets are committed fixtures under fixtures/e2a/<target>/ — the source
 * of truth — and are copied verbatim into programs/ and the sandbox map.
 *
 * 2 targets x 2 variants = 4 manifest entries.
 */

import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { assertValid, rel, writeJson, writeText, type ManifestEntry } from "./shared.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = join(HERE, "fixtures", "e2a");

/** repo root (four levels up from phase-3/src/generate/). */
const REPO_ROOT = resolve(HERE, "..", "..", "..", "..");
const MAP_REDUCE_PATH = join(REPO_ROOT, "examples", "skills", "map-reduce.mdz");

// ---------------------------------------------------------------------------
// The five strategy hints — identical, verbatim, in both command variants.
// Each corresponds to real, measured headroom in both targets.
// ---------------------------------------------------------------------------

export const STRATEGIES = [
  "Reduce algorithmic complexity: replace nested scans over the same data with a single pass that builds a lookup table.",
  "Cache repeated work: memoise pure functions that are called many times with the same few arguments.",
  "Pick better data structures: replace linear membership checks against a list or array with a hash-based set.",
  "Batch the I/O: replace many small reads or writes with one buffered operation.",
  "Hoist loop-invariant work: precompute anything inside a hot loop that does not change between iterations.",
] as const;

// ---------------------------------------------------------------------------
// Targets
// ---------------------------------------------------------------------------

export interface E2aTarget {
  name: string;
  /** file the candidates must replace */
  targetFile: string;
  /** every fixture file copied into the sandbox */
  files: string[];
  testCommand: string;
  benchCommand: string;
}

export const E2A_TARGETS: E2aTarget[] = [
  {
    name: "ledger",
    targetFile: "ledger.ts",
    files: ["ledger.ts", "ledger.test.ts", "bench.ts"],
    testCommand: "node ledger.test.ts",
    benchCommand: "node bench.ts",
  },
  {
    name: "logscan",
    targetFile: "logscan.py",
    files: ["logscan.py", "test_logscan.py", "bench.py"],
    testCommand: "python3 test_logscan.py",
    benchCommand: "python3 bench.py",
  },
];

// ---------------------------------------------------------------------------
// Commands (content-matched pair per target)
// ---------------------------------------------------------------------------

function framing(t: E2aTarget): string {
  return `Make ./${t.targetFile} faster without changing its observable behaviour.
The tests (${t.testCommand}) must stay green; the benchmark (${t.benchCommand})
prints its result as a line of the form BENCH_MS: <number>.`;
}

function strategiesLiteral(): string {
  return `[${STRATEGIES.map((s) => JSON.stringify(s)).join(", ")}]`;
}

function mapInstruction(t: E2aTarget): string {
  return (
    `Read ${t.files.join(", ")} in the current working directory. ` +
    `Produce a faster ${t.targetFile} by applying exactly one optimisation strategy: {$item}. ` +
    `Keep every exported name and all observable behaviour identical, ` +
    `run ${t.testCommand} to confirm the tests still pass, ` +
    `then write your complete candidate file to candidates/<short-strategy-slug>/${t.targetFile} and reply with that path.`
  );
}

function reduceInstruction(t: E2aTarget): string {
  return (
    `For each candidate path, copy the candidate over ${t.targetFile}, ` +
    `run ${t.testCommand} and then ${t.benchCommand}, and note its BENCH_MS. ` +
    `Leave the fastest candidate that passes the tests in place as ${t.targetFile} ` +
    `(restore the original if none passes) and report the winning strategy and its BENCH_MS.`
  );
}

function mdzCommand(t: E2aTarget): string {
  return `---
name: optimise
---

# Optimise the program

${framing(t)}

$strategies = ${strategiesLiteral()}

USE ~/skills/map-reduce WITH
  worker: general
  items: $strategies
  map: ${mapInstruction(t)}
  reduce: ${reduceInstruction(t)}
`;
}

function goalCommand(t: E2aTarget): string {
  const bullets = STRATEGIES.map((s) => `- ${s}`).join("\n");
  return `# Optimise the program

${framing(t)}

Explore five optimisation strategies, then select the best. The strategies:

${bullets}

Produce a separate candidate version of ${t.targetFile} for each strategy, each a
complete file under candidates/, applying exactly one strategy per candidate and
keeping every exported name and all observable behaviour identical. Then, for
each candidate in turn, copy it over ${t.targetFile}, run ${t.testCommand} and
then ${t.benchCommand}, and note its BENCH_MS. Leave the fastest candidate that
passes the tests in place as ${t.targetFile} (restore the original if none
passes) and report the winning strategy and its BENCH_MS.
`;
}

// ---------------------------------------------------------------------------
// Prompts
// ---------------------------------------------------------------------------

function mdzPrompt(command: string): string {
  return `You are an MDZ executor. MDZ is a simple imperative notation for
procedures. Execute the root program below EXACTLY as written, step by step.
Do not optimise, summarise, skip, or "improve" the program.

You are running agentically in a working directory that contains the target
program, its tests, its benchmark, and the skill files the program references
(for example ./skills/map-reduce.mdz). Read a skill file to resolve any USE
target before executing it.

Execution rules:
- Every SPAWN statement MUST be performed as a real Task tool call: exactly
  one Task call per spawned worker, one worker per item.
- Each worker's Task prompt must contain the full WITH payload for its item:
  the map instruction verbatim, and the item text verbatim.
- Do not simulate, merge, or skip spawns, and do not answer on a worker's
  behalf yourself.
- After all workers return, apply the reduce step to their outputs.

When finished, print the winning strategy and the final BENCH_MS as your answer.

Root program (also available as ./commands/optimise.mdz):
--- BEGIN PROGRAM ---
${command}
--- END PROGRAM ---`;
}

function goalPrompt(command: string): string {
  return `You are a software agent running agentically in a working directory
that contains a target program, its tests, and its benchmark. Follow the
command below exactly.

When finished, print the winning strategy and the final BENCH_MS as your answer.

Command (also available as ./commands/optimise-goal.md):
--- BEGIN COMMAND ---
${command}
--- END COMMAND ---`;
}

// ---------------------------------------------------------------------------
// Build
// ---------------------------------------------------------------------------

const ALLOWED_TOOLS = ["Task", "Bash", "Read", "Write", "Edit", "Glob", "Grep"];

export function buildE2a(outDir: string): ManifestEntry[] {
  const dir = join(outDir, "e2a");
  const mapReduceSkill = readFileSync(MAP_REDUCE_PATH, "utf8");
  assertValid(mapReduceSkill, "e2a skills/map-reduce.mdz");

  const entries: ManifestEntry[] = [];
  for (const target of E2A_TARGETS) {
    const targetFiles: Record<string, string> = {};
    for (const f of target.files) {
      targetFiles[f] = readFileSync(join(FIXTURES_DIR, target.name, f), "utf8");
    }

    for (const form of ["mdz", "goal"] as const) {
      const folder = join(dir, `${target.name}-${form}`);
      const commandRel =
        form === "mdz" ? "commands/optimise.mdz" : "commands/optimise-goal.md";
      const command = form === "mdz" ? mdzCommand(target) : goalCommand(target);
      if (form === "mdz") assertValid(command, `e2a ${target.name} optimise.mdz`);

      const sandbox: Record<string, string> = {
        ...targetFiles,
        [commandRel]: command,
      };
      if (form === "mdz") sandbox["skills/map-reduce.mdz"] = mapReduceSkill;

      for (const [relPath, content] of Object.entries(sandbox)) {
        writeText(join(folder, relPath), content);
      }

      entries.push({
        id: `e2a-${target.name}-${form}`,
        experiment: "e2a",
        runMode: "agentic",
        programPath: rel(join(folder, commandRel)),
        tracePath: null,
        prompt: form === "mdz" ? mdzPrompt(command) : goalPrompt(command),
        variant: { target: target.name, form, strategies: STRATEGIES.length },
        expected: {
          spawnCount: STRATEGIES.length,
          strategies: [...STRATEGIES],
          targetFile: target.targetFile,
          testCommand: target.testCommand,
          benchCommand: target.benchCommand,
        },
        sandbox,
        allowedTools: ALLOWED_TOOLS,
      });
    }
  }

  writeJson(join(dir, "manifest.json"), entries);
  return entries;
}
