/**
 * Phase-2 model-execution harness.
 *
 * Usage:
 *   npx tsx phase-2/src/harness/run.ts --exp e1 \
 *       --models haiku,gpt-5.4-mini --n 3 --max-calls 150 \
 *       [--only <id-substring>] [--dry-run]
 *
 * Reads phase-2/programs/<exp>/manifest.json (see transcript.ts for the
 * contract), runs each entry with each requested model n times, and APPENDS
 * one JSONL record per run to phase-2/results/<exp>.jsonl. NO scoring happens
 * here — a separate scorer consumes the records. Resumable by id; a global
 * --max-calls guard aborts over budget.
 *
 * Run modes:
 *   single-turn — phase-1 style; prompt sent verbatim with all tools disabled.
 *                 claude models via `claude -p`, gpt-* via `codex exec`.
 *   agentic     — claude models only (gpt entries silently skipped); runs
 *                 `claude -p --output-format json` from a fresh sandbox cwd,
 *                 with the entry's allowedTools (and the mock `state` MCP
 *                 server when entry.mcp === "state"). The session transcript is
 *                 copied into results/transcripts/ and mined for spawns and
 *                 tool calls.
 */

import { spawn } from "node:child_process";
import { appendFile, copyFile, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
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
  readStateLog,
  type ManifestEntry,
  type Spawn,
  type ToolCall,
} from "./transcript.js";

// ---------------------------------------------------------------------------
// Paths. research/ root is four levels up from phase-2/src/harness/run.ts.
// ---------------------------------------------------------------------------

const HERE = dirname(fileURLToPath(import.meta.url));
const HARNESS_DIR = HERE;
const RESEARCH_ROOT = resolve(HERE, "..", "..", "..");
const PHASE_ROOT = resolve(RESEARCH_ROOT, "phase-2");
const MCP_SERVER_PATH = join(HARNESS_DIR, "mcp-state-server.ts");

const SINGLE_TURN_TIMEOUT_MS = 240 * 1000;
const AGENTIC_TIMEOUT_MS = 600 * 1000;

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
// Result record
// ---------------------------------------------------------------------------

interface ResultRecord {
  id: string;
  experiment: string;
  runMode: string;
  arm: string | null;
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
  transcriptPath: string | null;
  spawns: Spawn[];
  toolCalls: ToolCall[];
  stateLog: Record<string, unknown>[];
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
  transcriptPath: string | null;
  spawns: Spawn[];
  toolCalls: ToolCall[];
  stateLog: Record<string, unknown>[];
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
  };

  const sandbox = await mkdtemp(join(tmpdir(), "mdz-agentic-"));
  const stateLogPath = join(sandbox, ".state-log.jsonl");
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
            args: ["tsx", MCP_SERVER_PATH],
            env: { STATE_LOG: stateLogPath },
          },
        },
      };
      await writeFile(mcpConfigPath, JSON.stringify(mcpConfig, null, 2));
      args.push("--mcp-config", mcpConfigPath, "--strict-mcp-config");
      allowed.push("mcp__state__get", "mcp__state__set");
      env.STATE_LOG = stateLogPath;
    }

    if (allowed.length) args.push("--allowedTools", ...allowed);

    const out = await spawnProcess(
      "claude",
      args,
      entry.prompt,
      AGENTIC_TIMEOUT_MS,
      sandbox,
      env,
    );
    const durationMs = Date.now() - started;

    if (out.spawnError)
      return { ...empty, durationMs, error: `spawn error: ${out.spawnError}` };
    if (out.timedOut)
      return { ...empty, durationMs, error: `timeout after ${AGENTIC_TIMEOUT_MS}ms` };

    const envelope = parseEnvelope(out.stdout);
    if (!envelope) {
      return {
        ...empty,
        durationMs,
        rawOutput: out.stdout,
        error:
          out.code !== 0
            ? `claude exit ${out.code}: ${truncate(out.stderr)}`
            : `unparseable claude json envelope: ${truncate(out.stdout)}`,
      };
    }

    // Locate + copy the session transcript, then mine it.
    let transcriptPath: string | null = null;
    let spawns: Spawn[] = [];
    let toolCalls: ToolCall[] = [];
    if (envelope.sessionId) {
      const src = findTranscript(sandbox, envelope.sessionId);
      if (src) {
        const destDir = join(PHASE_ROOT, "results", "transcripts");
        await mkdir(destDir, { recursive: true });
        transcriptPath = join(destDir, `${recordId}.jsonl`);
        await copyFile(src, transcriptPath);
        const parsed = parseTranscript(readFileSync(transcriptPath, "utf8"));
        spawns = parsed.spawns;
        toolCalls = parsed.toolCalls;
      }
    }

    const stateLog = await readStateLog(stateLogPath);

    return {
      rawOutput: envelope.resultText,
      promptTokens: envelope.inputTokens,
      completionTokens: envelope.outputTokens,
      costUsd: envelope.costUsd,
      durationMs,
      error: envelope.isError ? `claude reported error (subtype=${envelope.subtype})` : null,
      transcriptPath: transcriptPath
        ? transcriptPath.replace(`${PHASE_ROOT}/`, "")
        : null,
      spawns,
      toolCalls,
      stateLog,
    };
  } finally {
    await rm(sandbox, { recursive: true, force: true }).catch(() => {});
  }
}

interface Envelope {
  resultText: string;
  sessionId: string | null;
  inputTokens: number;
  outputTokens: number;
  costUsd: number | null;
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
    subtype: obj.subtype,
    isError:
      obj.is_error === true ||
      (typeof obj.subtype === "string" && obj.subtype !== "success"),
  };
}

// ---------------------------------------------------------------------------
// One job
// ---------------------------------------------------------------------------

async function executeJob(job: Job): Promise<ResultRecord> {
  const { entry, model } = job;
  const startedAt = new Date().toISOString();

  const base = {
    id: job.recordId,
    experiment: entry.experiment,
    runMode: entry.runMode,
    arm: entry.arm ?? null,
    programPath: entry.programPath,
    variant: entry.variant,
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
      durationMs: r.durationMs,
      rawOutput: r.rawOutput,
      transcriptPath: r.transcriptPath,
      spawns: r.spawns,
      toolCalls: r.toolCalls,
      stateLog: r.stateLog,
      error: r.error,
    };
  }

  // Single-turn: verbatim prompt, all tools disabled.
  let run: RunResult;
  if (model.provider === "claude") {
    run = await runClaude(entry.prompt, model.cliModel, { timeoutMs: SINGLE_TURN_TIMEOUT_MS });
  } else {
    run = await runCodex(entry.prompt, model.cliModel, { timeoutMs: SINGLE_TURN_TIMEOUT_MS });
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
    for (const model of models) {
      // Agentic entries run on claude models only; gpt is silently skipped.
      if (entry.runMode === "agentic" && model.provider !== "claude") {
        skippedGpt++;
        continue;
      }
      for (let r = 1; r <= args.n; r++) {
        const recordId = `${entry.id}-${model.name}-r${r}`;
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
      : `${rec.runMode} spawns=${rec.spawns.length} tools=${rec.toolCalls.length} state=${rec.stateLog.length}`;
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
