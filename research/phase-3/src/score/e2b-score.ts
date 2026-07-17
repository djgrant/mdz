/**
 * E2b scorer: deterministic gate + mechanism metrics.
 *
 * Gate: the target's fixture test suite is re-run against the run's final
 * output file; a failing candidate loses regardless of the pairwise judge
 * (which lives in e2b-judge.py).
 *
 * Mechanism metrics, extracted from the captured Claude Code transcript via
 * the phase-2 harness parser (imported, not copied):
 *   - worker spawns and spawns per iteration (worker spawns are those whose
 *     prompt carries a heuristic string; grouped sequentially in threes)
 *   - presence of the terminal judge spawn (a non-worker spawn, after the
 *     last worker, asked to compare versions)
 *   - winner index, if recoverable from the run's final output text
 *
 * Usage (from research/):
 *   npx tsx phase-3/src/score/e2b-score.ts [results-jsonl]
 * Default results file: phase-3/results/e2b.jsonl. Records need `id`, and to
 * be scoreable: `transcriptPath` (relative to phase-3/ or absolute),
 * `outputPath` (the run's final copy of the target module), and optionally
 * `rawOutput`. Writes phase-3/results/e2b-scores.jsonl.
 */

import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";

import { parseTranscript, type Spawn } from "../../../phase-2/src/harness/transcript.ts";
import { HEURISTICS, ITERATIONS } from "../generate/e2b.ts";
import { writeText } from "../generate/shared.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const PHASE = resolve(HERE, "..", "..");
const FIXTURES = join(PHASE, "src", "generate", "fixtures", "e2b");

// ---------------------------------------------------------------------------
// Test gate
// ---------------------------------------------------------------------------

export interface TestGate {
  pass: boolean;
  output: string;
}

/**
 * Re-run the target's fixture test suite against a candidate module file.
 * The candidate is copied next to the fixture check file in a temp dir under
 * the module's canonical name, so the suite's `./<target>.ts` import hits it.
 */
export function runTargetTests(target: string, candidateModulePath: string): TestGate {
  const checkFile = join(FIXTURES, target, `${target}.check.ts`);
  if (!existsSync(checkFile)) throw new Error(`unknown e2b target: ${target}`);
  const tmp = mkdtempSync(join(tmpdir(), `e2b-${target}-`));
  try {
    cpSync(candidateModulePath, join(tmp, `${target}.ts`));
    cpSync(checkFile, join(tmp, `${target}.check.ts`));
    const proc = spawnSync("npx", ["tsx", "--test", join(tmp, `${target}.check.ts`)], {
      encoding: "utf8",
      timeout: 60_000,
    });
    const output = `${proc.stdout ?? ""}${proc.stderr ?? ""}`;
    return { pass: proc.status === 0, output };
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

// ---------------------------------------------------------------------------
// Mechanism metrics
// ---------------------------------------------------------------------------

export interface Mechanism {
  workerSpawns: number;
  /** worker spawns grouped sequentially into iterations of |heuristics| */
  spawnsPerIteration: number[];
  judgeSpawn: boolean;
  winnerIndex: number | null;
}

function isWorkerSpawn(spawn: Spawn): boolean {
  const prompt = spawn.prompt ?? "";
  return HEURISTICS.some((h) => prompt.includes(h));
}

function isJudgeSpawn(spawn: Spawn): boolean {
  const prompt = (spawn.prompt ?? "").toLowerCase();
  return (
    !isWorkerSpawn(spawn) &&
    /compar|winner|pick the best|best (one|version|iteration)/.test(prompt) &&
    /version|iteration|candidate/.test(prompt)
  );
}

export function extractMechanism(
  transcriptJsonl: string,
  rawOutput = "",
): Mechanism {
  const { spawns } = parseTranscript(transcriptJsonl);
  const workers = spawns.filter(isWorkerSpawn);

  const perIteration: number[] = [];
  for (let i = 0; i < Math.max(ITERATIONS, Math.ceil(workers.length / HEURISTICS.length)); i++) {
    const start = i * HEURISTICS.length;
    perIteration.push(Math.max(0, Math.min(workers.length - start, HEURISTICS.length)));
  }

  const lastWorkerIdx = spawns.reduce((acc, s, i) => (isWorkerSpawn(s) ? i : acc), -1);
  const judgeSpawn = spawns.slice(lastWorkerIdx + 1).some(isJudgeSpawn);

  return {
    workerSpawns: workers.length,
    spawnsPerIteration: perIteration,
    judgeSpawn,
    winnerIndex: extractWinnerIndex(rawOutput),
  };
}

/** Best-effort: find a stated winning iteration number in the output text. */
export function extractWinnerIndex(text: string): number | null {
  const patterns = [
    /winner[^.\n]{0,40}?iteration\s*#?(\d+)/i,
    /iteration\s*#?(\d+)[^.\n]{0,40}?(?:wins|is the winner|was selected|chosen)/i,
    /(?:selected|chose|picked)\s+iteration\s*#?(\d+)/i,
  ];
  for (const p of patterns) {
    const m = p.exec(text);
    if (m) {
      const n = Number(m[1]);
      if (Number.isInteger(n) && n >= 1 && n <= ITERATIONS) return n;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

interface RunRecord {
  id: string;
  transcriptPath?: string;
  outputPath?: string;
  rawOutput?: string;
  error?: unknown;
}

function phasePath(p: string): string {
  return isAbsolute(p) ? p : join(PHASE, p);
}

function targetOf(id: string): string | null {
  const m = /^e2b-([a-z0-9]+)-(?:skill|goal)/.exec(id);
  return m ? m[1] : null;
}

function main(): void {
  const resultsPath = phasePath(process.argv[2] ?? "results/e2b.jsonl");
  if (!existsSync(resultsPath)) {
    console.error(`no results file at ${resultsPath}`);
    process.exit(1);
  }
  const rows: string[] = [];
  for (const line of readFileSync(resultsPath, "utf8").split("\n")) {
    if (!line.trim()) continue;
    const rec = JSON.parse(line) as RunRecord;
    if (rec.error) continue;
    const target = targetOf(rec.id);
    if (!target) continue;

    const testsPass =
      rec.outputPath && existsSync(phasePath(rec.outputPath))
        ? runTargetTests(target, phasePath(rec.outputPath)).pass
        : null;
    const mechanism =
      rec.transcriptPath && existsSync(phasePath(rec.transcriptPath))
        ? extractMechanism(readFileSync(phasePath(rec.transcriptPath), "utf8"), rec.rawOutput ?? "")
        : null;

    const row = { id: rec.id, target, testsPass, ...mechanism };
    rows.push(JSON.stringify(row));
    console.log(JSON.stringify(row));
  }
  writeText(join(PHASE, "results", "e2b-scores.jsonl"), rows.join("\n") + "\n");
}

const invokedDirectly =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;
if (invokedDirectly) main();
