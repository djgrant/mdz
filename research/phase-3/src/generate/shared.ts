/**
 * Shared plumbing for the phase-3 program generators.
 *
 * Everything here is deterministic: no randomness beyond the seeded phase-1
 * generator library, no clock, no network. Mirrors phase-2's contract; the
 * additions are the `ops` mock MCP server (E1's side-effect tools) and
 * `mcpSeed` (a JSON file of pre-kill server state the runner loads before
 * the session starts).
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { validateMdz } from "../../../src/interpreter/validate.ts";

const HERE = dirname(fileURLToPath(import.meta.url));

/** phase-3/ root (two levels up from phase-3/src/generate/). */
export const PHASE_ROOT = resolve(HERE, "..", "..");
export const PROGRAMS_DIR = join(PHASE_ROOT, "programs");

// ---------------------------------------------------------------------------
// Manifest contract (phase-2 contract + phase-3 fields)
// ---------------------------------------------------------------------------

export type Experiment = "e1" | "e2a" | "e2b" | "e3";
export type RunMode = "single-turn" | "agentic";

export interface ManifestEntry {
  id: string;
  experiment: Experiment;
  runMode: RunMode;
  /** relative to phase-3/ */
  programPath: string;
  /** relative to phase-3/; null when there is no reference trace */
  tracePath: string | null;
  /** FULLY ASSEMBLED prompt; the runner sends this verbatim */
  prompt: string;
  variant: Record<string, unknown>;
  expected?: Record<string, unknown>;
  /** agentic runs: files the runner writes into the run cwd */
  sandbox?: Record<string, string>;
  mcp?: "state" | "ops";
  /** relative to phase-3/; initial mock-server state loaded before the run */
  mcpSeed?: string;
  allowedTools?: string[];
  /**
   * Ralph loop: run the SAME prompt this many times, each in a fresh session,
   * sequentially against the SAME sandbox (default 1). No fan-out, no
   * selection; whatever the last pass leaves is what ships.
   */
  passes?: number;
}

// ---------------------------------------------------------------------------
// File helpers
// ---------------------------------------------------------------------------

/** Path relative to phase-3/. */
export function rel(absPath: string): string {
  return absPath.slice(PHASE_ROOT.length + 1);
}

export function writeText(absPath: string, content: string): void {
  mkdirSync(dirname(absPath), { recursive: true });
  writeFileSync(absPath, content);
}

export function writeJson(absPath: string, value: unknown): void {
  writeText(absPath, JSON.stringify(value, null, 2) + "\n");
}

/** Throw if canonical MDZ source fails the conformance grammar. */
export function assertValid(source: string, label: string): void {
  const res = validateMdz(source);
  if (!res.ok) {
    throw new Error(`invalid canonical MDZ for ${label}: ${res.error}`);
  }
}
