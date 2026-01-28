import { resolve } from "node:path";
import { TypeEnvironment } from "./types.js";
import { slugifyHeading } from "./links.js";

export type DefinitionLocation = {
  uri: string;
  range: {
    start: { line: number; column: number };
    end: { line: number; column: number };
  };
};

export type DefinitionResult = DefinitionLocation | null;

export type DefinitionContext = {
  text: string;
  uri: string;
  line: number;
  column: number;
  typeEnv?: TypeEnvironment;
  rootPath?: string;
};

const getLineContent = (text: string, lineNumber: number): string => {
  const lines = text.split(/\r?\n/);
  const index = lineNumber - 1;
  if (index < 0 || index >= lines.length) return "";
  return lines[index];
};

const getWordAtPosition = (
  line: string,
  column: number
): { word: string; start: number; end: number } | null => {
  const col = column - 1;
  if (col < 0 || col >= line.length) return null;

  let start = col;
  let end = col;

  while (start > 0 && /[\w$#~\/.+-]/.test(line[start - 1])) {
    start--;
  }

  while (end < line.length && /[\w$#~\/.+-]/.test(line[end])) {
    end++;
  }

  const word = line.slice(start, end);
  if (!word) return null;

  return { word, start: start + 1, end: end + 1 };
};

const findVariableDefinition = (
  name: string,
  env: TypeEnvironment
): DefinitionLocation | null => {
  const binding = env.lookupVariable(name);
  if (!binding || !binding.location) return null;

  return {
    uri: "",
    range: binding.location
  };
};

const findTypeDefinition = (
  name: string,
  env: TypeEnvironment
): DefinitionLocation | null => {
  const decl = env.lookupType(name);
  if (!decl || !decl.location) return null;

  return {
    uri: "",
    range: decl.location
  };
};

const findAnchorDefinition = (
  anchor: string,
  text: string,
  uri: string
): DefinitionLocation | null => {
  const slug = anchor.startsWith("#") ? anchor.slice(1) : anchor;
  const lines = text.split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const match = /^(#{1,6})\s+(.+)\s*$/.exec(lines[i]);
    if (match && slugifyHeading(match[2]) === slug) {
      const level = match[1].length;
      const lineNum = i + 1;
      return {
        uri,
        range: {
          start: { line: lineNum, column: level + 2 },
          end: { line: lineNum, column: lines[i].length + 1 }
        }
      };
    }
  }

  return null;
};

const resolvePathToUri = (path: string, rootPath?: string): string | null => {
  if (!path.startsWith("~/") || !rootPath) return null;

  const relativePath = path.slice(2);
  const extensions = ["", ".mdz", ".md"];

  for (const ext of extensions) {
    const fullPath = resolve(rootPath, relativePath + ext);
    return `file://${fullPath}`;
  }

  return null;
};

export const getDefinition = (context: DefinitionContext): DefinitionResult => {
  const line = getLineContent(context.text, context.line);
  const wordInfo = getWordAtPosition(line, context.column);

  if (!wordInfo) return null;

  const { word } = wordInfo;

  if (word.startsWith("$") && context.typeEnv) {
    const result = findVariableDefinition(word, context.typeEnv);
    if (result) {
      return { ...result, uri: result.uri || context.uri };
    }
  }

  if (/^[A-Z][a-zA-Z0-9_]*$/.test(word) && context.typeEnv) {
    const result = findTypeDefinition(word, context.typeEnv);
    if (result) {
      return { ...result, uri: result.uri || context.uri };
    }
  }

  if (word.startsWith("#")) {
    return findAnchorDefinition(word, context.text, context.uri);
  }

  if (word.startsWith("~/")) {
    const targetUri = resolvePathToUri(word, context.rootPath);
    if (targetUri) {
      return {
        uri: targetUri,
        range: {
          start: { line: 1, column: 1 },
          end: { line: 1, column: 1 }
        }
      };
    }
  }

  return null;
};
