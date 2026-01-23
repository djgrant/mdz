import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { generate, type Parser } from "peggy";
import { normalizePeggyError, type ParserDiagnostic } from "./diagnostics.js";

type ParseSuccess = { ok: true; ast: unknown };
type ParseFailure = { ok: false; diagnostic: ParserDiagnostic };
export type ParseResult = ParseSuccess | ParseFailure;

let parserPromise: Promise<Parser> | null = null;

const loadParser = async (): Promise<Parser> => {
  if (!parserPromise) {
    parserPromise = (async () => {
      const currentDir = dirname(fileURLToPath(import.meta.url));
      const grammarPath = resolve(currentDir, "../../../grammar/grammar.peg");
      const grammar = await readFile(grammarPath, "utf-8");
      return generate(grammar);
    })();
  }
  return parserPromise;
};

export const parseDocument = async (text: string): Promise<ParseResult> => {
  const parser = await loadParser();
  try {
    return { ok: true, ast: parser.parse(text) };
  } catch (error) {
    return { ok: false, diagnostic: normalizePeggyError(error) };
  }
};
