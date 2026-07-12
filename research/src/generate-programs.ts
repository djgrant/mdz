/**
 * Materialises the full experiment program set per benchmark/DESIGN.md into
 * benchmark/programs/<exp>/..., writing each program's reference trace
 * alongside as <name>.trace.json and a manifest.json per experiment.
 *
 * Usage: pnpm --filter @mdz/benchmark generate  [--out <dir>] [--seeds N]
 */

import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { generateProgram } from "./generator/generate.ts";
import { generateModuleTree } from "./generator/modules.ts";
import { renderFlat, renderTree, type Notation } from "./generator/render.ts";
import { Q3_TASKS } from "./generator/q3-tasks.ts";
import { interpret } from "./interpreter/interpret.ts";
import { validateMdz } from "./interpreter/validate.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const BENCH_ROOT = resolve(HERE, "..");
const PHASE = process.argv.includes("--phase")
  ? process.argv[process.argv.indexOf("--phase") + 1]
  : "phase-1";
export const PHASE_ROOT = join(BENCH_ROOT, PHASE);

export interface ManifestEntry {
  programPath: string; // relative to the phase root (e.g. phase-1/)
  tracePath: string | null;
  variant: Record<string, unknown>;
  seed: number;
  arm?: string;
}

interface Cli {
  out: string;
  seeds: number;
}

function parseArgs(argv: string[]): Cli {
  const out = argv.includes("--out") ? argv[argv.indexOf("--out") + 1] : join(PHASE_ROOT, "programs");
  const seeds = argv.includes("--seeds") ? Number(argv[argv.indexOf("--seeds") + 1]) : 5;
  return { out: resolve(out), seeds };
}

function rel(absPath: string): string {
  return absPath.slice(PHASE_ROOT.length + 1);
}

function writeText(absPath: string, content: string): void {
  mkdirSync(dirname(absPath), { recursive: true });
  writeFileSync(absPath, content);
}

function writeJson(absPath: string, value: unknown): void {
  writeText(absPath, JSON.stringify(value, null, 2) + "\n");
}

let validationFailures = 0;

export function resetValidationFailures(): void {
  validationFailures = 0;
}
export function getValidationFailures(): number {
  return validationFailures;
}

/** Validate only canonical-notation source (other variants are off-grammar). */
function assertCanonicalValid(source: string, label: string): void {
  const res = validateMdz(source);
  if (!res.ok) {
    validationFailures++;
    console.error(`  ! invalid canonical MDZ for ${label}: ${res.error}`);
  }
}

// ---------------------------------------------------------------------------
// q1: notation -> error rate (fixed size 40, one factor at a time)
// ---------------------------------------------------------------------------

interface NotationVariant {
  label: string;
  notation?: Partial<Notation>;
  malformed?: boolean;
}

const Q1_VARIANTS: NotationVariant[] = [
  { label: "canonical" },
  { label: "casing-lower", notation: { casing: "lower" } },
  { label: "delimiter-indent", notation: { delimiter: "indent" } },
  { label: "delimiter-none", notation: { delimiter: "none" } },
  { label: "annotations-annotated", notation: { annotations: "annotated" } },
  { label: "annotations-mismatch", notation: { annotations: "mismatch" } },
  { label: "malformed", malformed: true },
];

export function buildQ1(outDir: string, seeds: number): ManifestEntry[] {
  const dir = join(outDir, "q1");
  const entries: ManifestEntry[] = [];
  for (let seed = 1; seed <= seeds; seed++) {
    const program = generateProgram({ seed, statements: 40, depth: 2, iterations: 5, title: `q1-seed${seed}` });
    const trace = interpret(program);
    const tracePath = join(dir, `stmt40-seed${seed}.trace.json`);
    writeJson(tracePath, trace);
    for (const v of Q1_VARIANTS) {
      const source = renderFlat(program, { notation: v.notation, malformed: v.malformed, seed });
      const programPath = join(dir, `stmt40-seed${seed}-${v.label}.mdz`);
      writeText(programPath, source);
      if (v.label === "canonical") assertCanonicalValid(source, rel(programPath));
      entries.push({
        programPath: rel(programPath),
        tracePath: rel(tracePath),
        variant: { notation: v.label, statements: 40, depth: 2, iterations: 5, malformed: !!v.malformed },
        seed,
      });
    }
  }
  writeJson(join(dir, "manifest.json"), entries);
  return entries;
}

// ---------------------------------------------------------------------------
// q2: size -> breakdown (canonical notation)
// ---------------------------------------------------------------------------

export function buildQ2(outDir: string, seeds: number): ManifestEntry[] {
  const dir = join(outDir, "q2");
  const entries: ManifestEntry[] = [];

  const cells: { name: string; statements: number; depth: number; iterations: number }[] = [];
  for (const statements of [10, 25, 50, 100, 200]) {
    cells.push({ name: `size${statements}`, statements, depth: 2, iterations: 10 });
  }
  for (const depth of [1, 3, 5]) {
    cells.push({ name: `depth${depth}`, statements: 50, depth, iterations: 10 });
  }
  for (const iterations of [5, 25, 100]) {
    cells.push({ name: `iter${iterations}`, statements: 50, depth: 2, iterations });
  }

  for (const cell of cells) {
    for (let seed = 1; seed <= seeds; seed++) {
      const program = generateProgram({ ...cell, seed, title: `q2-${cell.name}-seed${seed}` });
      const source = renderFlat(program, {});
      const trace = interpret(program);
      const programPath = join(dir, `${cell.name}-seed${seed}.mdz`);
      const tracePath = join(dir, `${cell.name}-seed${seed}.trace.json`);
      writeText(programPath, source);
      writeJson(tracePath, trace);
      assertCanonicalValid(source, rel(programPath));
      entries.push({
        programPath: rel(programPath),
        tracePath: rel(tracePath),
        variant: { notation: "canonical", statements: cell.statements, depth: cell.depth, iterations: cell.iterations, cell: cell.name },
        seed,
      });
    }
  }
  writeJson(join(dir, "manifest.json"), entries);
  return entries;
}

