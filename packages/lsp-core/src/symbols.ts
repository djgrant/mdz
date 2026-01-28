import type { AstLocation } from "./ast-analysis.js";

export type SymbolKind =
  | "variable"
  | "type"
  | "block"
  | "section"
  | "parameter";

export type DocumentSymbol = {
  name: string;
  kind: SymbolKind;
  detail?: string;
  range: AstLocation;
  selectionRange: AstLocation;
  children?: DocumentSymbol[];
};

type AstNode = Record<string, unknown>;

const hasLocation = (node: AstNode): node is AstNode & { location: AstLocation } => {
  return node.location !== undefined && node.location !== null;
};

const getBlockKeyword = (type: string): string => {
  const keywords: Record<string, string> = {
    for: "FOR",
    while: "WHILE",
    if: "IF",
    case: "CASE",
    do: "DO",
    spawn: "SPAWN",
    use: "USE"
  };
  return keywords[type] ?? type.toUpperCase();
};

const getStmtDetail = (node: AstNode): string => {
  const keyword = node.keyword as string;
  const target = node.target;
  const text = node.text as string | undefined;

  if (keyword === "SPAWN" || keyword === "USE") {
    const targetStr = typeof target === "object" && target !== null
      ? (target as Record<string, unknown>).value ?? ""
      : target ?? "";
    const suffix = text ? ` TO ${text}` : "";
    return `${keyword} ${targetStr}${suffix}`.trim();
  }

  if (keyword === "RETURN" && text) {
    return `RETURN ${text}`;
  }

  return keyword;
};

const getBlockDetail = (node: AstNode): string => {
  const type = node.type as string;

  switch (type) {
    case "for":
      return `FOR ${node.target ?? ""} IN ${node.iterable ?? ""}`.trim();
    case "while":
      return `WHILE ${node.condition ?? ""}`.trim();
    case "if":
      return `IF ${node.condition ?? ""}`.trim();
    case "case":
      return `CASE ${node.expression ?? ""}`.trim();
    case "spawn": {
      const target = typeof node.target === "object" && node.target !== null
        ? (node.target as Record<string, unknown>).value ?? ""
        : node.target ?? "";
      return `SPAWN ${target}`.trim();
    }
    case "use": {
      const target = typeof node.target === "object" && node.target !== null
        ? (node.target as Record<string, unknown>).value ?? ""
        : node.target ?? "";
      return `USE ${target}`.trim();
    }
    default:
      return getBlockKeyword(type);
  }
};

