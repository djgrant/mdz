/**
 * E3 — external state at breakdown sizes (phase-2 E3b, size extension).
 *
 * Phase 2's E3b showed the store carries real signal across a context
 * boundary but could not show rescue: at 100/200 statements the
 * whole-context baseline does not degrade. This experiment re-runs the same
 * three arms at 400 and 800 statements, past the phase-1 internal ceiling.
 * Generator, chunking (~25-statement chunks split only at block depth 0),
 * and prompts carry over from phase-2 e3/e3b UNCHANGED; only the sizes are
 * new.
 *
 * Arms per program:
 *  - internal:        single-turn, whole program in context (phase-2 e3
 *                     internal arm, phase-1 standard prompt verbatim)
 *  - chunked-store:   agentic; sequential chunk workers with mcp state tools
 *                     as the only cross-chunk memory
 *  - chunked-nostore: same chunking, no state tools; workers must guess
 *                     cross-chunk values
 *
 * 2 sizes x 2 seeds x 3 arms = 12 manifest entries. The arm lives in
 * `variant.arm` (phase-3's ManifestEntry has no top-level arm field; the
 * analysis scripts read it from the variant).
 */

import { join } from "node:path";

import { generateProgram } from "../../../src/generator/generate.ts";
import { renderFlat } from "../../../src/generator/render.ts";
import { interpret } from "../../../src/interpreter/interpret.ts";
import { buildPrompt } from "../../../src/harness/prompt.ts";
import type { FlatProgram } from "../../../src/generator/ast.ts";
import { assertValid, rel, writeJson, writeText, type ManifestEntry } from "./shared.ts";

export const SIZES = [400, 800] as const;
export const SEEDS_PER_SIZE = 2;
const DEPTH = 2;
const ITERATIONS = 10;
/** Target statement lines per chunk (counting nested lines) — phase-2 value. */
export const CHUNK_BUDGET = 25;

const BLOCK_OPEN = /^\s*(?:-\s+)?(?:FOR|IF|WHILE|CASE)\b/;
const BLOCK_CLOSE = /^\s*(?:-\s+)?END\b/;

/**
 * Split the rendered program body into chunks of ~CHUNK_BUDGET statement
 * lines (nested lines count), never splitting inside an open block.
 * Frontmatter and the title heading are dropped; chunks are bare statement
 * sequences. Copied verbatim from phase-2 e3b (frozen).
 */
export function splitChunks(source: string, budget = CHUNK_BUDGET): string[] {
  const lines = source.split("\n");
  // Drop frontmatter (--- ... ---) and the title heading.
  let start = 0;
  if (lines[0]?.trim() === "---") {
    start = lines.indexOf("---", 1) + 1;
  }
  const body = lines
    .slice(start)
    .filter((l) => !l.startsWith("# "));

  const chunks: string[] = [];
  let current: string[] = [];
  let depth = 0;
  let statements = 0;
  for (const line of body) {
    if (BLOCK_OPEN.test(line)) depth++;
    else if (BLOCK_CLOSE.test(line)) depth--;
    current.push(line);
    if (line.trim() !== "") statements++;
    if (depth === 0 && statements >= budget) {
      chunks.push(current.join("\n").trim() + "\n");
      current = [];
      statements = 0;
    }
  }
  const rest = current.join("\n").trim();
  if (rest) chunks.push(rest + "\n");
  if (chunks.length < 2) throw new Error("program too small to chunk");
  return chunks;
}

function chunkFile(i: number): string {
  return `chunks/chunk-${String(i + 1).padStart(2, "0")}.mdz`;
}

// ---------------------------------------------------------------------------
// Prompts (phase-2 e3b worker/orchestrator templates, verbatim)
// ---------------------------------------------------------------------------

const STORE_WORKER_TEMPLATE = `You are an MDZ interpreter executing ONE CHUNK of a larger program. MDZ is a simple imperative notation: keywords in capitals, $variables hold values, Say emits an output line. Read the file {file} and execute it EXACTLY as written, step by step.
State rules — the external state store is the ONLY memory shared with other chunks:
- If the chunk reads a $variable it has not itself assigned, call mcp__state__get with that variable's name and use the returned value. NEVER guess or assume a default.
- After EVERY assignment to a $variable, immediately call mcp__state__set with the variable's name and its new value.
Reply with ONLY the chunk's emitted output lines (from Say statements), in order, one per line, inside a single fenced code block. If the chunk emits nothing, reply with an empty fenced code block.`;

const NOSTORE_WORKER_TEMPLATE = `You are an MDZ interpreter executing ONE CHUNK of a larger program. MDZ is a simple imperative notation: keywords in capitals, $variables hold values, Say emits an output line. Read the file {file} and execute it EXACTLY as written, step by step.
If the chunk reads a $variable it has not itself assigned, use your best guess for its value.
Reply with ONLY the chunk's emitted output lines (from Say statements), in order, one per line, inside a single fenced code block. If the chunk emits nothing, reply with an empty fenced code block.`;

