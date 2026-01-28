import { TypeEnvironment, type VariableBinding, type TypeDeclaration } from "./types.js";
import { collectAnchors } from "./links.js";

export type CompletionItemKind =
  | "keyword"
  | "variable"
  | "type"
  | "path"
  | "anchor"
  | "snippet";

export type CompletionItem = {
  label: string;
  kind: CompletionItemKind;
  detail?: string;
  insertText?: string;
  documentation?: string;
};

export type CompletionContext = {
  text: string;
  line: number;
  column: number;
  typeEnv?: TypeEnvironment;
  workspaceFiles?: string[];
};

const CONTROL_KEYWORDS = [
  { label: "FOR", detail: "Loop over items", insertText: "FOR $item IN $items\n  \nEND" },
  { label: "WHILE", detail: "Loop while condition", insertText: "WHILE $condition\n  \nEND" },
  { label: "IF", detail: "Conditional branch", insertText: "IF $condition THEN\n  \nEND" },
  { label: "CASE", detail: "Pattern matching", insertText: "CASE $value\nWHEN $pattern\n  \nEND" },
  { label: "DO", detail: "Block scope", insertText: "DO\n  \nEND" },
  { label: "END", detail: "Close block" },
  { label: "ELSE", detail: "Else branch" },
  { label: "WHEN", detail: "Case pattern" },
  { label: "THEN", detail: "Then clause" },
  { label: "BREAK", detail: "Exit loop" },
  { label: "CONTINUE", detail: "Skip to next iteration" },
  { label: "RETURN", detail: "Return value", insertText: "RETURN " },
  { label: "SPAWN", detail: "Delegate to agent", insertText: "SPAWN ~/agent/" },
  { label: "USE", detail: "Use skill", insertText: "USE ~/skill/" },
  { label: "GOTO", detail: "Jump to section", insertText: "GOTO " },
  { label: "TYPE", detail: "Declare type", insertText: "TYPE Name = " },
  { label: "WITH", detail: "With parameters" },
  { label: "TO", detail: "To target" },
  { label: "IN", detail: "In iterable" },
  { label: "AND", detail: "Logical and" },
  { label: "OR", detail: "Logical or" },
  { label: "NOT", detail: "Logical not" },
  { label: "ASYNC", detail: "Async modifier" },
  { label: "AWAIT", detail: "Await modifier" }
];

const getLineContent = (text: string, lineNumber: number): string => {
  const lines = text.split(/\r?\n/);
  const index = lineNumber - 1;
  if (index < 0 || index >= lines.length) return "";
  return lines[index];
};

const getTextBeforeCursor = (line: string, column: number): string => {
  return line.slice(0, column - 1);
};

const isLineStart = (textBefore: string): boolean => {
  const trimmed = textBefore.replace(/^(\s*-\s*)?/, "").trim();
  return trimmed.length === 0;
};

const isAfterDollar = (textBefore: string): boolean => {
  return /\$[a-zA-Z_]*$/.test(textBefore);
};

const isAfterTilde = (textBefore: string): boolean => {
  return /~\/[a-zA-Z0-9_/]*$/.test(textBefore);
};

const isAfterHash = (textBefore: string): boolean => {
  return /#[a-zA-Z0-9_-]*$/.test(textBefore);
};

const isAfterColon = (textBefore: string): boolean => {
  return /:\s*[A-Za-z_]*$/.test(textBefore);
};

const getVariableCompletions = (env: TypeEnvironment): CompletionItem[] => {
  const variables = env.getAllVariables();
  return variables.map((v: VariableBinding) => ({
    label: v.name,
    kind: "variable" as const,
    detail: `${v.source}: ${formatType(v.type)}`,
    insertText: v.name.slice(1)
  }));
};

const getTypeCompletions = (env: TypeEnvironment): CompletionItem[] => {
  const types = env.getAllTypes();
  const builtins: CompletionItem[] = [
    { label: "Number", kind: "type", detail: "Built-in number type" },
    { label: "String", kind: "type", detail: "Built-in string type" },
    { label: "Array", kind: "type", detail: "Built-in array type", insertText: "Array<>" },
    { label: "Link", kind: "type", detail: "Built-in link type" },
    { label: "Lambda", kind: "type", detail: "Built-in lambda type" },
    { label: "Expr", kind: "type", detail: "Semantic expression type" }
  ];

  const userTypes = types.map((t: TypeDeclaration) => ({
    label: t.name,
    kind: "type" as const,
    detail: formatType(t.type)
  }));

  return [...builtins, ...userTypes];
};

const getAnchorCompletions = (text: string): CompletionItem[] => {
  const anchors = collectAnchors(text);
  const items: CompletionItem[] = [];

  for (const [anchor] of anchors) {
    items.push({
      label: `#${anchor}`,
      kind: "anchor",
      detail: "Document anchor",
      insertText: anchor
    });
  }

  return items;
};

const getPathCompletions = (workspaceFiles: string[]): CompletionItem[] => {
  const pathPrefixes = new Set<string>();

  for (const file of workspaceFiles) {
    const parts = file.split("/");
    if (parts.length >= 2) {
      pathPrefixes.add(parts[0]);
    }
  }

  return Array.from(pathPrefixes).map((prefix) => ({
    label: `~/${prefix}/`,
    kind: "path" as const,
    detail: "Path prefix",
    insertText: `${prefix}/`
  }));
};

const formatType = (type: unknown): string => {
  if (!type || typeof type !== "object") {
    return String(type ?? "unknown");
  }

  const obj = type as Record<string, unknown>;

  switch (obj.kind) {
    case "builtin":
      return String(obj.name);
    case "ref":
      return String(obj.name);
    case "literal":
      return typeof obj.value === "string" ? `"${obj.value}"` : String(obj.value);
    case "enum":
      if (Array.isArray(obj.variants)) {
        return obj.variants.map(formatType).join(" | ");
      }
      return "enum";
    case "array":
      return `Array<${formatType(obj.element)}>`;
    case "tuple":
      if (Array.isArray(obj.elements)) {
        return `(${obj.elements.map(formatType).join(", ")})`;
      }
      return "tuple";
    case "semantic":
      return String(obj.description ?? "semantic");
    case "link":
      return obj.linkKind === "anchor" ? "Anchor" : "Path";
    case "lambda":
      return "Lambda";
    default:
      return "unknown";
  }
};

export const getCompletions = (context: CompletionContext): CompletionItem[] => {
  const line = getLineContent(context.text, context.line);
  const textBefore = getTextBeforeCursor(line, context.column);

  if (isAfterDollar(textBefore)) {
    if (context.typeEnv) {
      return getVariableCompletions(context.typeEnv);
    }
    return [];
  }

  if (isAfterHash(textBefore)) {
    return getAnchorCompletions(context.text);
  }

  if (isAfterTilde(textBefore)) {
    return getPathCompletions(context.workspaceFiles ?? []);
  }

  if (isAfterColon(textBefore) && context.typeEnv) {
    return getTypeCompletions(context.typeEnv);
  }

  if (isLineStart(textBefore)) {
    return CONTROL_KEYWORDS.map((kw) => ({
      label: kw.label,
      kind: "keyword" as const,
      detail: kw.detail,
      insertText: kw.insertText
    }));
  }

  return [];
};
