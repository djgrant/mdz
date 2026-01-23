import {
  parseDocument as parseYamlDocument,
  isMap,
  isScalar,
  type Pair,
  type YAMLMap
} from "yaml";
import { parseTypeValue } from "./parser.js";
import type {
  FrontmatterBlock,
  FrontmatterDiagnostic,
  FrontmatterLocation
} from "./frontmatter.js";

export type FrontmatterTypeEntry = {
  name: string;
  value: unknown;
  raw: string;
  location?: FrontmatterLocation;
};

export type FrontmatterParamEntry = {
  name: string;
  value: unknown;
  raw: string;
  defaultValue?: string;
  location?: FrontmatterLocation;
};

export type FrontmatterAnalysis = {
  types: Record<string, FrontmatterTypeEntry>;
  input: Record<string, FrontmatterParamEntry>;
  context: Record<string, FrontmatterParamEntry>;
};

export type FrontmatterAnalysisResult = {
  analysis: FrontmatterAnalysis;
  diagnostics: FrontmatterDiagnostic[];
};

const DUPLICATE_KEY_CODE = "MDZL0102_DUPLICATE_FRONTMATTER_KEY";
const INVALID_DECL_CODE = "MDZL0103_INVALID_FRONTMATTER_DECL";

const createAnalysis = (): FrontmatterAnalysis => ({
  types: {},
  input: {},
  context: {}
});

const buildLineOffsets = (text: string): number[] => {
  const offsets = [0];
  for (let i = 0; i < text.length; i += 1) {
    if (text[i] === "\n") offsets.push(i + 1);
  }
  return offsets;
};

const offsetToLineColumn = (lineOffsets: number[], offset: number) => {
  let lineIndex = 0;
  while (lineIndex + 1 < lineOffsets.length && lineOffsets[lineIndex + 1] <= offset) {
    lineIndex += 1;
  }
  const lineStart = lineOffsets[lineIndex] ?? 0;
  return { line: lineIndex + 1, column: offset - lineStart + 1 };
};

const locationFromRange = (
  lineOffsets: number[],
  range: [number, number, number] | null | undefined,
  lineOffset: number
): FrontmatterLocation | undefined => {
  if (!range) return undefined;
  const [start, , end] = range;
  const startPos = offsetToLineColumn(lineOffsets, start);
  const endPos = offsetToLineColumn(lineOffsets, end);
  return {
    start: { line: startPos.line + lineOffset, column: startPos.column },
    end: { line: endPos.line + lineOffset, column: endPos.column }
  };
};

const nodeRange = (node: unknown): [number, number, number] | undefined => {
  if (!node || typeof node !== "object") return undefined;
  const range = (node as { range?: [number, number, number] | null }).range;
  return range ?? undefined;
};

const scalarString = (node: Pair["key"] | Pair["value"]): string | null => {
  if (!isScalar(node)) return null;
  if (typeof node.value === "string") return node.value;
  if (node.value === null || node.value === undefined) return null;
  return String(node.value);
};

const normalizeTypeExpression = (raw: string): string => {
  let text = raw.trim();
  text = text.replace(/\$([A-Za-z_][A-Za-z0-9_]*)/g, "$1");
  if (text.endsWith("[]")) {
    const inner = text.slice(0, -2).trim();
    text = `Array<${inner}>`;
  }
  return text;
};

const splitDeclarationValue = (raw: string): { typeText: string; defaultText?: string } => {
  const eqIndex = raw.indexOf("=");
  if (eqIndex === -1) {
    return { typeText: raw.trim() };
  }
  return {
    typeText: raw.slice(0, eqIndex).trim(),
    defaultText: raw.slice(eqIndex + 1).trim()
  };
};

const pushDuplicateKey = (
  diagnostics: FrontmatterDiagnostic[],
  name: string,
  location?: FrontmatterLocation
) => {
  diagnostics.push({
    code: DUPLICATE_KEY_CODE,
    message: `Duplicate frontmatter key "${name}".`,
    location
  });
};

