export type SemanticTokenType =
  | "keyword"
  | "variable"
  | "type"
  | "string"
  | "number"
  | "operator"
  | "comment"
  | "function"
  | "parameter";

export type SemanticTokenModifier = "declaration" | "definition" | "readonly";

export type SemanticToken = {
  line: number;
  startChar: number;
  length: number;
  tokenType: SemanticTokenType;
  modifiers?: SemanticTokenModifier[];
};

export const TOKEN_TYPES: SemanticTokenType[] = [
  "keyword",
  "variable",
  "type",
  "string",
  "number",
  "operator",
  "comment",
  "function",
  "parameter"
];

export const TOKEN_MODIFIERS: SemanticTokenModifier[] = [
  "declaration",
  "definition",
  "readonly"
];

const KEYWORDS = new Set([
  "FOR",
  "IN",
  "WHILE",
  "DO",
  "IF",
  "THEN",
  "ELSE",
  "CASE",
  "WHEN",
  "END",
  "SPAWN",
  "USE",
  "WITH",
  "TO",
  "TYPE",
  "RETURN",
  "BREAK",
  "CONTINUE",
  "GOTO",
  "AND",
  "OR",
  "NOT",
  "ASYNC",
  "AWAIT"
]);

const OPERATORS = new Set(["=", "!=", "|"]);

type LineToken = {
  start: number;
  end: number;
  type: SemanticTokenType;
  modifiers?: SemanticTokenModifier[];
};

const tokenizeLine = (line: string, lineNumber: number): SemanticToken[] => {
  const tokens: SemanticToken[] = [];
  const lineTokens: LineToken[] = [];

  let pos = 0;
  const text = line;

  const skipWhitespace = () => {
    while (pos < text.length && /\s/.test(text[pos])) pos++;
  };

  const readWord = (): string => {
    const start = pos;
    while (pos < text.length && /[\w$]/.test(text[pos])) pos++;
    return text.slice(start, pos);
  };

  const readUntil = (char: string): string => {
    const start = pos;
    while (pos < text.length && text[pos] !== char) pos++;
    if (pos < text.length) pos++;
    return text.slice(start, pos);
  };

  while (pos < text.length) {
    skipWhitespace();
    if (pos >= text.length) break;

    const char = text[pos];
    const startPos = pos;

    if (char === "-" && pos + 1 < text.length && text[pos + 1] === " ") {
      pos += 2;
      continue;
    }

    if (char === '"') {
      pos++;
      readUntil('"');
      lineTokens.push({
        start: startPos,
        end: pos,
        type: "string"
      });
      continue;
    }

    if (char === "$") {
      const word = readWord();
      if (word.length > 1) {
        lineTokens.push({
          start: startPos,
          end: pos,
          type: "variable"
        });
      }
      continue;
    }

    if (char === "#" && pos + 1 < text.length && /[a-zA-Z]/.test(text[pos + 1])) {
      pos++;
      while (pos < text.length && /[\w-]/.test(text[pos])) pos++;
      lineTokens.push({
        start: startPos,
        end: pos,
        type: "function"
      });
      continue;
    }

    if (char === "~" && pos + 1 < text.length && text[pos + 1] === "/") {
      while (pos < text.length && !/\s/.test(text[pos])) pos++;
      lineTokens.push({
        start: startPos,
        end: pos,
        type: "function"
      });
      continue;
    }

    if (/[A-Z]/.test(char)) {
      const word = readWord();
      if (KEYWORDS.has(word)) {
        lineTokens.push({
          start: startPos,
          end: pos,
          type: "keyword"
        });
      } else if (/^[A-Z][a-zA-Z0-9_]*$/.test(word)) {
        lineTokens.push({
          start: startPos,
          end: pos,
          type: "type"
        });
      }
      continue;
    }

    if (/[0-9]/.test(char) || (char === "-" && pos + 1 < text.length && /[0-9]/.test(text[pos + 1]))) {
      while (pos < text.length && /[0-9.eE+-]/.test(text[pos])) pos++;
      lineTokens.push({
        start: startPos,
        end: pos,
        type: "number"
      });
      continue;
    }

    if (char === "=" || char === "!" || char === "|") {
      if (char === "!" && pos + 1 < text.length && text[pos + 1] === "=") {
        pos += 2;
      } else if (char === "=" && pos + 1 < text.length && text[pos + 1] === ">") {
        pos += 2;
        lineTokens.push({
          start: startPos,
          end: pos,
          type: "operator"
        });
        continue;
      } else {
        pos++;
      }
      lineTokens.push({
        start: startPos,
        end: pos,
        type: "operator"
      });
      continue;
    }

    pos++;
  }

  for (const token of lineTokens) {
    tokens.push({
      line: lineNumber,
      startChar: token.start,
      length: token.end - token.start,
      tokenType: token.type,
      modifiers: token.modifiers
    });
  }

  return tokens;
};

export const extractSemanticTokens = (text: string): SemanticToken[] => {
  const tokens: SemanticToken[] = [];
  const lines = text.split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const lineTokens = tokenizeLine(lines[i], i);
    tokens.push(...lineTokens);
  }

  return tokens;
};

export const encodeSemanticTokens = (tokens: SemanticToken[]): number[] => {
  const sorted = [...tokens].sort((a, b) => {
    if (a.line !== b.line) return a.line - b.line;
    return a.startChar - b.startChar;
  });

  const data: number[] = [];
  let prevLine = 0;
  let prevChar = 0;

  for (const token of sorted) {
    const deltaLine = token.line - prevLine;
    const deltaChar = deltaLine === 0 ? token.startChar - prevChar : token.startChar;

    const typeIndex = TOKEN_TYPES.indexOf(token.tokenType);
    let modifierBits = 0;
    if (token.modifiers) {
      for (const mod of token.modifiers) {
        const idx = TOKEN_MODIFIERS.indexOf(mod);
        if (idx >= 0) modifierBits |= 1 << idx;
      }
    }

    data.push(deltaLine, deltaChar, token.length, typeIndex, modifierBits);

    prevLine = token.line;
    prevChar = token.startChar;
  }

  return data;
};
