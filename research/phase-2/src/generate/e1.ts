/**
 * E1 — strict mode.
 *
 * Programs from the phase-1 canonical generator at 40 statements, 5 seeds.
 * Conditions: clean / syntax-fault (FOR header missing IN) / type-fault (one
 * annotation contradicted by its literal value, variable used downstream).
 * Modes: default (phase-1 preamble verbatim) and strict (program begins with
 * PRAGMA STRICT; the preamble gains two lines defining halt semantics).
 *
 * 2 modes x 3 conditions x 5 seeds = 30 manifest entries.
 *
 * Grammar cells: the original strict preamble demanded well-formed syntax
 * without ever stating the grammar, so a model could not recognise a missing
 * IN as malformed — the phase-2 syntax result was confounded. A second set of
 * entries repeats the informative cells with the grammar spelled out in the
 * preamble: {default, strict} x {clean, syntax} plus strict x type.
 * 5 cells x 5 seeds = 25 further entries.
 */

import { join } from "node:path";

import { generateProgram } from "../../../src/generator/generate.ts";
import { renderFlat } from "../../../src/generator/render.ts";
import { interpret } from "../../../src/interpreter/interpret.ts";
import { validateMdz } from "../../../src/interpreter/validate.ts";
import { buildPrompt } from "../../../src/harness/prompt.ts";
import {
  assertValid,
  rel,
  writeJson,
  writeText,
  type ManifestEntry,
} from "./shared.ts";

const STATEMENTS = 40;
const DEPTH = 2;
const ITERATIONS = 5;
const SEED_COUNT = 5;

type Mode = "default" | "strict";
type Condition = "clean" | "syntax" | "type";

// ---------------------------------------------------------------------------
// Fault injection (on the rendered canonical text)
// ---------------------------------------------------------------------------

const FOR_HEADER = /^(\s*)FOR \$\w+ IN \[/;

/** Strip " IN" from the first FOR header. Returns null if there is no FOR. */
export function injectSyntaxFault(source: string): string | null {
  const lines = source.split("\n");
  const idx = lines.findIndex((l) => FOR_HEADER.test(l));
  if (idx === -1) return null;
  lines[idx] = lines[idx].replace(" IN ", " ");
  return lines.join("\n");
}

const NUM_LITERAL_ASSIGN = /^(\s*)\$(\w+) = (\d+)$/;
const STR_LITERAL_ASSIGN = /^(\s*)\$(\w+) = ("[^"]*")$/;

/**
 * Annotate the first literal assignment whose variable is read downstream with
 * the contradicting type (number literal -> : String, string -> : Number).
 * Returns null if no eligible assignment exists.
 */
export function injectTypeFault(source: string): string | null {
  const lines = source.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const num = NUM_LITERAL_ASSIGN.exec(lines[i]);
    const str = num ? null : STR_LITERAL_ASSIGN.exec(lines[i]);
    const m = num ?? str;
    if (!m) continue;
    const [, indent, name, literal] = m;
    const usedDownstream = new RegExp(`\\$${name}\\b`);
    if (!lines.slice(i + 1).some((l) => usedDownstream.test(l))) continue;
    const wrongType = num ? "String" : "Number";
    lines[i] = `${indent}$${name}: ${wrongType} = ${literal}`;
    return lines.join("\n");
  }
  return null;
}

// ---------------------------------------------------------------------------
// PRAGMA STRICT + strict preamble
// ---------------------------------------------------------------------------

/** Insert PRAGMA STRICT as the first MDZ statement (after the title heading). */
export function addPragmaStrict(source: string): string {
  const lines = source.split("\n");
  const titleIdx = lines.findIndex((l) => l.startsWith("# "));
  if (titleIdx === -1) throw new Error("no title heading in rendered program");
  lines.splice(titleIdx + 1, 0, "", "PRAGMA STRICT");
  return lines.join("\n");
}

const STRICT_LINES = `This program declares PRAGMA STRICT: before executing anything, validate the whole program — every statement must be syntactically well-formed and every type annotation must match its value.
On any syntax or type violation, output a trace containing a single step { "step": 1, "action": "halt", "reason": "<what is wrong and where>" } and stop; execute no steps.`;

const GRAMMAR_LINES = `The complete MDZ grammar for this program class:
- MDZ is embedded in a Markdown host document: YAML frontmatter (--- ... ---), headings (# ...), and blank lines are host text, NOT MDZ statements — they are never validated as syntax.
- Directive:    PRAGMA <name> (e.g. PRAGMA STRICT)
- Assignment:   $name = <expr>   with an optional type annotation ($name: Number = 5, $name: String = "a"); an annotation must match the type of the assigned value.
- Output:       Say <expr>
- Conditional:  IF <condition> [THEN] ... [ELSE ...] END
- List loop:    FOR $name IN [v1, v2, ...] ... END — the IN keyword is required between the loop variable and the list.
- While loop:   WHILE <condition> ... END
- Case:         CASE <expr> WHEN <value> ... [WHEN <value> ...] [ELSE ...] END
- Every block opened by IF, FOR, WHILE, or CASE is closed by a matching END.
- Expressions use $variables, number and "string" literals, arithmetic (+, -, *) and comparisons (=, !=, <, >).
A statement that does not match one of these forms is a syntax error.`;

const SPLICE_MARKER = "Output ONLY the final trace";

