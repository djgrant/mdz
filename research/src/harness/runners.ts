/**
 * Model runners: spawn the Claude and Codex CLIs non-interactively, with tools
 * disabled, and normalise their output into a common RunResult.
 *
 * Only node builtins are used (no npm deps).
 */

import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

export interface RunResult {
  /** Full text of the model's final answer (the trace, ledger + trace, etc). */
  rawOutput: string;
  promptTokens: number;
  completionTokens: number;
  /** Cost in USD if the provider reports it, else null. */
  costUsd: number | null;
  durationMs: number;
  /** Non-null when the run failed (spawn error, timeout, non-zero exit, parse). */
  error: string | null;
}

export interface RunOptions {
  /** Milliseconds before the child is killed. Default 5 minutes. */
  timeoutMs?: number;
  /** Extra environment for the child process. */
  env?: NodeJS.ProcessEnv;
}

const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000;

interface SpawnOutcome {
  code: number | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
  spawnError: string | null;
}

/** Spawn a command, feeding `input` on stdin, collecting stdout/stderr. */
function runProcess(
  command: string,
  args: string[],
  input: string | null,
  timeoutMs: number,
  env?: NodeJS.ProcessEnv,
): Promise<SpawnOutcome> {
  return new Promise((resolve) => {
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    let settled = false;

    const child = spawn(command, args, {
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
      resolve({
        code: null,
        stdout,
        stderr,
        timedOut,
        spawnError: err.message,
      });
    });

    child.on("close", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ code, stdout, stderr, timedOut, spawnError: null });
    });

    if (input != null) {
      child.stdin.write(input);
    }
    child.stdin.end();
  });
}

// ---------------------------------------------------------------------------
// Claude
// ---------------------------------------------------------------------------

/**
 * Run a prompt through the Claude CLI:
 *   claude -p --model <model> --output-format json
 *          --disallowed-tools ... --allowedTools ""
 *
 * The prompt is passed on stdin to avoid argv length / quoting issues.
 * The `--output-format json` envelope looks like:
 *   { "type":"result", "subtype":"success", "result":"<text>",
 *     "total_cost_usd": 0.01,
 *     "usage": { "input_tokens": 10, "output_tokens": 20, ... } }
 */
export async function runClaude(
  prompt: string,
  model: string,
  opts: RunOptions = {},
): Promise<RunResult> {
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const args = [
    "-p",
    "--model",
    model,
    "--output-format",
    "json",
    // Disable every tool: empty allow-list, and belt-and-braces deny-all.
    "--allowedTools",
    "",
    "--disallowedTools",
    "Bash Edit Write Read WebFetch WebSearch Glob Grep Task NotebookEdit",
    "--disable-slash-commands",
  ];

  const started = Date.now();
  const out = await runProcess("claude", args, prompt, timeoutMs, opts.env);
  const durationMs = Date.now() - started;

  if (out.spawnError) {
    return blank(durationMs, `spawn error: ${out.spawnError}`);
  }
  if (out.timedOut) {
    return blank(durationMs, `timeout after ${timeoutMs}ms`);
  }

  const envelope = parseClaudeEnvelope(out.stdout);
  if (!envelope) {
    return {
      rawOutput: out.stdout,
      promptTokens: 0,
      completionTokens: 0,
      costUsd: null,
      durationMs,
      error:
        out.code !== 0
          ? `claude exit ${out.code}: ${truncate(out.stderr)}`
          : `could not parse claude json envelope: ${truncate(out.stdout)}`,
    };
  }

  const isError =
    envelope.is_error === true ||
    (typeof envelope.subtype === "string" && envelope.subtype !== "success");

  return {
    rawOutput: envelope.resultText,
    promptTokens: envelope.inputTokens,
    completionTokens: envelope.outputTokens,
    costUsd: envelope.costUsd,
    durationMs,
    error: isError ? `claude reported error (subtype=${envelope.subtype})` : null,
  };
}

interface ClaudeEnvelope {
  resultText: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number | null;
  subtype: unknown;
  is_error: unknown;
}

function parseClaudeEnvelope(stdout: string): ClaudeEnvelope | null {
  const obj = extractJsonObject(stdout);
  if (!obj) return null;

  const usage = (obj.usage ?? {}) as Record<string, unknown>;
  const inputTokens =
    num(usage.input_tokens) +
    num(usage.cache_creation_input_tokens) +
    num(usage.cache_read_input_tokens);
  const outputTokens = num(usage.output_tokens);

  const resultText =
    typeof obj.result === "string"
      ? obj.result
      : typeof obj.text === "string"
        ? (obj.text as string)
        : "";

  const costUsd =
    typeof obj.total_cost_usd === "number"
      ? obj.total_cost_usd
      : typeof obj.cost_usd === "number"
        ? (obj.cost_usd as number)
        : null;

  return {
    resultText,
    inputTokens,
    outputTokens,
    costUsd,
    subtype: obj.subtype,
    is_error: obj.is_error,
  };
}

// ---------------------------------------------------------------------------
// Codex
// ---------------------------------------------------------------------------

/**
 * Run a prompt through the Codex CLI:
 *   codex exec -m <model> --json --skip-git-repo-check
 *              --sandbox read-only --cd <tmp>
 *              --output-last-message <file>
 *
 * `--json` streams JSONL events to stdout; the final assistant message is also
 * written verbatim to the --output-last-message file, which we read for
 * rawOutput. Token usage is scraped from the JSONL events (a token_count /
 * usage event) when present.
 */
