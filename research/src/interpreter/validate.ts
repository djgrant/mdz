/**
 * Validates that generated (canonical-notation) MDZ text is syntactically
 * valid against the conformance grammar in grammar/grammar.peg.
 *
 * Only canonical-notation programs are expected to parse: several q1 notation
 * variants (indentation-only / no-delimiter / malformed) are deliberately
 * off-grammar, and are not validated.
 */

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import peggy from "peggy";

let parser: peggy.Parser | null = null;

function loadParser(): peggy.Parser {
  if (!parser) {
    const here = dirname(fileURLToPath(import.meta.url));
    const grammarPath = resolve(here, "../../../grammar/grammar.peg");
    const grammar = readFileSync(grammarPath, "utf-8");
    parser = peggy.generate(grammar, { allowedStartRules: ["Start"] });
  }
  return parser;
}

export interface ValidationResult {
  ok: boolean;
  error?: string;
}

/**
 * Parses canonical MDZ and returns the block AST (throws on parse failure).
 * Useful for asserting that notation constructs (FOR/IF/...) are recognised
 * as real statements rather than swallowed as host text.
 */
export function parseMdz(source: string): unknown[] {
  return loadParser().parse(source) as unknown[];
}

/** Returns { ok: true } if the source parses, else the parser error message. */
export function validateMdz(source: string): ValidationResult {
  try {
    loadParser().parse(source);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