function spliceBeforeMarker(base: string, lines: string[]): string {
  if (!base.includes(SPLICE_MARKER)) {
    throw new Error("phase-1 prompt changed shape; cannot splice preamble lines");
  }
  return base.replace(SPLICE_MARKER, `${lines.join("\n\n")}\n\n${SPLICE_MARKER}`);
}

/** Phase-1 standard prompt, optionally with grammar and/or strict lines added. */
export function e1Prompt(
  program: string,
  opts: { strict?: boolean; grammar?: boolean } = {},
): string {
  const base = buildPrompt({ program, variant: "standard" });
  const lines: string[] = [];
  if (opts.grammar) lines.push(GRAMMAR_LINES);
  if (opts.strict) lines.push(STRICT_LINES);
  return lines.length ? spliceBeforeMarker(base, lines) : base;
}

/** Phase-1 standard prompt with the two strict lines added to the preamble. */
export function strictPrompt(program: string): string {
  return e1Prompt(program, { strict: true });
}

// ---------------------------------------------------------------------------
// Seed selection: first N seeds whose program supports both fault kinds
// ---------------------------------------------------------------------------

interface SeedProgram {
  seed: number;
  clean: string;
  syntaxFaulted: string;
  typeFaulted: string;
  trace: unknown;
}

export function selectSeedPrograms(count = SEED_COUNT): SeedProgram[] {
  const out: SeedProgram[] = [];
  for (let seed = 1; out.length < count && seed <= 100; seed++) {
    const program = generateProgram({
      seed,
      statements: STATEMENTS,
      depth: DEPTH,
      iterations: ITERATIONS,
      title: `e1-seed${seed}`,
    });
    const clean = renderFlat(program, {});
    const syntaxFaulted = injectSyntaxFault(clean);
    const typeFaulted = injectTypeFault(clean);
    if (!syntaxFaulted || !typeFaulted) continue;
    out.push({ seed, clean, syntaxFaulted, typeFaulted, trace: interpret(program) });
  }
  if (out.length < count) throw new Error("could not find enough eligible seeds");
  return out;
}

// ---------------------------------------------------------------------------
// Build
// ---------------------------------------------------------------------------

export function buildE1(outDir: string): ManifestEntry[] {
  const dir = join(outDir, "e1");
  const entries: ManifestEntry[] = [];

  for (const sp of selectSeedPrograms()) {
    const { seed } = sp;

    assertValid(sp.clean, `e1 clean seed${seed}`);
    // Sanity: the syntax fault must be off-grammar, the type fault on-grammar.
    if (validateMdz(sp.syntaxFaulted).ok) {
      throw new Error(`e1 seed${seed}: syntax-faulted program still parses`);
    }
    assertValid(sp.typeFaulted, `e1 type-faulted seed${seed}`);

    const cleanTracePath = join(dir, `clean-seed${seed}.trace.json`);
    writeJson(cleanTracePath, sp.trace);

    const sources: Record<Condition, string> = {
      clean: sp.clean,
      syntax: sp.syntaxFaulted,
      type: sp.typeFaulted,
    };

    const pushEntry = (mode: Mode, condition: Condition, grammar: boolean) => {
      const source =
        mode === "strict" ? addPragmaStrict(sources[condition]) : sources[condition];
      const name = `${mode}-${condition}-seed${seed}`;
      const programPath = join(dir, `${name}.mdz`);
      writeText(programPath, source);

      let tracePath: string | null;
      let expected: Record<string, unknown>;
      if (mode === "strict" && condition !== "clean") {
        // Reference: a single halt step.
        const reason =
          condition === "syntax"
            ? "syntax error: FOR header missing IN"
            : "type violation: annotation contradicts the assigned literal";
        const haltTracePath = join(dir, `${name}.trace.json`);
        writeJson(haltTracePath, [{ step: 1, action: "halt", reason }]);
        tracePath = rel(haltTracePath);
        expected = { behaviour: "halt", haltReason: condition };
      } else if (mode === "default" && condition === "syntax") {
        // No reference: we observe whether the model halts, repairs or improvises.
        tracePath = null;
        expected = { behaviour: "observe" };
      } else {
        // clean (both modes) and default type-fault: the shared interpreter
        // ignores annotations, so the coerced execution equals the clean trace.
        tracePath = rel(cleanTracePath);
        expected =
          condition === "type"
            ? { behaviour: "execute", note: "annotation ignored; trace equals clean" }
            : { behaviour: "execute" };
      }

      entries.push({
        id: `e1-${mode}${grammar ? "-grammar" : ""}-${condition}-seed${seed}`,
        experiment: "e1",
        runMode: "single-turn",
        programPath: rel(programPath),
        tracePath,
        prompt: e1Prompt(source, { strict: mode === "strict", grammar }),
        variant: {
          mode,
          condition,
          grammar,
          statements: STATEMENTS,
          depth: DEPTH,
          iterations: ITERATIONS,
          seed,
        },
        expected,
      });
    };

    for (const mode of ["default", "strict"] as const) {
      for (const condition of ["clean", "syntax", "type"] as const) {
        pushEntry(mode, condition, false);
      }
    }

    // Grammar-in-preamble cells (deconfounds the syntax half of the strict result).
    const GRAMMAR_CELLS: Array<[Mode, Condition]> = [
      ["default", "clean"],
      ["default", "syntax"],
      ["strict", "clean"],
      ["strict", "syntax"],
      ["strict", "type"],
    ];
    for (const [mode, condition] of GRAMMAR_CELLS) pushEntry(mode, condition, true);
  }

  writeJson(join(dir, "manifest.json"), entries);
  return entries;
}
