/**
 * Phase-3 model-execution harness (adapted from phase-2/src/harness/run.ts).
 *
 * Usage:
 *   npx tsx phase-3/src/harness/run.ts --exp e1 \
 *       --models haiku,sonnet --n 3 --max-calls 200 \
 *       [--only <id-substring>] [--dry-run]
 *
 * Reads phase-3/programs/<exp>/manifest.json (contract in
 * phase-3/src/generate/shared.ts), runs each entry with each requested model
 * n times, and APPENDS one JSONL record per run to
 * phase-3/results/<exp>.jsonl. NO scoring happens here — a separate scorer
 * consumes the records. Resumable by id; a global --max-calls guard aborts
 * over budget.
 *
 * Run modes:
 *   single-turn — prompt sent verbatim with all tools disabled.
 *                 claude models via `claude -p`, gpt-* via `codex exec`.
 *   agentic     — claude models only (gpt entries silently skipped); runs
 *                 `claude -p --output-format json` from a fresh sandbox cwd,
 *                 with the entry's allowedTools plus a mock MCP server:
 *                   mcp === "state" — the phase-2 key/value store
 *                   mcp === "ops"   — side-effect ops tools (E1); initial
 *                                     state loaded from the entry's mcpSeed
 *                                     (env OPS_SEED) so the pre-kill world is
 *                                     present before the session starts.
 *                 The session transcript is copied into results/transcripts/
 *                 and mined for spawns and tool calls; the mock server's call
 *                 log is captured on the record (stateLog / opsLog).
 *                 Entries with `passes > 1` (ralph loops) run that many fresh
 *                 sequential sessions with the same prompt in the same
 *                 sandbox; tokens/cost aggregate, spawns/toolCalls carry a
 *                 `pass` tag, and one record is emitted for the whole loop.
 */

import { spawn } from "node:child_process";
import { appendFile, copyFile, cp, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { runClaude, runCodex, type RunResult } from "../../../src/harness/runners.js";
import {
  collectDoneIds,
  findTranscript,
  loadManifest,
  parseTranscript,
  readCallLog,
  type ManifestEntry,
  type Spawn,
  type ToolCall,
} from "./transcript.js";

// ---------------------------------------------------------------------------
// Paths. research/ root is four levels up from phase-3/src/harness/run.ts.
// ---------------------------------------------------------------------------

const HERE = dirname(fileURLToPath(import.meta.url));
const HARNESS_DIR = HERE;
const RESEARCH_ROOT = resolve(HERE, "..", "..", "..");
const PHASE_ROOT = resolve(RESEARCH_ROOT, "phase-3");
const STATE_SERVER_PATH = join(HARNESS_DIR, "mcp-state-server.ts");
const OPS_SERVER_PATH = join(HARNESS_DIR, "mcp-ops-server.ts");

const SINGLE_TURN_TIMEOUT_MS = 240 * 1000;
const AGENTIC_TIMEOUT_MS = 600 * 1000;

/** Allowlist tokens for the ops server's tools (must match mcp-ops-server.ts). */
const OPS_TOOL_ALLOWANCES = [
  "mcp__ops__ticket_update",
  "mcp__ops__refund_issue",
  "mcp__ops__email_send",
  "mcp__ops__deploy_service",
  "mcp__ops__record_note",
  "mcp__ops__ops_lookup",
];

// ---------------------------------------------------------------------------
// Model / provider resolution
// ---------------------------------------------------------------------------

const CLAUDE_ALIASES = new Set(["haiku", "sonnet", "opus"]);

interface ProviderModel {
  provider: "claude" | "codex";
  cliModel: string;
  name: string;
}

function resolveModel(name: string): ProviderModel {
  if (CLAUDE_ALIASES.has(name)) return { provider: "claude", cliModel: name, name };
  if (name.startsWith("gpt-")) return { provider: "codex", cliModel: name, name };
  throw new Error(`unknown model: ${name}`);
}

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------

interface Args {
  exp: string;
  models: string[];
  n: number;
  maxCalls: number;
  only: string | null;
  dryRun: boolean;
}

function parseArgs(argv: string[]): Args {
  const map = new Map<string, string>();
  const flags = new Set<string>();
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) continue;
    const key = a.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith("--")) flags.add(key);
    else {
      map.set(key, next);
      i++;
    }
  }
  const exp = map.get("exp") ?? map.get("experiment");
  const models = map.get("models");
  if (!exp) throw new Error("--exp is required");
  if (!models) throw new Error("--models is required (comma-separated)");
  return {
    exp,
    models: models.split(",").map((s) => s.trim()).filter(Boolean),
    n: map.has("n") ? parseInt(map.get("n")!, 10) : 3,
    maxCalls: map.has("max-calls") ? parseInt(map.get("max-calls")!, 10) : Infinity,
    only: map.get("only") ?? null,
    dryRun: flags.has("dry-run"),
  };
}