const pushInvalidDeclaration = (
  diagnostics: FrontmatterDiagnostic[],
  name: string,
  message: string,
  location?: FrontmatterLocation
) => {
  diagnostics.push({
    code: INVALID_DECL_CODE,
    message: `Invalid frontmatter declaration for "${name}": ${message}`,
    location
  });
};

const parseDeclarations = async (
  map: YAMLMap,
  kind: "types" | "input" | "context",
  lineOffsets: number[],
  lineOffset: number,
  diagnostics: FrontmatterDiagnostic[],
  target: FrontmatterAnalysis
) => {
  const seen = new Set<string>();
  for (const pair of map.items) {
    const key = scalarString(pair.key);
    if (!key) continue;
    const location = locationFromRange(lineOffsets, nodeRange(pair.key), lineOffset);
    if (seen.has(key)) {
      pushDuplicateKey(diagnostics, `${kind}.${key}`, location);
      continue;
    }
    seen.add(key);

    const rawValue = scalarString(pair.value);
    if (!rawValue) {
      pushInvalidDeclaration(diagnostics, `${kind}.${key}`, "Expected a string value.", location);
      continue;
    }

    if (kind === "types") {
      const normalized = normalizeTypeExpression(rawValue);
      const result = await parseTypeValue(normalized);
      if (!result.ok) {
        pushInvalidDeclaration(diagnostics, `${kind}.${key}`, result.diagnostic.message, location);
        continue;
      }
      target.types[key] = {
        name: key,
        raw: rawValue,
        value: result.value,
        location
      };
      continue;
    }

    const { typeText, defaultText } = splitDeclarationValue(rawValue);
    if (!typeText) {
      pushInvalidDeclaration(diagnostics, `${kind}.${key}`, "Missing type annotation.", location);
      continue;
    }
    if (defaultText !== undefined && defaultText.length === 0) {
      pushInvalidDeclaration(diagnostics, `${kind}.${key}`, "Default value is empty.", location);
      continue;
    }
    const normalized = normalizeTypeExpression(typeText);
    const result = await parseTypeValue(normalized);
    if (!result.ok) {
      pushInvalidDeclaration(diagnostics, `${kind}.${key}`, result.diagnostic.message, location);
      continue;
    }
    target[kind][key] = {
      name: key,
      raw: rawValue,
      value: result.value,
      ...(defaultText ? { defaultValue: defaultText } : {}),
      location
    };
  }
};

export const analyzeFrontmatter = async (
  frontmatter: FrontmatterBlock
): Promise<FrontmatterAnalysisResult> => {
  const diagnostics: FrontmatterDiagnostic[] = [];
  const analysis = createAnalysis();
  const doc = parseYamlDocument(frontmatter.content, { uniqueKeys: false });
  const root = doc.contents;
  if (!root || !isMap(root)) {
    return { analysis, diagnostics };
  }

  const lineOffsets = buildLineOffsets(frontmatter.content);
  const lineOffset = frontmatter.location.start.line;
  const seenTopLevel = new Set<string>();

  for (const pair of root.items) {
    const key = scalarString(pair.key);
    if (!key) continue;
    const location = locationFromRange(lineOffsets, nodeRange(pair.key), lineOffset);
    if (seenTopLevel.has(key)) {
      pushDuplicateKey(diagnostics, key, location);
      continue;
    }
    seenTopLevel.add(key);

    if (key !== "types" && key !== "input" && key !== "context") continue;
    if (!pair.value || !isMap(pair.value)) {
      diagnostics.push({
        code: INVALID_DECL_CODE,
        message: `Frontmatter field "${key}" must be a map.`,
        location: locationFromRange(lineOffsets, nodeRange(pair.value), lineOffset)
      });
      continue;
    }
    await parseDeclarations(pair.value, key, lineOffsets, lineOffset, diagnostics, analysis);
  }

  return { analysis, diagnostics };
};
