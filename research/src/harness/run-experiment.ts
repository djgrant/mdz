/**
 * Experiment runner CLI.
 *
 * Usage:
 *   tsx src/harness/run-experiment.ts --experiment q2 \
 *       --models haiku,gpt-5.4-mini --n 5 --max-calls 100 \
 *       [--concurrency 4] [--dry-run]
 *
 * Reads programs/<exp>/manifest.json (DESIGN.md shape), executes each program
 * with each model n times, scores each run, and APPENDS JSONL records to
 * results/<exp>.jsonl. Resumable: ids already recorded with no error are
 * skipped. --max-calls guards spend.
 *
 * Only node builtins + sibling harness modules are imported.
 */

import { appendFile, mkdir, readdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { buildPrompt, type PromptVariant } from "./prompt.js";
import { runClaude, runCodex, type RunResult } from "./runners.js";
import {
  classifyMalformed,
  extractTrace,
  scoreTrace,
  type Scores,
  type Step,
} from "./score.js";

// ---------------------------------------------------------------------------
// Paths (benchmark/ root is two levels up from src/harness/)
// ---------------------------------------------------------------------------

const HERE = dirname(fileURLToPath(import.meta.url));
const BENCH_ROOT = resolve(HERE, "..", "..");
const PHASE = process.argv.includes("--phase")
  ? process.argv[process.argv.indexOf("--phase") + 1]
  : "phase-1";
const PHASE_ROOT = resolve(BENCH_ROOT, PHASE);

// ---------------------------------------------------------------------------
// Manifest + record types
// ---------------------------------------------------------------------------

interface ManifestEntry {
  programPath: string; // relative to benchmark root
  tracePath: string; // relative to benchmark root; reference trace JSON
  variant: Record<string, unknown>; // free-form descriptor (notation, size, ...)
  seed: number;
  arm?: string; // q3/q5: "A" | "B"; picks the prompt variant
  goal?: string; // q3 arm B: natural-language goal
  malformed?: boolean; // q1: measure halt/repair/improvise
  paramFidelity?: boolean; // q4: also score call args
}

type Manifest = ManifestEntry[];

interface ResultRecord {
  id: string;
  experiment: string;
  programPath: string;
  variant: Record<string, unknown>;
  provider: "claude" | "codex";
  model: string;
  promptTokens: number;
  completionTokens: number;
  costUsd: number | null;
  startedAt: string;
  durationMs: number;
  rawOutput: string;
  parsedTrace: Step[] | null;
  parseError: string | null;
  scores: Scores | null;
  malformedBehaviour?: string;
  error: string | null;
}

// ---------------------------------------------------------------------------
// Model / provider mapping
// ---------------------------------------------------------------------------

const CLAUDE_ALIASES: Record<string, string> = {
  haiku: "haiku",
  sonnet: "sonnet",
  opus: "opus",
};

interface ProviderModel {
  provider: "claude" | "codex";
  /** value passed to the CLI --model flag */
  cliModel: string;
  /** short name recorded in results */
  name: string;
}

function resolveModel(name: string): ProviderModel {
  if (name in CLAUDE_ALIASES) {
    return { provider: "claude", cliModel: CLAUDE_ALIASES[name], name };
  }
  if (name === "gpt-5.4-mini" || name === "gpt-5.5") {
    return { provider: "codex", cliModel: name, name };
  }
  throw new Error(`unknown model: ${name}`);
}

// ---------------------------------------------------------------------------
// CLI arg parsing
// ---------------------------------------------------------------------------

interface Args {
  experiment: string;
  models: string[];
  n: number;
  maxCalls: number;
  concurrency: number;
  dryRun: boolean;
  timeoutMs: number;
  filter: string | null;
}

function parseArgs(argv: string[]): Args {
  const map = new Map<string, string>();
  const flags = new Set<string>();
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith("--")) {
        flags.add(key);
      } else {
        map.set(key, next);
        i++;
      }
    }
  }
  const experiment = map.get("experiment");
  const models = map.get("models");
  if (!experiment) throw new Error("--experiment is required");
  if (!models) throw new Error("--models is required (comma-separated)");

  return {
    experiment,
    models: models.split(",").map((s) => s.trim()).filter(Boolean),
    n: map.has("n") ? parseInt(map.get("n")!, 10) : 5,
    maxCalls: map.has("max-calls") ? parseInt(map.get("max-calls")!, 10) : Infinity,
    concurrency: map.has("concurrency") ? parseInt(map.get("concurrency")!, 10) : 1,
    dryRun: flags.has("dry-run"),
    filter: map.get("filter") ?? null,
    timeoutMs: map.has("timeout")
      ? parseInt(map.get("timeout")!, 10) * 1000
      : 5 * 60 * 1000,
  };
}

