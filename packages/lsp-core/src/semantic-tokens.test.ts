import { describe, it, expect } from "vitest";
import {
  extractSemanticTokens,
  encodeSemanticTokens,
  TOKEN_TYPES
} from "./semantic-tokens.js";

describe("extractSemanticTokens", () => {
  it("extracts keywords", () => {
    const text = "FOR $item IN $items\n";
    const tokens = extractSemanticTokens(text);

    const keywords = tokens.filter((t) => t.tokenType === "keyword");
    expect(keywords.length).toBe(2);
    expect(keywords[0].startChar).toBe(0);
    expect(keywords[1].startChar).toBe(10);
  });

  it("extracts variables", () => {
    const text = "$count = $total + 1\n";
    const tokens = extractSemanticTokens(text);

    const variables = tokens.filter((t) => t.tokenType === "variable");
    expect(variables.length).toBe(2);
    expect(variables[0].startChar).toBe(0);
    expect(variables[0].length).toBe(6);
  });

  it("extracts type names", () => {
    const text = "TYPE Status = Number\n";
    const tokens = extractSemanticTokens(text);

    const keywords = tokens.filter((t) => t.tokenType === "keyword");
    const types = tokens.filter((t) => t.tokenType === "type");

    expect(keywords.some((k) => k.startChar === 0)).toBe(true);
    expect(types.some((t) => t.startChar === 5)).toBe(true);
    expect(types.some((t) => t.startChar === 14)).toBe(true);
  });

  it("extracts string literals", () => {
    const text = '$name = "hello world"\n';
    const tokens = extractSemanticTokens(text);

    const strings = tokens.filter((t) => t.tokenType === "string");
    expect(strings.length).toBe(1);
    expect(strings[0].length).toBe(13);
  });

  it("extracts numbers", () => {
    const text = "$count = 42\n$ratio = 3.14\n";
    const tokens = extractSemanticTokens(text);

    const numbers = tokens.filter((t) => t.tokenType === "number");
    expect(numbers.length).toBe(2);
  });

  it("extracts operators", () => {
    const text = 'IF $x = 1 AND $y != 2\n';
    const tokens = extractSemanticTokens(text);

    const operators = tokens.filter((t) => t.tokenType === "operator");
    expect(operators.some((o) => o.length === 1)).toBe(true);
    expect(operators.some((o) => o.length === 2)).toBe(true);
  });

  it("extracts links as function type", () => {
    const text = "USE ~/skill/debug\nSPAWN ~/agent/test WITH #section\n";
    const tokens = extractSemanticTokens(text);

    const functions = tokens.filter((t) => t.tokenType === "function");
    expect(functions.some((f) => f.startChar === 4)).toBe(true);
    expect(functions.some((f) => f.line === 1 && f.startChar === 6)).toBe(true);
  });

  it("handles multiple lines", () => {
    const text = `FOR $item IN $items
  $result = process($item)
END
`;
    const tokens = extractSemanticTokens(text);

    expect(tokens.some((t) => t.line === 0)).toBe(true);
    expect(tokens.some((t) => t.line === 1)).toBe(true);
    expect(tokens.some((t) => t.line === 2)).toBe(true);
  });

  it("ignores list markers", () => {
    const text = "- FOR $item IN $items\n";
    const tokens = extractSemanticTokens(text);

    const keywords = tokens.filter((t) => t.tokenType === "keyword");
    expect(keywords.length).toBe(2);
  });
});

describe("encodeSemanticTokens", () => {
  it("encodes tokens as delta values", () => {
    const tokens = [
      { line: 0, startChar: 0, length: 3, tokenType: "keyword" as const },
      { line: 0, startChar: 4, length: 5, tokenType: "variable" as const },
      { line: 1, startChar: 0, length: 3, tokenType: "keyword" as const }
    ];

    const encoded = encodeSemanticTokens(tokens);

    expect(encoded[0]).toBe(0);
    expect(encoded[1]).toBe(0);
    expect(encoded[2]).toBe(3);
    expect(encoded[3]).toBe(TOKEN_TYPES.indexOf("keyword"));

    expect(encoded[5]).toBe(0);
    expect(encoded[6]).toBe(4);
    expect(encoded[7]).toBe(5);
    expect(encoded[8]).toBe(TOKEN_TYPES.indexOf("variable"));

    expect(encoded[10]).toBe(1);
    expect(encoded[11]).toBe(0);
  });

  it("sorts tokens before encoding", () => {
    const tokens = [
      { line: 1, startChar: 0, length: 3, tokenType: "keyword" as const },
      { line: 0, startChar: 0, length: 3, tokenType: "keyword" as const }
    ];

    const encoded = encodeSemanticTokens(tokens);

    expect(encoded[0]).toBe(0);
    expect(encoded[5]).toBe(1);
  });
});