// ---------------------------------------------------------------------------
// Result record (phase-2 schema + phase-3 fields: killPoint, evidence, opsLog)
// ---------------------------------------------------------------------------

interface ResultRecord {
  id: string;
  experiment: string;
  runMode: string;
  arm: string | null;
  programPath: string;
  variant: Record<string, unknown>;
  killPoint: string | null;
  evidence: string | null;
  provider: "claude" | "codex";
  model: string;
  promptTokens: number;
  completionTokens: number;
  costUsd: number | null;
  /** Per-model usage/cost from the CLI, when available (agentic runs). */
  modelUsage?: Record<string, unknown> | null;
  startedAt: string;
  durationMs: number;
  rawOutput: string;
  transcriptPath: string | null;
  spawns: Spawn[];
  toolCalls: ToolCall[];
  stateLog: Record<string, unknown>[];
  opsLog: Record<string, unknown>[];
  error: string | null;
}

interface Job {
  entry: ManifestEntry;
  model: ProviderModel;
  r: number;
  recordId: string;
}

// ---------------------------------------------------------------------------
// Agentic claude runner
// ---------------------------------------------------------------------------

interface AgenticResult extends RunResult {
  modelUsage?: Record<string, unknown> | null;
  transcriptPath: string | null;
  spawns: Spawn[];
  toolCalls: ToolCall[];
  stateLog: Record<string, unknown>[];
  opsLog: Record<string, unknown>[];
}

interface SpawnOutcome {
  code: number | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
  spawnError: string | null;
}

function spawnProcess(
  command: string,
  args: string[],
  input: string,
  timeoutMs: number,
  cwd: string,
  env?: NodeJS.ProcessEnv,
): Promise<SpawnOutcome> {
  return new Promise((resolvePromise) => {
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    let settled = false;
    const child = spawn(command, args, {
      cwd,
      env: { ...process.env, ...env },
      stdio: ["pipe", "pipe", "pipe"],
    });
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, timeoutMs);
    child.stdout.on("data", (d) => (stdout += d.toString()));
    child.stderr.on("data", (d) => (stderr += d.toString()));
    child.on("error", (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolvePromise({ code: null, stdout, stderr, timedOut, spawnError: err.message });
    });
    child.on("close", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolvePromise({ code, stdout, stderr, timedOut, spawnError: null });
    });
    child.stdin.write(input);
    child.stdin.end();
  });
}

