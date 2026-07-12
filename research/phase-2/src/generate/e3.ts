/**
 * E3 — external state store.
 *
 * Programs from the phase-1 q5 generator at 100 and 200 statements, 2 seeds
 * each. Two arms per program:
 *  - internal: single-turn, phase-1 internal-arm prompt verbatim
 *  - store:    agentic, MCP "state" server; set on every assignment, get
 *              before reads, emitted lines only in the output (no JSON trace)
 *
 * 2 sizes x 2 seeds x 2 arms = 8 manifest entries.
 */

import { join } from "node:path";

import { generateProgram } from "../../../src/generator/generate.ts";
import { renderFlat } from "../../../src/generator/render.ts";
import { interpret } from "../../../src/interpreter/interpret.ts";
import { buildPrompt } from "../../../src/harness/prompt.ts";
import { assertValid, rel, writeJson, writeText, type ManifestEntry } from "./shared.ts";

const SIZES = [100, 200] as const;
const SEEDS = [1, 2] as const;
const DEPTH = 2;
const ITERATIONS = 10;

function storePrompt(program: string): string {
  return `You are an MDZ interpreter with an EXTERNAL STATE STORE. MDZ is a
simple imperative notation for procedures. Execute the given MDZ program
EXACTLY as written, step by step. Follow it literally; do not optimise or skip.

Use the state store, not your own memory, for program state:
- For EVERY variable assignment, immediately call the state tool
  mcp__state__set with the variable name and its new value.
- Before reading a variable you have not just written, call mcp__state__get
  with the variable name and use the returned value.

Do not keep a self-reported trace. When the program produces an observable
output line (e.g. "Say ..."), collect it. When execution finishes, print ONLY
the program's emitted lines, in order, one per line, inside a single fenced
code block. Do not output a JSON trace.

Program to execute:
--- BEGIN PROGRAM ---
${program}
--- END PROGRAM ---`;
}

export function buildE3(outDir: string): ManifestEntry[] {
  const dir = join(outDir, "e3");
  const entries: ManifestEntry[] = [];

  for (const statements of SIZES) {
    for (const seed of SEEDS) {
      const program = generateProgram({
        seed,
        statements,
        depth: DEPTH,
        iterations: ITERATIONS,
        title: `e3-size${statements}-seed${seed}`,
      });
      const source = renderFlat(program, {});
      assertValid(source, `e3 size${statements} seed${seed}`);

      const stem = `size${statements}-seed${seed}`;
      const programPath = join(dir, `${stem}.mdz`);
      const tracePath = join(dir, `${stem}.trace.json`);
      writeText(programPath, source);
      writeJson(tracePath, interpret(program));

      const variant = {
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
        variant,
        arm: "internal",
      });

      entries.push({
        id: `e3-${stem}-store`,
        experiment: "e3",
        runMode: "agentic",
        programPath: rel(programPath),
        tracePath: rel(tracePath),
        prompt: storePrompt(source),
        variant,
        arm: "store",
        mcp: "state",
        allowedTools: ["mcp__state__get", "mcp__state__set"],
      });
    }
  }

  writeJson(join(dir, "manifest.json"), entries);
  return entries;
}
