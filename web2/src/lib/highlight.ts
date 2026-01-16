import { ZenLanguageServer } from "../../../packages/lsp/src/server";

export type HighlightMode = "textmate" | "monarch" | "lsp";

type Token = {
  line: number;
  start: number;
  length: number;
  type: string;
};

const keywordPattern =
  /\b(ELSE IF|ELSE|IF|FOR|WHILE|DO|END|RETURN|BREAK|CONTINUE|ASYNC|AWAIT|DELEGATE|USE|EXECUTE|GOTO)\b/g;
const keywordInlinePattern = /\b(THEN|IN|AND|OR|NOT|WITH|TO)\b/g;

const basePatterns: Array<{ regex: RegExp; type: string }> = [
  { regex: /<!--[^\n]*?-->/g, type: "comment" },
  { regex: /\b-?\d+(?:\.\d+)?\b/g, type: "number" },
  { regex: /"[^"]*"/g, type: "string" },
  { regex: /\$\/[a-zA-Z0-9_-]+\//g, type: "semantic" },
  { regex: /\/[^\n\/]+\//g, type: "semantic" },
  { regex: /~\/[a-zA-Z0-9/_-]+(?:#[a-zA-Z0-9_-]+)?/g, type: "reference" },
  { regex: /#[a-zA-Z][a-zA-Z0-9_-]*/g, type: "reference" },
  { regex: /\$[A-Z][a-zA-Z0-9]*/g, type: "type" },
  { regex: /\$[a-z][a-zA-Z0-9-]*/g, type: "variable" },
];

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function collectTokens(lines: string[]): Token[] {
  const tokens: Token[] = [];
  let inFrontmatter = false;

  lines.forEach((line, lineIndex) => {
    const trimmed = line.trim();
    const lineTokens: Token[] = [];

    if (trimmed === "---") {
      lineTokens.push({ line: lineIndex, start: 0, length: line.length, type: "frontmatter" });
      inFrontmatter = !inFrontmatter;
    }

    if (inFrontmatter) {
      const frontmatterKeyMatch = line.match(/^\s*[A-Za-z0-9_-]+:/);
      if (frontmatterKeyMatch) {
        lineTokens.push({
          line: lineIndex,
          start: frontmatterKeyMatch.index ?? 0,
          length: frontmatterKeyMatch[0].length,
          type: "frontmatter",
        });
      }
    }

    if (!inFrontmatter && /^#+\s+/.test(line)) {
      lineTokens.push({ line: lineIndex, start: 0, length: line.length, type: "heading" });
      tokens.push(...lineTokens);
      return;
    }

    const templatePattern = /`[^`]*`/g;
    const templateVarPattern = /\$\/[^\/\n]+\/|\$[A-Za-z][A-Za-z0-9-]*/g;
    let templateMatch: RegExpExecArray | null;
    templatePattern.lastIndex = 0;
    while ((templateMatch = templatePattern.exec(line))) {
      const fullStart = templateMatch.index;
      const fullEnd = templateMatch.index + templateMatch[0].length;
      const content = templateMatch[0].slice(1, -1);
      let cursor = fullStart;
      templateVarPattern.lastIndex = 0;
      let varMatch: RegExpExecArray | null;
      while ((varMatch = templateVarPattern.exec(content))) {
        const varStart = fullStart + 1 + varMatch.index;
        if (cursor < varStart) {
          lineTokens.push({
            line: lineIndex,
            start: cursor,
            length: varStart - cursor,
            type: "string",
          });
        }
        lineTokens.push({
          line: lineIndex,
          start: varStart,
          length: varMatch[0].length,
          type: varMatch[0].startsWith("$/") ? "semantic" : "variable",
        });
        cursor = varStart + varMatch[0].length;
      }
      if (cursor < fullEnd) {
        lineTokens.push({
          line: lineIndex,
          start: cursor,
          length: fullEnd - cursor,
          type: "string",
        });
      }
    }

    const allPatterns = [
      { regex: keywordPattern, type: "keyword" },
      { regex: keywordInlinePattern, type: "keyword" },
      ...basePatterns,
    ];

    for (const { regex, type } of allPatterns) {
      let match: RegExpExecArray | null;
      regex.lastIndex = 0;
      while ((match = regex.exec(line))) {
        lineTokens.push({
          line: lineIndex,
          start: match.index,
          length: match[0].length,
          type,
        });
      }
    }

    lineTokens.sort((a, b) => a.start - b.start);
    const filtered: Token[] = [];
    let cursor = -1;
    for (const token of lineTokens) {
      if (token.start >= cursor) {
        filtered.push(token);
        cursor = token.start + token.length;
      }
    }
    tokens.push(...filtered);
  });

  return tokens;
}

function applyTokens(source: string, tokens: Token[], classPrefix: string): string {
  const lines = source.split("\n");
  const grouped = new Map<number, Token[]>();
  for (const token of tokens) {
    if (!grouped.has(token.line)) grouped.set(token.line, []);
    grouped.get(token.line)?.push(token);
  }

  const rendered = lines.map((line, lineIndex) => {
    const lineTokens = grouped.get(lineIndex);
    if (!lineTokens || lineTokens.length === 0) {
      return escapeHtml(line);
    }

    lineTokens.sort((a, b) => a.start - b.start);
    let cursor = 0;
    let output = "";
    for (const token of lineTokens) {
      if (token.start > cursor) {
        output += escapeHtml(line.slice(cursor, token.start));
      }
      const value = line.slice(token.start, token.start + token.length);
      output += `<span class=\"mdz-token ${classPrefix}-${token.type} token-${token.type}\">${escapeHtml(
        value,
      )}</span>`;
      cursor = token.start + token.length;
    }
    if (cursor < line.length) {
      output += escapeHtml(line.slice(cursor));
    }
    return output;
  });

  return rendered.join("\n");
}

function decodeSemanticTokens(data: number[], legend: string[]): Token[] {
  const tokens: Token[] = [];
  let line = 0;
  let char = 0;
  for (let i = 0; i < data.length; i += 5) {
    const deltaLine = data[i];
    const deltaChar = data[i + 1];
    const length = data[i + 2];
    const typeIndex = data[i + 3];

    line += deltaLine;
    char = deltaLine === 0 ? char + deltaChar : deltaChar;

    const type = legend[typeIndex] || "unknown";
    tokens.push({ line, start: char, length, type });
  }
  return tokens;
}

function mapLspType(type: string): string {
  switch (type) {
    case "semanticMarker":
      return "semantic";
    case "link":
    case "anchor":
      return "reference";
    case "frontmatter":
    case "heading":
      return type;
    default:
      return type;
  }
}

export function highlightTextmate(source: string): string {
  const tokens = collectTokens(source.split("\n"));
  return applyTokens(source, tokens, "tm");
}

export function highlightMonarch(source: string): string {
  const tokens = collectTokens(source.split("\n"));
  return applyTokens(source, tokens, "mon");
}

export function highlightLsp(source: string): string {
  const server = new ZenLanguageServer();
  server.openDocument("inmemory://snippet.mdz", source);
  const legend = server.getSemanticTokensLegend().tokenTypes;
  const data = server.getSemanticTokens("inmemory://snippet.mdz").data;
  const decoded = decodeSemanticTokens(data, legend).map((token) => ({
    ...token,
    type: mapLspType(token.type),
  }));
  return applyTokens(source, decoded, "lsp");
}
