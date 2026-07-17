/**
 * E3b — load-bearing external state (Q5 redesign).
 *
 * The original E3 made the state store optional: models journalled ~25% of
 * assignments, so the design measured compliance with a recording instruction
 * rather than whether external state extends the size ceiling. Here the store
 * is the only channel state can flow through: the program is split into
 * sequential chunks, each executed by a separate spawned worker that never
 * sees the rest of the program. Cross-chunk variables can only be recovered
 * via mcp__state__get, and skipping mcp__state__set breaks later chunks —
 * non-compliance now shows up as wrong answers on the primary metric, not as
 * gaps in an auxiliary log.
 *
 * Arms per program:
 *  - chunked-store:   workers have the state tools; the falsifiable claim is
 *                     that accuracy holds past the phase-1 ceiling.
 *  - chunked-nostore: same chunking, no state tools; workers must guess
 *                     cross-chunk values. If chunked-store does not beat this
 *                     control, the store is not doing the work.
 *
 * The e3 `internal` arm (same generator, sizes, and seeds) remains the
 * whole-context baseline. 2 sizes x 2 seeds x 2 arms = 8 manifest entries.
 */

import { join } from "node:path";

import { generateProgram } from "../../../src/generator/generate.ts";
import { renderFlat } from "../../../src/generator/render.ts";
import { interpret } from "../../../src/interpreter/interpret.ts";
import { assertValid, rel, writeJson, writeText, type ManifestEntry } from "./shared.ts";

const SIZES = [100, 200] as const;
const SEEDS = [1, 2] as const;
const DEPTH = 2;
const ITERATIONS = 10;
/** Target statement lines per chunk (counting nested lines); sizes 100/200 give ~4/8 chunks. */
const CHUNK_BUDGET = 25;

const BLOCK_OPEN = /^\s*(?:-\s+)?(?:FOR|IF|WHILE|CASE)\b/;
const BLOCK_CLOSE = /^\s*(?:-\s+)?END\b/;

/**
 * Split the rendered program body into chunks of ~CHUNK_BUDGET statement
 * lines (nested lines count), never splitting inside an open block.
 * Frontmatter and the title heading are dropped; chunks are bare statement
 * sequences.
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
// Prompts
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
// Build
// ---------------------------------------------------------------------------

export function buildE3b(outDir: string): ManifestEntry[] {
  const dir = join(outDir, "e3b");
  const entries: ManifestEntry[] = [];

  for (const statements of SIZES) {
    for (const seed of SEEDS) {
      const program = generateProgram({
        seed,
        statements,
        depth: DEPTH,
        iterations: ITERATIONS,
        title: `e3b-size${statements}-seed${seed}`,
      });
      const source = renderFlat(program, {});
      assertValid(source, `e3b size${statements} seed${seed}`);

      const stem = `size${statements}-seed${seed}`;
      const programPath = join(dir, `${stem}.mdz`);
      const tracePath = join(dir, `${stem}.trace.json`);
      writeText(programPath, source);
      writeJson(tracePath, interpret(program));

      const chunks = splitChunks(source);
      const sandbox: Record<string, string> = {};
      chunks.forEach((c, i) => {
        sandbox[chunkFile(i)] = c;
        writeText(join(dir, stem, chunkFile(i)), c);
      });
      const chunkFiles = chunks.map((_, i) => chunkFile(i));

      const variant = {
        notation: "canonical",
        statements,
        depth: DEPTH,
        iterations: ITERATIONS,
        seed,
        chunks: chunks.length,
      };

      entries.push({
        id: `e3b-${stem}-chunked-store`,
        experiment: "e3b",
        runMode: "agentic",
        programPath: rel(programPath),
        tracePath: rel(tracePath),
        prompt: orchestratorPrompt(chunkFiles, STORE_WORKER_TEMPLATE),
        variant,
        arm: "chunked-store",
        expected: { chunkCount: chunks.length },
        sandbox,
        mcp: "state",
        allowedTools: ["Task", "Read", "mcp__state__get", "mcp__state__set"],
      });

      entries.push({
        id: `e3b-${stem}-chunked-nostore`,
        experiment: "e3b",
        runMode: "agentic",
        programPath: rel(programPath),
        tracePath: rel(tracePath),
        prompt: orchestratorPrompt(chunkFiles, NOSTORE_WORKER_TEMPLATE),
        variant,
        arm: "chunked-nostore",
        expected: { chunkCount: chunks.length },
        sandbox,
        allowedTools: ["Task", "Read"],
      });
    }
  }

  writeJson(join(dir, "manifest.json"), entries);
  return entries;
}