async function runAgenticClaude(
  entry: ManifestEntry,
  cliModel: string,
  recordId: string,
): Promise<AgenticResult> {
  const started = Date.now();
  const empty: AgenticResult = {
    rawOutput: "",
    promptTokens: 0,
    completionTokens: 0,
    costUsd: null,
    durationMs: 0,
    error: null,
    transcriptPath: null,
    spawns: [],
    toolCalls: [],
    stateLog: [],
    opsLog: [],
  };

  const sandbox = await mkdtemp(join(tmpdir(), "mdz-agentic-"));
  const stateLogPath = join(sandbox, ".state-log.jsonl");
  const opsLogPath = join(sandbox, ".ops-log.jsonl");
  try {
    // Write sandbox files (may be nested paths).
    for (const [rel, content] of Object.entries(entry.sandbox ?? {})) {
      const abs = join(sandbox, rel);
      await mkdir(dirname(abs), { recursive: true });
      await writeFile(abs, content);
    }

    const allowed = [...(entry.allowedTools ?? [])];
    const args = [
      "-p",
      "--output-format",
      "json",
      "--model",
      cliModel,
    ];

    const env: NodeJS.ProcessEnv = {};
    if (entry.mcp === "state") {
      const mcpConfigPath = join(sandbox, ".mcp-config.json");
      const mcpConfig = {
        mcpServers: {
          state: {
            command: "npx",
            args: ["tsx", STATE_SERVER_PATH],
            env: { STATE_LOG: stateLogPath },
          },
        },
      };
      await writeFile(mcpConfigPath, JSON.stringify(mcpConfig, null, 2));
      args.push("--mcp-config", mcpConfigPath, "--strict-mcp-config");
      allowed.push("mcp__state__get", "mcp__state__set");
      env.STATE_LOG = stateLogPath;
    } else if (entry.mcp === "ops") {
      const seedPath = entry.mcpSeed ? join(PHASE_ROOT, entry.mcpSeed) : "";
      const mcpConfigPath = join(sandbox, ".mcp-config.json");
      const mcpConfig = {
        mcpServers: {
          ops: {
            command: "npx",
            args: ["tsx", OPS_SERVER_PATH],
            env: { OPS_LOG: opsLogPath, OPS_SEED: seedPath },
          },
        },
      };
      await writeFile(mcpConfigPath, JSON.stringify(mcpConfig, null, 2));
      args.push("--mcp-config", mcpConfigPath, "--strict-mcp-config");
      allowed.push(...OPS_TOOL_ALLOWANCES);
      env.OPS_LOG = opsLogPath;
      env.OPS_SEED = seedPath;
    }

    if (allowed.length) args.push("--allowedTools", ...allowed);

    // Ralph loops (entry.passes > 1): run the SAME prompt `passes` times, each
    // in a FRESH `claude -p` session, sequentially, against the SAME sandbox —
    // each pass sees the previous pass's mutations. No fan-out, no selection.
    // Tokens/cost are summed, spawns/toolCalls concatenated (tagged with a
    // 1-based `pass`), every pass's transcript is copied into
    // results/transcripts (suffixed -pass<i> when passes > 1), and
    // transcriptPath points at the LAST pass's transcript.
    const passes = Math.max(1, entry.passes ?? 1);

    let promptTokens = 0;
    let completionTokens = 0;
    let costUsd: number | null = null;
    let modelUsage: Record<string, unknown> | null = null;
    let rawOutput = "";
    let error: string | null = null;
    let transcriptPath: string | null = null;
    const spawns: Spawn[] = [];
    const toolCalls: ToolCall[] = [];

    const timeoutMs = entry.timeoutMs ?? AGENTIC_TIMEOUT_MS;
    for (let pass = 1; pass <= passes; pass++) {
      const out = await spawnProcess(
        "claude",
        args,
        entry.prompt,
        timeoutMs,
        sandbox,
        env,
      );

      if (out.spawnError) {
        error = `pass ${pass}/${passes}: spawn error: ${out.spawnError}`;
        break;
      }
      if (out.timedOut) {
        error = `pass ${pass}/${passes}: timeout after ${timeoutMs}ms`;
        break;
      }

      const envelope = parseEnvelope(out.stdout);
      if (!envelope) {
        rawOutput = out.stdout;
        error =
          out.code !== 0
            ? `pass ${pass}/${passes}: claude exit ${out.code}: ${truncate(out.stderr)}`
            : `pass ${pass}/${passes}: unparseable claude json envelope: ${truncate(out.stdout)}`;
        break;
      }

      promptTokens += envelope.inputTokens;
      completionTokens += envelope.outputTokens;
      if (envelope.costUsd != null) costUsd = (costUsd ?? 0) + envelope.costUsd;
      if (envelope.modelUsage) {
        // Per-model usage (orchestrator vs pinned workers). Summed across
        // passes: tokens and costUSD accumulate per model key.
        modelUsage ??= {};
        for (const [mod, u] of Object.entries(envelope.modelUsage)) {
          const prev = (modelUsage[mod] ?? {}) as Record<string, number>;
          const next = u as Record<string, number>;
          const sum: Record<string, number> = { ...prev };
          for (const k of ["inputTokens", "outputTokens", "cacheReadInputTokens", "cacheCreationInputTokens", "costUSD"]) {
            if (typeof next[k] === "number") sum[k] = (sum[k] ?? 0) + next[k];
          }
          modelUsage[mod] = sum;
        }
      }
      rawOutput = envelope.resultText;

      // Locate + copy this pass's session transcript, then mine it.
      if (envelope.sessionId) {
        const src = findTranscript(sandbox, envelope.sessionId);
        if (src) {
          const destDir = join(PHASE_ROOT, "results", "transcripts");
          await mkdir(destDir, { recursive: true });
          const suffix = passes > 1 ? `-pass${pass}` : "";
          transcriptPath = join(destDir, `${recordId}${suffix}.jsonl`);
          await copyFile(src, transcriptPath);
          const parsed = parseTranscript(readFileSync(transcriptPath, "utf8"));
          // Tag with the pass index only on multi-pass runs, so single-pass
          // records keep their existing shape.
          spawns.push(...parsed.spawns.map((s) => (passes > 1 ? { ...s, pass } : s)));
          toolCalls.push(...parsed.toolCalls.map((c) => (passes > 1 ? { ...c, pass } : c)));
        }
      }

      if (envelope.isError) {
        error = `pass ${pass}/${passes}: claude reported error (subtype=${envelope.subtype})`;
        break;
      }
    }

    const durationMs = Date.now() - started;
    const stateLog = await readCallLog(stateLogPath);
    const opsLog = await readCallLog(opsLogPath);

    return {
      ...empty,
      rawOutput,
      promptTokens,
      completionTokens,
      costUsd,
      modelUsage,
      durationMs,
      error,
      transcriptPath: transcriptPath
        ? transcriptPath.replace(`${PHASE_ROOT}/`, "")
        : null,
      spawns,
      toolCalls,
      stateLog,
      opsLog,
    };
  } finally {
    // Archive the final working directory: the e2a/e2b scorers re-run tests
    // and benchmarks against the shipped code, which only exists here.
    const archive = join(PHASE_ROOT, "results", "sandboxes", recordId);
    await rm(archive, { recursive: true, force: true }).catch(() => {});
    await mkdir(dirname(archive), { recursive: true });
    await cp(sandbox, archive, { recursive: true }).catch(() => {});
    await rm(sandbox, { recursive: true, force: true }).catch(() => {});
  }
}