// ---------------------------------------------------------------------------
// Run id
// ---------------------------------------------------------------------------

/** e.g. programs/q2/stmt050-seed3.mdz -> "stmt050-seed3". */
function programStem(programPath: string): string {
  const parts = programPath.split("/");
  const base = (parts.pop() ?? programPath).replace(/\.[^.]+$/, "");
  // Module-tree programs live in a directory: programs/q4/depth1-seed1/root.mdz
  if (base === "root" && parts.length > 0) return parts[parts.length - 1];
  return base;
}

function runId(exp: string, entry: ManifestEntry, model: string, r: number): string {
  const stem = programStem(entry.programPath);
  const arm = entry.arm ? `-${entry.arm}` : "";
  return `${exp}-${stem}${arm}-${model}-r${r}`;
}

// ---------------------------------------------------------------------------
// Variant selection from arm
// ---------------------------------------------------------------------------

function promptVariantFor(entry: ManifestEntry): PromptVariant {
  // q3 arm B: goal-only. q5 arm B: ledger. Everything else: standard.
  const arm = entry.arm ?? "";
  if (arm.includes("goal") || (arm.startsWith("B") && entry.goal != null)) return "goal";
  if (arm.includes("ledger") || arm === "B") return "ledger";
  return "standard";
}

// ---------------------------------------------------------------------------
// Existing results (for resume)
// ---------------------------------------------------------------------------

async function loadDoneIds(resultsPath: string): Promise<Set<string>> {
  const done = new Set<string>();
  if (!existsSync(resultsPath)) return done;
  const text = await readFile(resultsPath, "utf8");
  for (const line of text.split("\n")) {
    const t = line.trim();
    if (!t) continue;
    try {
      const rec = JSON.parse(t) as ResultRecord;
      // Only treat as done if it completed without a run-level error.
      if (rec.id && !rec.error) done.add(rec.id);
    } catch {
      /* skip corrupt line */
    }
  }
  return done;
}

// ---------------------------------------------------------------------------
// One run
// ---------------------------------------------------------------------------

interface Job {
  entry: ManifestEntry;
  model: ProviderModel;
  r: number;
  id: string;
}

async function executeJob(
  exp: string,
  job: Job,
  timeoutMs: number,
): Promise<ResultRecord> {
  const { entry, model } = job;

  const programAbs = join(PHASE_ROOT, entry.programPath);
  let program = "";
  try {
    program = await readFile(programAbs, "utf8");
    // Module-tree programs: bundle sibling skill modules into the prompt so the
    // model can execute across USE/SPAWN boundaries.
    const skillsDir = join(dirname(programAbs), "skills");
    if (existsSync(skillsDir)) {
      const files = (await readdir(skillsDir)).filter((f) => f.endsWith(".mdz")).sort();
      for (const f of files) {
        const body = await readFile(join(skillsDir, f), "utf8");
        program += `\n\n<!-- module: ~/skills/${f.replace(/\.mdz$/, "")} -->\n\n${body}`;
      }
    }
  } catch (e) {
    return errorRecord(exp, job, `cannot read program: ${(e as Error).message}`);
  }

  const variant = promptVariantFor(entry);
  const prompt = buildPrompt({
    program,
    variant,
    goal: entry.goal,
    malformed: entry.malformed ?? (entry.variant as { malformed?: boolean } | undefined)?.malformed,
  });

  const startedAt = new Date().toISOString();
  let run: RunResult;
  if (model.provider === "claude") {
    run = await runClaude(prompt, model.cliModel, { timeoutMs });
  } else {
    run = await runCodex(prompt, model.cliModel, { timeoutMs });
  }

  // Load reference trace (skip for goal-only arm which has no trace).
  let ref: Step[] | null = null;
  if (variant !== "goal" && entry.tracePath) {
    try {
      const refText = await readFile(join(PHASE_ROOT, entry.tracePath), "utf8");
      const parsed = JSON.parse(refText);
      ref = Array.isArray(parsed) ? (parsed as Step[]) : (parsed.trace ?? null);
    } catch {
      ref = null;
    }
  }

  const parsedTrace = variant === "goal" ? null : extractTrace(run.rawOutput);
  let scores: Scores | null = null;
  let parseError: string | null = null;
  let malformedBehaviour: string | undefined;

  if (variant !== "goal") {
    if (!parsedTrace) {
      parseError = "no trace found in model output";
    } else if (ref) {
      scores = scoreTrace(parsedTrace, ref, {
        paramFidelity:
          entry.paramFidelity ?? ref.some((s) => (s as { action?: string }).action === "call"),
      });
    } else {
      parseError = parseError ?? "reference trace missing";
    }
    if (entry.malformed ?? (entry.variant as { malformed?: boolean } | undefined)?.malformed) {
      malformedBehaviour = classifyMalformed(run.rawOutput, parsedTrace, ref);
    }
  }

  return {
    id: job.id,
    experiment: exp,
    programPath: entry.programPath,
    variant: entry.variant,
    provider: model.provider,
    model: model.name,
    promptTokens: run.promptTokens,
    completionTokens: run.completionTokens,
    costUsd: run.costUsd,
    startedAt,
    durationMs: run.durationMs,
    rawOutput: run.rawOutput,
    parsedTrace,
    parseError,
    scores,
    ...(malformedBehaviour ? { malformedBehaviour } : {}),
    error: run.error,
  };
}