// ---------------------------------------------------------------------------
// q3: procedure vs goal (hand-written tasks)
// ---------------------------------------------------------------------------

export function buildQ3(outDir: string): ManifestEntry[] {
  const dir = join(outDir, "q3");
  const entries: ManifestEntry[] = [];
  let seed = 1;
  for (const task of Q3_TASKS) {
    const procPath = join(dir, `${task.id}.procedure.mdz`);
    const procSource = `${task.procedure}\n<!-- input -->\n\n${task.input}\n`;
    writeText(procPath, procSource);
    assertCanonicalValid(procSource, rel(procPath));

    const goalPath = join(dir, `${task.id}.goal.md`);
    writeText(goalPath, `# Goal\n\n${task.goal}\n\n## Input\n\n${task.input}\n`);

    entries.push({
      programPath: rel(procPath),
      tracePath: null,
      variant: { task: task.id, scoring: "output-divergence" },
      seed,
      arm: "A-procedure",
    });
    entries.push({
      programPath: rel(goalPath),
      tracePath: null,
      variant: { task: task.id, scoring: "output-divergence" },
      seed,
      arm: "B-goal",
    });
    seed++;
  }
  writeJson(join(dir, "manifest.json"), entries);
  return entries;
}

// ---------------------------------------------------------------------------
// q4: cross-module binding (module trees, call depth 1..4)
// ---------------------------------------------------------------------------

export function buildQ4(outDir: string, seeds: number): ManifestEntry[] {
  const dir = join(outDir, "q4");
  const entries: ManifestEntry[] = [];
  for (const depth of [1, 2, 3, 4]) {
    for (let seed = 1; seed <= seeds; seed++) {
      const tree = generateModuleTree({ seed, depth, params: 3, title: `q4-depth${depth}-seed${seed}` });
      const files = renderTree(tree, {});
      const trace = interpret(tree);
      const folder = join(dir, `depth${depth}-seed${seed}`);
      let rootPath = "";
      for (const f of files) {
        const abs = join(folder, f.file);
        writeText(abs, f.content);
        assertCanonicalValid(f.content, rel(abs));
        if (f.file === "root.mdz") rootPath = abs;
      }
      const tracePath = join(folder, "root.trace.json");
      writeJson(tracePath, trace);
      entries.push({
        programPath: rel(rootPath),
        tracePath: rel(tracePath),
        variant: { notation: "canonical", callDepth: depth, paramsPerBoundary: 3 },
        seed,
      });
    }
  }
  writeJson(join(dir, "manifest.json"), entries);
  return entries;
}

// ---------------------------------------------------------------------------
// q5: external state (large programs, two arms sharing each program)
// ---------------------------------------------------------------------------

export function buildQ5(outDir: string, seeds: number): ManifestEntry[] {
  const dir = join(outDir, "q5");
  const entries: ManifestEntry[] = [];
  for (const statements of [100, 200]) {
    for (let seed = 1; seed <= seeds; seed++) {
      const program = generateProgram({ seed, statements, depth: 2, iterations: 10, title: `q5-size${statements}-seed${seed}` });
      const source = renderFlat(program, {});
      const trace = interpret(program);
      const programPath = join(dir, `size${statements}-seed${seed}.mdz`);
      const tracePath = join(dir, `size${statements}-seed${seed}.trace.json`);
      writeText(programPath, source);
      writeJson(tracePath, trace);
      assertCanonicalValid(source, rel(programPath));
      const variant = { notation: "canonical", statements, depth: 2, iterations: 10 };
      // Both arms execute the same program; the arm differs only in the harness
      // instruction (internal execution vs an explicit state-ledger block).
      entries.push({ programPath: rel(programPath), tracePath: rel(tracePath), variant, seed, arm: "A-internal" });
      entries.push({ programPath: rel(programPath), tracePath: rel(tracePath), variant, seed, arm: "B-state-ledger" });
    }
  }
  writeJson(join(dir, "manifest.json"), entries);
  return entries;
}

function main(): void {
  const { out, seeds } = parseArgs(process.argv.slice(2));
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });

  const counts: Record<string, number> = {};
  counts.q1 = buildQ1(out, seeds).length;
  counts.q2 = buildQ2(out, seeds).length;
  counts.q3 = buildQ3(out).length;
  counts.q4 = buildQ4(out, seeds).length;
  counts.q5 = buildQ5(out, seeds).length;

  console.log(`Generated programs into ${rel(out) || out}`);
  for (const [exp, n] of Object.entries(counts)) console.log(`  ${exp}: ${n} manifest entries`);
  if (validationFailures > 0) {
    console.error(`\n${validationFailures} canonical program(s) failed grammar validation`);
    process.exit(1);
  }
}

const invokedDirectly =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;
if (invokedDirectly) main();