interface Envelope {
  resultText: string;
  sessionId: string | null;
  inputTokens: number;
  outputTokens: number;
  costUsd: number | null;
  /** Per-model usage from the CLI (covers orchestrator and spawned workers). */
  modelUsage: Record<string, unknown> | null;
  subtype: unknown;
  isError: boolean;
}

function parseEnvelope(stdout: string): Envelope | null {
  const obj = extractJsonObject(stdout);
  if (!obj) return null;
  const usage = (obj.usage ?? {}) as Record<string, unknown>;
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);
  return {
    resultText: typeof obj.result === "string" ? obj.result : "",
    sessionId: typeof obj.session_id === "string" ? obj.session_id : null,
    inputTokens:
      num(usage.input_tokens) +
      num(usage.cache_creation_input_tokens) +
      num(usage.cache_read_input_tokens),
    outputTokens: num(usage.output_tokens),
    costUsd: typeof obj.total_cost_usd === "number" ? obj.total_cost_usd : null,
    modelUsage:
      obj.modelUsage && typeof obj.modelUsage === "object"
        ? (obj.modelUsage as Record<string, unknown>)
        : null,
    subtype: obj.subtype,
    isError:
      obj.is_error === true ||
      (typeof obj.subtype === "string" && obj.subtype !== "success"),
  };
}

// ---------------------------------------------------------------------------
// One job
// ---------------------------------------------------------------------------

function variantString(entry: ManifestEntry, key: string): string | null {
  const v = (entry.variant as Record<string, unknown>)[key];
  return typeof v === "string" ? v : null;
}