function errorRecord(exp: string, job: Job, error: string): ResultRecord {
  return {
    id: job.id,
    experiment: exp,
    programPath: job.entry.programPath,
    variant: job.entry.variant,
    provider: job.model.provider,
    model: job.model.name,
    promptTokens: 0,
    completionTokens: 0,
    costUsd: null,
    startedAt: new Date().toISOString(),
    durationMs: 0,
    rawOutput: "",
    parsedTrace: null,
    parseError: null,
    scores: null,
    error,
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const exp = args.experiment;

  const manifestPath = join(PHASE_ROOT, "programs", exp, "manifest.json");
  if (!existsSync(manifestPath)) {
    console.error(`manifest not found: ${manifestPath}`);
    process.exit(1);
  }
  const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as Manifest;

  const models = args.models.map(resolveModel);

  const resultsPath = join(PHASE_ROOT, "results", `${exp}.jsonl`);
  await mkdir(dirname(resultsPath), { recursive: true });
  const done = await loadDoneIds(resultsPath);

  // Build the full job list.
  const jobs: Job[] = [];
  for (const entry of manifest) {
    if (args.filter && !programStem(entry.programPath).includes(args.filter)) continue;
    for (const model of models) {
      for (let r = 1; r <= args.n; r++) {
        const id = runId(exp, entry, model.name, r);
        if (done.has(id)) continue;
        jobs.push({ entry, model, r, id });
      }
    }
  }

  const total = jobs.length;
  console.error(
    `[${exp}] ${manifest.length} programs x ${models.length} models x n=${args.n}: ` +
      `${total} runs pending (${done.size} already done), max-calls=${args.maxCalls}` +
      (args.dryRun ? " [DRY RUN]" : ""),
  );

  if (args.dryRun) {
    for (const j of jobs) console.error(`  would run: ${j.id}`);
    return;
  }

  let calls = 0;
  let completed = 0;
  let index = 0;

  async function worker(): Promise<void> {
    for (;;) {
      const i = index++;
      if (i >= jobs.length) return;
      if (calls >= args.maxCalls) return;
      calls++;
      const job = jobs[i];

      const rec = await executeJob(exp, job, args.timeoutMs);
      await appendFile(resultsPath, JSON.stringify(rec) + "\n");
      completed++;

      const s = rec.scores;
      const scoreStr = s
        ? `exact=${s.exact} stepAcc=${s.stepAccuracy.toFixed(2)} firstDiv=${s.firstDivergence}`
        : rec.parseError
          ? `parseError=${rec.parseError}`
          : rec.error
            ? `ERROR=${rec.error}`
            : rec.malformedBehaviour
              ? `behaviour=${rec.malformedBehaviour}`
              : "goal-only";
      console.error(
        `[${completed}/${total}] ${rec.id} ${scoreStr} ` +
          `tok=${rec.promptTokens}/${rec.completionTokens} ` +
          `${rec.costUsd != null ? `$${rec.costUsd.toFixed(4)} ` : ""}${rec.durationMs}ms`,
      );
    }
  }

  const workers = Array.from(
    { length: Math.max(1, Math.min(args.concurrency, jobs.length)) },
    () => worker(),
  );
  await Promise.all(workers);

  if (calls >= args.maxCalls && index < jobs.length) {
    console.error(
      `hit --max-calls=${args.maxCalls}; ${jobs.length - index} runs left. Re-run to resume.`,
    );
  }
  console.error(`done: ${completed} runs appended to ${resultsPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
