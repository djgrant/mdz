/**
 * E2a post-run scorer.
 *
 * Given the preserved sandbox directory of an optimisation run, re-run the
 * target's tests and benchmark IN THAT DIRECTORY — the model's own reported
 * numbers are never trusted — and re-measure the committed baseline fixture
 * on the same machine so the speedup is hardware-fair. Emits JSON:
 *   { testsPass, benchMs, baselineMs, speedup }
 *
 * Mechanism extraction: spawn count from the captured session transcript,
 * reusing the phase-2 transcript parser.
 *
 * Usage (from research/):
 *   npx tsx phase-3/src/score/e2a-score.ts \
 *       --sandbox <dir> --target ledger|logscan [--transcript <path>]
 */

import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { parseTranscript } from "../../../phase-2/src/harness/transcript.ts";
import { E2A_TARGETS, type E2aTarget } from "../generate/e2a.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = join(HERE, "..", "generate", "fixtures", "e2a");

const RUN_TIMEOUT_MS = 120_000;

export interface E2aScore {
  testsPass: boolean;
  benchMs: number | null;
  baselineMs: number | null;
  speedup: number | null;
}

export interface E2aMechanism {
  spawnCount: number;
}

function targetSpec(name: string): E2aTarget {
  const t = E2A_TARGETS.find((x) => x.name === name);
  if (!t) throw new Error(`unknown e2a target: ${name}`);
  return t;
}

function run(command: string, cwd: string): { ok: boolean; stdout: string } {
  const [bin, ...args] = command.split(" ");
  const res = spawnSync(bin, args, {
    cwd,
    encoding: "utf8",
    timeout: RUN_TIMEOUT_MS,
  });
  return {
    ok: res.status === 0 && !res.error,
    stdout: `${res.stdout ?? ""}\n${res.stderr ?? ""}`,
  };
}

export function parseBenchMs(output: string): number | null {
  const m = /^BENCH_MS:\s*(\d+)\s*$/m.exec(output);
  return m ? parseInt(m[1], 10) : null;
}

/** Re-run the committed baseline fixture in a scratch dir; returns BENCH_MS. */
export function measureBaseline(targetName: string): number | null {
  const t = targetSpec(targetName);
  const scratch = mkdtempSync(join(tmpdir(), "e2a-baseline-"));
  try {
    for (const f of t.files) {
      cpSync(join(FIXTURES_DIR, t.name, f), join(scratch, f));
    }
    const bench = run(t.benchCommand, scratch);
    return bench.ok ? parseBenchMs(bench.stdout) : null;
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

/** Re-run tests + benchmark in the run's sandbox; never trusts the model. */
export function scoreE2aSandbox(sandboxDir: string, targetName: string): E2aScore {
  const t = targetSpec(targetName);

  const tests = run(t.testCommand, sandboxDir);
  const testsPass = tests.ok;

  let benchMs: number | null = null;
  if (testsPass) {
    const bench = run(t.benchCommand, sandboxDir);
    if (bench.ok) benchMs = parseBenchMs(bench.stdout);
  }

  const baselineMs = measureBaseline(targetName);
  const speedup =
    benchMs != null && baselineMs != null && benchMs > 0
      ? baselineMs / benchMs
      : null;

  return { testsPass, benchMs, baselineMs, speedup };
}

/** Spawn count mined from a captured Claude Code session transcript. */
export function extractMechanism(transcriptText: string): E2aMechanism {
  const { spawns } = parseTranscript(transcriptText);
  return { spawnCount: spawns.length };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function main(): void {
  const argv = process.argv.slice(2);
  const opt = new Map<string, string>();
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith("--")) opt.set(argv[i].slice(2), argv[i + 1] ?? "");
  }
  const sandbox = opt.get("sandbox");
  const target = opt.get("target");
  if (!sandbox || !target) {
    console.error(
      "usage: e2a-score.ts --sandbox <dir> --target ledger|logscan [--transcript <path>]",
    );
    process.exit(1);
  }

  const score = scoreE2aSandbox(sandbox, target);
  const transcript = opt.get("transcript");
  const mechanism = transcript
    ? extractMechanism(readFileSync(transcript, "utf8"))
    : null;
  console.log(JSON.stringify({ ...score, mechanism }, null, 2));
}

const invokedDirectly =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;
if (invokedDirectly) main();