export async function runCodex(
  prompt: string,
  model: string,
  opts: RunOptions = {},
): Promise<RunResult> {
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const started = Date.now();

  const workdir = await mkdtemp(join(tmpdir(), "mdz-codex-"));
  const lastMsgPath = join(workdir, "last-message.txt");

  const args = [
    "exec",
    "-m",
    model,
    "--json",
    "--skip-git-repo-check",
    "--sandbox",
    "read-only",
    "--cd",
    workdir,
    "--color",
    "never",
    "--output-last-message",
    lastMsgPath,
    "-", // read prompt from stdin
  ];

  try {
    const out = await runProcess("codex", args, prompt, timeoutMs, opts.env);
    const durationMs = Date.now() - started;

    if (out.spawnError) {
      return blank(durationMs, `spawn error: ${out.spawnError}`);
    }
    if (out.timedOut) {
      return blank(durationMs, `timeout after ${timeoutMs}ms`);
    }

    let lastMessage = "";
    try {
      lastMessage = (await readFile(lastMsgPath, "utf8")).trim();
    } catch {
      /* file may not exist on failure; fall back to JSONL scrape */
    }

    const scraped = scrapeCodexJsonl(out.stdout);
    const rawOutput = lastMessage || scraped.finalMessage;

    if (out.code !== 0 && !rawOutput) {
      return {
        rawOutput: out.stdout,
        promptTokens: scraped.promptTokens,
        completionTokens: scraped.completionTokens,
        costUsd: null,
        durationMs,
        error: `codex exit ${out.code}: ${truncate(out.stderr || out.stdout)}`,
      };
    }

    return {
      rawOutput,
      promptTokens: scraped.promptTokens,
      completionTokens: scraped.completionTokens,
      costUsd: null, // codex CLI does not report USD cost
      durationMs,
      error: rawOutput ? null : `codex produced no final message`,
    };
  } finally {
    await rm(workdir, { recursive: true, force: true }).catch(() => {});
  }
}

interface CodexScrape {
  finalMessage: string;
  promptTokens: number;
  completionTokens: number;
}

/**
 * Parse Codex `--json` JSONL. Event shapes vary across versions; we look for:
 *  - the last agent/assistant message event (msg.type "agent_message" or an
 *    item with role "assistant") for the final text
 *  - a token usage event (containing input/output token counts) for tokens
 */
function scrapeCodexJsonl(stdout: string): CodexScrape {
  let finalMessage = "";
  let promptTokens = 0;
  let completionTokens = 0;

  for (const line of stdout.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("{")) continue;
    let ev: Record<string, unknown>;
    try {
      ev = JSON.parse(trimmed) as Record<string, unknown>;
    } catch {
      continue;
    }

    const msg = (ev.msg ?? ev) as Record<string, unknown>;
    const type = String(msg.type ?? ev.type ?? "");

    // Final assistant message text (various field names across versions).
    if (
      type.includes("agent_message") ||
      type === "assistant" ||
      type === "message"
    ) {
      const text = firstString(
        msg.message,
        msg.text,
        msg.content,
        ev.last_agent_message,
      );
      if (text) finalMessage = text;
    }

    // Token usage: look for a usage/token_count block anywhere in the event.
    const usage = findUsage(ev) ?? findUsage(msg);
    if (usage) {
      promptTokens = num(usage.input_tokens ?? usage.prompt_tokens) || promptTokens;
      completionTokens =
        num(usage.output_tokens ?? usage.completion_tokens) || completionTokens;
    }
  }

  return { finalMessage, promptTokens, completionTokens };
}

function findUsage(
  obj: Record<string, unknown> | undefined,
): Record<string, unknown> | null {
  if (!obj) return null;
  const candidates = [obj.usage, obj.token_count, obj.tokens, obj.info];
  for (const c of candidates) {
    if (c && typeof c === "object") {
      const r = c as Record<string, unknown>;
      if (
        "input_tokens" in r ||
        "output_tokens" in r ||
        "prompt_tokens" in r ||
        "completion_tokens" in r
      ) {
        return r;
      }
    }
  }
  if (
    "input_tokens" in obj ||
    "output_tokens" in obj ||
    "prompt_tokens" in obj ||
    "completion_tokens" in obj
  ) {
    return obj;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function blank(durationMs: number, error: string): RunResult {
  return {
    rawOutput: "",
    promptTokens: 0,
    completionTokens: 0,
    costUsd: null,
    durationMs,
    error,
  };
}

function num(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

function firstString(...vals: unknown[]): string {
  for (const v of vals) {
    if (typeof v === "string" && v.length > 0) return v;
    // content arrays: [{type:"text", text:"..."}]
    if (Array.isArray(v)) {
      const parts = v
        .map((p) =>
          p && typeof p === "object" && typeof (p as any).text === "string"
            ? (p as any).text
            : typeof p === "string"
              ? p
              : "",
        )
        .filter(Boolean);
      if (parts.length) return parts.join("");
    }
  }
  return "";
}

function truncate(s: string, n = 400): string {
  return s.length > n ? s.slice(0, n) + "…" : s;
}

/**
 * Extract the first balanced top-level JSON object from a string that may have
 * leading/trailing noise. Returns null if none parses.
 */
function extractJsonObject(s: string): Record<string, unknown> | null {
  // Fast path: whole string is JSON.
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
      if (depth === 0) {
        const candidate = s.slice(start, i + 1);
        return tryParse(candidate);
      }
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
