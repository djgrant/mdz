import { TypeEnvironment, type MdzType } from "./types.js";
import { collectAnchors, slugifyHeading } from "./links.js";

export type HoverResult = {
  content: string;
  range?: {
    start: { line: number; column: number };
    end: { line: number; column: number };
  };
} | null;

export type HoverContext = {
  text: string;
  line: number;
  column: number;
  typeEnv?: TypeEnvironment;
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

  while (start > 0 && /[\w$#~\/-]/.test(line[start - 1])) {
    start--;
  }

  while (end < line.length && /[\w$#~\/-]/.test(line[end])) {
    end++;
  }

  const word = line.slice(start, end);
  if (!word) return null;

  return { word, start: start + 1, end: end + 1 };
};

const formatType = (type: MdzType, indent = 0): string => {
  const prefix = "  ".repeat(indent);

  switch (type.kind) {
    case "builtin":
      return `${prefix}${type.name}`;
    case "ref":
      if (type.args && type.args.length > 0) {
        return `${prefix}${type.name}<${type.args.map((a) => formatType(a)).join(", ")}>`;
      }
      return `${prefix}${type.name}`;
    case "literal":
      return typeof type.value === "string"
        ? `${prefix}"${type.value}"`
        : `${prefix}${type.value}`;
    case "enum":
      return type.variants.map((v) => formatType(v)).join(" | ");
    case "tuple":
      return `(${type.elements.map((e) => formatType(e)).join(", ")})`;
    case "array":
      return `Array<${formatType(type.element)}>`;
    case "lambda":
      return `(${type.params.join(", ")}) => ...`;
    case "semantic":
      return type.description;
    case "link":
      return type.linkKind === "anchor" ? "Anchor" : "Path";
    default:
      return "unknown";
  }
};

const getVariableHover = (
  name: string,
  env: TypeEnvironment
): HoverResult => {
  const binding = env.lookupVariable(name);
  if (!binding) return null;

  const typeStr = formatType(binding.type);
  const sourceLabel = binding.source === "input"
    ? "Input parameter"
    : binding.source === "context"
      ? "Context variable"
      : "Local variable";

  const content = [
    "```mdz",
    `${name}: ${typeStr}`,
    "```",
    "",
    `**${sourceLabel}**`
  ].join("\n");

  return { content };
};

const getTypeHover = (name: string, env: TypeEnvironment): HoverResult => {
  const decl = env.lookupType(name);
  if (!decl) return null;

  const typeStr = formatType(decl.type);
  const content = [
    "```mdz",
    `TYPE ${name} = ${typeStr}`,
    "```"
  ].join("\n");

  return { content };
};

const getAnchorHover = (anchor: string, text: string): HoverResult => {
  const anchors = collectAnchors(text);
  const slug = anchor.startsWith("#") ? anchor.slice(1) : anchor;

  const count = anchors.get(slug);
  if (!count) return null;

  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const match = /^(#{1,6})\s+(.+)\s*$/.exec(lines[i]);
    if (match && slugifyHeading(match[2]) === slug) {
      const level = match[1].length;
      const title = match[2].trim();
      const content = [
        "```markdown",
        `${"#".repeat(level)} ${title}`,
        "```",
        "",
        `Line ${i + 1}`
      ].join("\n");

      return { content };
    }
  }

  return null;
};

const getPathHover = (path: string): HoverResult => {
  if (!path.startsWith("~/")) return null;

  const content = [
    "```mdz",
    path,
    "```",
    "",
    "**Link to file**",
    "",
    `Resolves to: \`${path.slice(2)}\``
  ].join("\n");

  return { content };
};

const getKeywordHover = (keyword: string): HoverResult => {
  const docs: Record<string, string> = {
    FOR: "Loop over items.\n\n```mdz\nFOR $item IN $items\n  ...\nEND\n```",
    WHILE: "Loop while condition is true.\n\n```mdz\nWHILE $condition\n  ...\nEND\n```",
    IF: "Conditional branch.\n\n```mdz\nIF $condition THEN\n  ...\nELSE\n  ...\nEND\n```",
    CASE: "Pattern matching.\n\n```mdz\nCASE $value\nWHEN $pattern\n  ...\nEND\n```",
    DO: "Explicit block scope.\n\n```mdz\nDO\n  ...\nEND\n```",
    SPAWN: "Delegate work to an agent.\n\n```mdz\nSPAWN ~/agent/name TO task\n```",
    USE: "Compose a skill.\n\n```mdz\nUSE ~/skill/name\n```",
    TYPE: "Declare a type.\n\n```mdz\nTYPE Name = ...\n```",
    RETURN: "Return a value.\n\n```mdz\nRETURN result\n```",
    BREAK: "Exit the innermost loop.",
    CONTINUE: "Skip to the next iteration.",
    END: "Close the current block.",
    ELSE: "Else branch in IF or CASE.",
    WHEN: "Pattern clause in CASE.",
    THEN: "Then clause in IF or WHEN.",
    WITH: "Pass parameters to SPAWN or USE.",
    TO: "Specify target in SPAWN or USE.",
    IN: "Iterable in FOR loop.",
    AND: "Logical AND operator (conditions only).",
    OR: "Logical OR operator (conditions only).",
    NOT: "Logical NOT operator (conditions only).",
    ASYNC: "Async modifier for SPAWN.",
    AWAIT: "Await modifier for SPAWN.",
    GOTO: "Jump to a section."
  };

  const doc = docs[keyword.toUpperCase()];
  if (!doc) return null;

  return { content: doc };
};

export const getHover = (context: HoverContext): HoverResult => {
  const line = getLineContent(context.text, context.line);
  const wordInfo = getWordAtPosition(line, context.column);

  if (!wordInfo) return null;

  const { word, start, end } = wordInfo;
  const range = {
    start: { line: context.line, column: start },
    end: { line: context.line, column: end }
  };

  if (word.startsWith("$") && context.typeEnv) {
    const result = getVariableHover(word, context.typeEnv);
    if (result) return { ...result, range };
  }

  if (/^[A-Z][a-zA-Z0-9_]*$/.test(word) && context.typeEnv) {
    const typeResult = getTypeHover(word, context.typeEnv);
    if (typeResult) return { ...typeResult, range };
  }

  if (word.startsWith("#")) {
    const anchorResult = getAnchorHover(word, context.text);
    if (anchorResult) return { ...anchorResult, range };
  }

  if (word.startsWith("~/")) {
    const pathResult = getPathHover(word);
    if (pathResult) return { ...pathResult, range };
  }

  const keywordResult = getKeywordHover(word);
  if (keywordResult) return { ...keywordResult, range };

  return null;
};
