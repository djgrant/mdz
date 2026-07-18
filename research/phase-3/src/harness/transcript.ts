/**
 * Transcript + manifest utilities for the phase-3 harness.
 *
 * Adapted from phase-2/src/harness/transcript.ts; the manifest contract now
 * comes from phase-3's shared generator module (which adds the `ops` mock MCP
 * server and `mcpSeed`). All model-independent helpers live here so the test
 * suite can exercise them against fixtures without spawning any models.
 */

import { existsSync, readdirSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

import type { ManifestEntry } from "../generate/shared.ts";

export type { ManifestEntry };
export type Manifest = ManifestEntry[];

export async function loadManifest(path: string): Promise<Manifest> {
  const text = await readFile(path, "utf8");
  const parsed = JSON.parse(text);
  const entries: unknown[] = Array.isArray(parsed) ? parsed : (parsed.entries ?? []);
  return entries.map(normaliseEntry);
}

function normaliseEntry(raw: unknown): ManifestEntry {
  const e = raw as Partial<ManifestEntry>;
  if (!e.id) throw new Error("manifest entry missing id");
  if (!e.experiment) throw new Error(`entry ${e.id} missing experiment`);
  return {
    id: e.id,
    experiment: e.experiment,
    runMode: e.runMode ?? "single-turn",
    programPath: e.programPath ?? "",
    tracePath: e.tracePath ?? null,
    prompt: e.prompt ?? "",
    variant: e.variant ?? {},
    expected: e.expected,
    sandbox: e.sandbox,
    mcp: e.mcp,
    mcpSeed: e.mcpSeed,
    allowedTools: e.allowedTools,
    passes: e.passes,
    timeoutMs: e.timeoutMs,
    model: e.model,
  };
}

// ---------------------------------------------------------------------------
// Resume: ids already recorded WITHOUT a run-level error are skipped.
// ---------------------------------------------------------------------------

export function collectDoneIds(jsonlText: string): Set<string> {
  const done = new Set<string>();
  for (const line of jsonlText.split("\n")) {
    const t = line.trim();
    if (!t) continue;
    try {
      const rec = JSON.parse(t) as { id?: string; error?: unknown };
      if (rec.id && !rec.error) done.add(rec.id);
    } catch {
      /* skip corrupt line */
    }
  }
  return done;
}

// ---------------------------------------------------------------------------
// Transcript path munging
// ---------------------------------------------------------------------------

/**
 * Claude Code stores per-session transcripts under
 *   ~/.claude/projects/<munged-cwd>/<session_id>.jsonl
 *
 * The munging observed empirically (claude 2.1.207, macOS): every "/" and "."
 * in the absolute cwd is replaced by "-". So "/Users/coder/.craft/x" becomes
 * "-Users-coder--craft-x" (the "/." run yields "--"). Other characters pass
 * through unchanged.
 */
export function mungeCwd(cwd: string): string {
  return cwd.replace(/[/.]/g, "-");
}

/**
 * Resolve the transcript file for a session. Tries the munged path first, then
 * falls back to scanning every project dir for <session_id>.jsonl (robust to
 * symlink resolution, e.g. macOS /var -> /private/var).
 */
export function findTranscript(cwd: string, sessionId: string): string | null {
  const projectsRoot = join(homedir(), ".claude", "projects");
  const direct = join(projectsRoot, mungeCwd(cwd), `${sessionId}.jsonl`);
  if (existsSync(direct)) return direct;

  if (!existsSync(projectsRoot)) return null;
  for (const dir of readdirSync(projectsRoot)) {
    const candidate = join(projectsRoot, dir, `${sessionId}.jsonl`);
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Transcript parsing
// ---------------------------------------------------------------------------

export interface Spawn {
  subagentType: string | null;
  prompt: string | null;
  description?: string | null;
  /** Multi-pass (ralph) runs: 1-based index of the pass that produced this. */
  pass?: number;
}

export interface ToolCall {
  name: string; // e.g. "mcp__ops__refund_issue"
  input: Record<string, unknown>;
  /** Multi-pass (ralph) runs: 1-based index of the pass that produced this. */
  pass?: number;
}

export interface TranscriptExtract {
  spawns: Spawn[];
  toolCalls: ToolCall[];
}

/**
 * Tool names under which a subagent spawn is recorded. The CLI allowlist token
 * is `Task`, but claude 2.1.207 writes the tool_use into the transcript as
 * `Agent`; accept both so the parser survives the rename.
 */
const SPAWN_TOOL_NAMES = new Set(["Task", "Agent"]);

/**
 * Walk a Claude Code transcript (JSONL) and extract:
 *   - spawns:    every Task/Agent tool_use ({subagentType, prompt})
 *   - toolCalls: every `mcp__*` tool_use ({name, input})
 *
 * Transcript lines are typed events; assistant messages carry a
 * `message.content[]` array in which tool_use blocks look like
 *   { type: "tool_use", name, input: {...} }
 */
export function parseTranscript(jsonlText: string): TranscriptExtract {
  const spawns: Spawn[] = [];
  const toolCalls: ToolCall[] = [];

  for (const line of jsonlText.split("\n")) {
    const t = line.trim();
    if (!t) continue;
    let event: unknown;
    try {
      event = JSON.parse(t);
    } catch {
      continue;
    }
    for (const block of toolUseBlocks(event)) {
      const name = String(block.name ?? "");
      const input = (block.input ?? {}) as Record<string, unknown>;
      if (SPAWN_TOOL_NAMES.has(name)) {
        spawns.push({
          subagentType:
            (input.subagent_type as string) ?? (input.subagentType as string) ?? null,
          prompt: (input.prompt as string) ?? null,
          description: (input.description as string) ?? null,
        });
      } else if (name.startsWith("mcp__")) {
        toolCalls.push({ name, input });
      }
    }
  }
  return { spawns, toolCalls };
}

/** Extract tool_use content blocks from a single transcript event, if any. */
function toolUseBlocks(event: unknown): { name?: unknown; input?: unknown }[] {
  if (!event || typeof event !== "object") return [];
  const message = (event as { message?: unknown }).message;
  if (!message || typeof message !== "object") return [];
  const content = (message as { content?: unknown }).content;
  if (!Array.isArray(content)) return [];
  return content.filter(
    (b): b is { type: string; name?: unknown; input?: unknown } =>
      !!b && typeof b === "object" && (b as { type?: unknown }).type === "tool_use",
  );
}

/** Read a JSONL call-log file (STATE_LOG or OPS_LOG) into parsed entries. */
export async function readCallLog(path: string): Promise<Record<string, unknown>[]> {
  if (!existsSync(path)) return [];
  const text = await readFile(path, "utf8");
  const out: Record<string, unknown>[] = [];
  for (const line of text.split("\n")) {
    const t = line.trim();
    if (!t) continue;
    try {
      out.push(JSON.parse(t) as Record<string, unknown>);
    } catch {
      /* skip */
    }
  }
  return out;
}