async function executeJob(job: Job): Promise<ResultRecord> {
  const { entry, model } = job;
  const startedAt = new Date().toISOString();

  const base = {
    id: job.recordId,
    experiment: entry.experiment,
    runMode: entry.runMode,
    arm: variantString(entry, "arm"),
    programPath: entry.programPath,
    variant: entry.variant,
    killPoint: variantString(entry, "killPoint"),
    evidence: variantString(entry, "evidence"),
    provider: model.provider,
    model: model.name,
    startedAt,
  };

  if (entry.runMode === "agentic") {
    // Agentic runs are claude-only; gpt entries are filtered upstream.
    const r = await runAgenticClaude(entry, model.cliModel, job.recordId);
    return {
      ...base,
      promptTokens: r.promptTokens,
      completionTokens: r.completionTokens,
      costUsd: r.costUsd,
      modelUsage: r.modelUsage,
      durationMs: r.durationMs,
      rawOutput: r.rawOutput,
      transcriptPath: r.transcriptPath,
      spawns: r.spawns,
      toolCalls: r.toolCalls,
      stateLog: r.stateLog,
      opsLog: r.opsLog,
      error: r.error,
    };
  }

  // Single-turn: verbatim prompt, all tools disabled.
  const singleTurnTimeoutMs = entry.timeoutMs ?? SINGLE_TURN_TIMEOUT_MS;
  let run: RunResult;
  if (model.provider === "claude") {
    run = await runClaude(entry.prompt, model.cliModel, { timeoutMs: singleTurnTimeoutMs });
  } else {
    run = await runCodex(entry.prompt, model.cliModel, { timeoutMs: singleTurnTimeoutMs });
  }
  return {
    ...base,
    promptTokens: run.promptTokens,
    completionTokens: run.completionTokens,
    costUsd: run.costUsd,
    durationMs: run.durationMs,
    rawOutput: run.rawOutput,
    transcriptPath: null,
    spawns: [],
    toolCalls: [],
    stateLog: [],
    opsLog: [],
    error: run.error,
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const manifestPath = join(PHASE_ROOT, "programs", args.exp, "manifest.json");
  if (!existsSync(manifestPath)) {
    console.error(`manifest not found: ${manifestPath}`);
    process.exit(1);
  }
  const manifest = await loadManifest(manifestPath);
  const models = args.models.map(resolveModel);

  const resultsPath = join(PHASE_ROOT, "results", `${args.exp}.jsonl`);
  await mkdir(dirname(resultsPath), { recursive: true });
  const done = existsSync(resultsPath)
    ? collectDoneIds(readFileSync(resultsPath, "utf8"))
    : new Set<string>();

  const jobs: Job[] = [];
  let skippedGpt = 0;
  for (const entry of manifest) {
    if (args.only && !entry.id.includes(args.only)) continue;
    // A manifest `model` field pins the entry to one orchestrator model,
    // overriding --models; the entry id already encodes the model, so the
    // record id drops the model suffix (e.g. e2b2-pricing-haiku-r1).
    const entryModels = entry.model ? [resolveModel(entry.model)] : models;
    for (const model of entryModels) {
      // Agentic entries run on claude models only; gpt is silently skipped.
      if (entry.runMode === "agentic" && model.provider !== "claude") {
        skippedGpt++;
        continue;
      }
      for (let r = 1; r <= args.n; r++) {
        const recordId = entry.model
          ? `${entry.id}-r${r}`
          : `${entry.id}-${model.name}-r${r}`;
        if (done.has(recordId)) continue;
        jobs.push({ entry, model, r, recordId });
      }
    }
  }

  console.error(
    `[${args.exp}] ${manifest.length} entries x ${models.length} models x n=${args.n}: ` +
      `${jobs.length} runs pending (${done.size} done` +
      (skippedGpt ? `, ${skippedGpt} gpt-agentic skipped` : "") +
      `), max-calls=${args.maxCalls}${args.dryRun ? " [DRY RUN]" : ""}`,
  );

  if (args.dryRun) {
    for (const j of jobs) console.error(`  would run: ${j.recordId} (${j.entry.runMode})`);
    return;
  }

  let calls = 0;
  let completed = 0;
  for (const job of jobs) {
    if (calls >= args.maxCalls) {
      console.error(`hit --max-calls=${args.maxCalls}; stopping. Re-run to resume.`);
      break;
    }
    calls++;
    const rec = await executeJob(job);
    await appendFile(resultsPath, JSON.stringify(rec) + "\n");
    completed++;
    const status = rec.error
      ? `ERROR=${rec.error}`
      : `${rec.runMode} spawns=${rec.spawns.length} tools=${rec.toolCalls.length} ` +
        `state=${rec.stateLog.length} ops=${rec.opsLog.length}`;
    console.error(
      `[${completed}/${jobs.length}] ${rec.id} ${status} ` +
        `tok=${rec.promptTokens}/${rec.completionTokens} ` +
        `${rec.costUsd != null ? `$${rec.costUsd.toFixed(4)} ` : ""}${rec.durationMs}ms`,
    );
  }
  console.error(`done: ${completed} runs appended to ${resultsPath}`);
}

// ---------------------------------------------------------------------------
// Helpers (JSON extraction mirrors the phase-1 runner)
// ---------------------------------------------------------------------------

function truncate(s: string, n = 400): string {
  return s.length > n ? s.slice(0, n) + "…" : s;
}

function extractJsonObject(s: string): Record<string, unknown> | null {
  const direct = tryParse(s.trim());
  if (direct) return direct;
  const start = s.indexOf("{");
  if (start === -1) return null;
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < s.length; i++) {
    const ch = s[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return tryParse(s.slice(start, i + 1));
    }
  }
  return null;
}

function tryParse(s: string): Record<string, unknown> | null {
  try {
    const v = JSON.parse(s);
    return v && typeof v === "object" && !Array.isArray(v)
      ? (v as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