function orchestratorPrompt(chunkFiles: string[], workerTemplate: string): string {
  const list = chunkFiles.map((f) => `./${f}`).join("\n");
  return `You are coordinating the execution of an MDZ program that has been split into ${chunkFiles.length} sequential chunks:

${list}

Rules:
- Do NOT read or execute any chunk yourself. Your only job is coordination.
- For each chunk IN ORDER, spawn exactly one worker with the Task tool and wait for it to finish before spawning the next. Never spawn workers in parallel.
- Each worker's Task prompt must be EXACTLY the following template with {file} replaced by that chunk's path:
--- BEGIN WORKER TEMPLATE ---
${workerTemplate}
--- END WORKER TEMPLATE ---
- After the final worker returns, output ONLY the workers' emitted lines concatenated in chunk order, one per line, inside a single fenced code block. Do not add, drop, or reorder lines.`;
}

// ---------------------------------------------------------------------------
// Seed selection
// ---------------------------------------------------------------------------

interface SeededProgram {
  seed: number;
  program: FlatProgram;
  source: string;
  chunks: string[];
}

/**
 * First SEEDS_PER_SIZE seeds (scanning from 1) whose program renders valid
 * canonical MDZ and chunks cleanly. At 400/800 statements seeds 1 and 2 are
 * both eligible, so the scan is a guard rather than an active filter.
 */
function eligibleSeeds(statements: number): SeededProgram[] {
  const out: SeededProgram[] = [];
  for (let seed = 1; out.length < SEEDS_PER_SIZE && seed <= 100; seed++) {
    try {
      const program = generateProgram({
        seed,
        statements,
        depth: DEPTH,
        iterations: ITERATIONS,
        title: `e3-size${statements}-seed${seed}`,
      });
      const source = renderFlat(program, {});
      assertValid(source, `e3 size${statements} seed${seed}`);
      const chunks = splitChunks(source);
      out.push({ seed, program, source, chunks });
    } catch {
      // ineligible seed; scan forward
    }
  }
  if (out.length < SEEDS_PER_SIZE) {
    throw new Error(`e3: could not find ${SEEDS_PER_SIZE} eligible seeds at size ${statements}`);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Build
// ---------------------------------------------------------------------------

export function buildE3(outDir: string): ManifestEntry[] {
  const dir = join(outDir, "e3");
  const entries: ManifestEntry[] = [];

  for (const statements of SIZES) {
    for (const { seed, program, source, chunks } of eligibleSeeds(statements)) {
      const stem = `size${statements}-seed${seed}`;
      const programPath = join(dir, `${stem}.mdz`);
      const tracePath = join(dir, `${stem}.trace.json`);
      writeText(programPath, source);
      writeJson(tracePath, interpret(program));

      const sandbox: Record<string, string> = {};
      chunks.forEach((c, i) => {
        sandbox[chunkFile(i)] = c;
        writeText(join(dir, stem, chunkFile(i)), c);
      });
      const chunkFiles = chunks.map((_, i) => chunkFile(i));

      const baseVariant = {
        notation: "canonical",
        statements,
        depth: DEPTH,
        iterations: ITERATIONS,
        seed,
      };

      entries.push({
        id: `e3-${stem}-internal`,
        experiment: "e3",
        runMode: "single-turn",
        programPath: rel(programPath),
        tracePath: rel(tracePath),
        prompt: buildPrompt({ program: source, variant: "standard" }),
        variant: { ...baseVariant, arm: "internal" },
      });

      entries.push({
        id: `e3-${stem}-chunked-store`,
        experiment: "e3",
        runMode: "agentic",
        programPath: rel(programPath),
        tracePath: rel(tracePath),
        prompt: orchestratorPrompt(chunkFiles, STORE_WORKER_TEMPLATE),
        variant: { ...baseVariant, chunks: chunks.length, arm: "chunked-store" },
        expected: { chunkCount: chunks.length },
        sandbox,
        mcp: "state",
        allowedTools: ["Task", "Read", "mcp__state__get", "mcp__state__set"],
      });

      entries.push({
        id: `e3-${stem}-chunked-nostore`,
        experiment: "e3",
        runMode: "agentic",
        programPath: rel(programPath),
        tracePath: rel(tracePath),
        prompt: orchestratorPrompt(chunkFiles, NOSTORE_WORKER_TEMPLATE),
        variant: { ...baseVariant, chunks: chunks.length, arm: "chunked-nostore" },
        expected: { chunkCount: chunks.length },
        sandbox,
        allowedTools: ["Task", "Read"],
      });
    }
  }

  writeJson(join(dir, "manifest.json"), entries);
  return entries;
}