const extractHeadings = (text: string): DocumentSymbol[] => {
  const symbols: DocumentSymbol[] = [];
  const lines = text.split(/\r?\n/);
  const headingPattern = /^(#{1,6})\s+(.+)\s*$/;

  for (let i = 0; i < lines.length; i++) {
    const match = headingPattern.exec(lines[i]);
    if (!match) continue;

    const level = match[1].length;
    const title = match[2].trim();
    const line = i + 1;
    const endColumn = lines[i].length + 1;

    symbols.push({
      name: title,
      kind: "section",
      detail: "#".repeat(level),
      range: {
        start: { line, column: 1 },
        end: { line, column: endColumn }
      },
      selectionRange: {
        start: { line, column: level + 2 },
        end: { line, column: level + 2 + title.length }
      }
    });
  }

  return symbols;
};

const visitNode = (node: unknown, symbols: DocumentSymbol[]): void => {
  if (!node || typeof node !== "object") return;

  if (Array.isArray(node)) {
    for (const item of node) visitNode(item, symbols);
    return;
  }

  const astNode = node as AstNode;
  const type = astNode.type as string | undefined;

  if (!type) return;

  if (type === "assign" && typeof astNode.target === "string") {
    const typeAnnotation = astNode.annotatedType
      ? `: ${formatTypeAnnotation(astNode.annotatedType)}`
      : "";
    const defaultRange = { start: { line: 1, column: 1 }, end: { line: 1, column: 1 } };
    const range = hasLocation(astNode) ? astNode.location : defaultRange;
    symbols.push({
      name: astNode.target,
      kind: "variable",
      detail: `assignment${typeAnnotation}`,
      range,
      selectionRange: range
    });
  }

  if (type === "type" && typeof astNode.name === "string") {
    const defaultRange = { start: { line: 1, column: 1 }, end: { line: 1, column: 1 } };
    const range = hasLocation(astNode) ? astNode.location : defaultRange;
    symbols.push({
      name: astNode.name,
      kind: "type",
      detail: "TYPE",
      range,
      selectionRange: range
    });
  }

  if (type === "stmt" && typeof astNode.keyword === "string") {
    const keyword = astNode.keyword as string;
    const stmtKeywords = ["SPAWN", "USE", "RETURN", "BREAK", "CONTINUE", "GOTO"];
    if (stmtKeywords.includes(keyword)) {
      const defaultRange = { start: { line: 1, column: 1 }, end: { line: 1, column: 1 } };
      const range = hasLocation(astNode) ? astNode.location : defaultRange;
      const detail = getStmtDetail(astNode);
      symbols.push({
        name: keyword,
        kind: "block",
        detail,
        range,
        selectionRange: range
      });
    }
  }

  const blockTypes = ["for", "while", "if", "case", "do", "spawn", "use"];
  if (blockTypes.includes(type)) {
    const children: DocumentSymbol[] = [];

    if (astNode.blocks) visitNode(astNode.blocks, children);
    if (astNode.then) visitNode(astNode.then, children);
    if (astNode.else) visitNode(astNode.else, children);
    if (astNode.whens && Array.isArray(astNode.whens)) {
      for (const when of astNode.whens) {
        const whenNode = when as AstNode;
        if (whenNode.blocks) visitNode(whenNode.blocks, children);
      }
    }

    if (type === "for" && typeof astNode.target === "string") {
      const forRange = hasLocation(astNode)
        ? astNode.location
        : { start: { line: 1, column: 1 }, end: { line: 1, column: 1 } };
      children.unshift({
        name: astNode.target,
        kind: "variable",
        detail: "loop variable",
        range: forRange,
        selectionRange: forRange
      });
    }

    const defaultRange = { start: { line: 1, column: 1 }, end: { line: 1, column: 1 } };
    const range = hasLocation(astNode) ? astNode.location : defaultRange;
    symbols.push({
      name: getBlockKeyword(type),
      kind: "block",
      detail: getBlockDetail(astNode),
      range,
      selectionRange: range,
      children: children.length > 0 ? children : undefined
    });

    return;
  }

  for (const value of Object.values(astNode)) {
    visitNode(value, symbols);
  }
};

const formatTypeAnnotation = (typeValue: unknown): string => {
  if (!typeValue || typeof typeValue !== "object") {
    return String(typeValue ?? "");
  }

  const obj = typeValue as Record<string, unknown>;

  if (obj.type === "ref") {
    const args = obj.args as unknown[] | undefined;
    if (args && args.length > 0) {
      return `${obj.name}<${args.map(formatTypeAnnotation).join(", ")}>`;
    }
    return String(obj.name);
  }

  if (obj.type === "enum" && Array.isArray(obj.variants)) {
    return obj.variants.map(formatTypeAnnotation).join(" | ");
  }

  if (obj.type === "literal") {
    const val = obj.value;
    if (typeof val === "string") return `"${val}"`;
    return String(val);
  }

  if (obj.type === "tuple" && Array.isArray(obj.elements)) {
    return `(${obj.elements.map(formatTypeAnnotation).join(", ")})`;
  }

  if (obj.type === "semantic" && obj.text) {
    return String(obj.text);
  }

  return "";
};

export const extractDocumentSymbols = (
  text: string,
  ast: unknown
): DocumentSymbol[] => {
  const symbols: DocumentSymbol[] = [];

  const headings = extractHeadings(text);
  symbols.push(...headings);

  if (Array.isArray(ast)) {
    visitNode(ast, symbols);
  }

  return symbols;
};
