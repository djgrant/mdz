import { describe, it, expect } from "vitest";
import { parseDocument } from "./parser.js";
import { extractDocumentSymbols, type DocumentSymbol } from "./symbols.js";

describe("extractDocumentSymbols", () => {
  it("extracts markdown headings as section symbols", async () => {
    const text = `# Overview
## Getting Started
### Installation
`;
    const result = await parseDocument(text);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const symbols = extractDocumentSymbols(text, result.ast);
    const sections = symbols.filter((s) => s.kind === "section");

    expect(sections.length).toBe(3);
    expect(sections[0].name).toBe("Overview");
    expect(sections[0].detail).toBe("#");
    expect(sections[1].name).toBe("Getting Started");
    expect(sections[1].detail).toBe("##");
    expect(sections[2].name).toBe("Installation");
    expect(sections[2].detail).toBe("###");
  });

  it("extracts variable assignments", async () => {
    const text = `$count = 5
$name = "hello"
$status: "draft" | "published" = "draft"
`;
    const result = await parseDocument(text);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const symbols = extractDocumentSymbols(text, result.ast);
    const variables = symbols.filter((s) => s.kind === "variable");

    expect(variables.length).toBe(3);
    expect(variables.some((v) => v.name === "$count")).toBe(true);
    expect(variables.some((v) => v.name === "$name")).toBe(true);
    expect(variables.some((v) => v.name === "$status")).toBe(true);

    const status = variables.find((v) => v.name === "$status");
    expect(status?.detail).toContain(":");
  });

  it("extracts TYPE declarations", async () => {
    const text = `TYPE Status = "draft" | "published"
TYPE Task = any task description
`;
    const result = await parseDocument(text);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const symbols = extractDocumentSymbols(text, result.ast);
    const types = symbols.filter((s) => s.kind === "type");

    expect(types.length).toBe(2);
    expect(types.some((t) => t.name === "Status")).toBe(true);
    expect(types.some((t) => t.name === "Task")).toBe(true);
  });

  it("extracts FOR blocks with loop variable as child", async () => {
    const text = `FOR $item IN $items
  $total = $total + 1
END
`;
    const result = await parseDocument(text);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const symbols = extractDocumentSymbols(text, result.ast);
    const forBlock = symbols.find((s) => s.kind === "block" && s.name === "FOR");

    expect(forBlock).toBeDefined();
    expect(forBlock?.detail).toContain("FOR $item IN");
    expect(forBlock?.children).toBeDefined();
    expect(forBlock?.children?.some((c) => c.name === "$item")).toBe(true);
    expect(forBlock?.children?.some((c) => c.name === "$total")).toBe(true);
  });

  it("extracts IF blocks", async () => {
    const text = `IF $status = "draft" THEN
  $result = "pending"
ELSE
  $result = "done"
END
`;
    const result = await parseDocument(text);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const symbols = extractDocumentSymbols(text, result.ast);
    const ifBlock = symbols.find((s) => s.kind === "block" && s.name === "IF");

    expect(ifBlock).toBeDefined();
    expect(ifBlock?.detail).toContain("IF");
    expect(ifBlock?.children).toBeDefined();
    expect(ifBlock?.children?.length).toBeGreaterThan(0);
  });

  it("extracts WHILE blocks", async () => {
    const text = `WHILE $count > 0
  $count = $count - 1
END
`;
    const result = await parseDocument(text);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const symbols = extractDocumentSymbols(text, result.ast);
    const whileBlock = symbols.find((s) => s.kind === "block" && s.name === "WHILE");

    expect(whileBlock).toBeDefined();
    expect(whileBlock?.detail).toContain("WHILE");
  });

  it("extracts CASE blocks", async () => {
    const text = `CASE $status
WHEN "draft"
  $msg = "needs review"
WHEN "published"
  $msg = "done"
END
`;
    const result = await parseDocument(text);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const symbols = extractDocumentSymbols(text, result.ast);
    const caseBlock = symbols.find((s) => s.kind === "block" && s.name === "CASE");

    expect(caseBlock).toBeDefined();
    expect(caseBlock?.detail).toContain("CASE");
    expect(caseBlock?.children).toBeDefined();
  });

  it("extracts SPAWN and USE blocks", async () => {
    const text = `SPAWN ~/agent/reporter TO summarize
USE ~/skill/debug
`;
    const result = await parseDocument(text);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const symbols = extractDocumentSymbols(text, result.ast);
    const blocks = symbols.filter((s) => s.kind === "block");

    expect(blocks.some((b) => b.name === "SPAWN")).toBe(true);
    expect(blocks.some((b) => b.name === "USE")).toBe(true);

    const spawnBlock = blocks.find((b) => b.name === "SPAWN");
    expect(spawnBlock?.detail).toContain("~/agent/reporter");
  });

  it("combines headings and code symbols", async () => {
    const text = `# My Document

## Variables

$count = 5
$name = "test"

## Control Flow

FOR $item IN $items
  $result = process($item)
END
`;
    const result = await parseDocument(text);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const symbols = extractDocumentSymbols(text, result.ast);

    const sections = symbols.filter((s) => s.kind === "section");
    const topVariables = symbols.filter((s) => s.kind === "variable");
    const blocks = symbols.filter((s) => s.kind === "block");

    expect(sections.length).toBe(3);
    expect(topVariables.length).toBe(2);
    expect(blocks.length).toBe(1);

    const forBlock = blocks.find((b) => b.name === "FOR");
    expect(forBlock?.children?.some((c) => c.name === "$item")).toBe(true);
    expect(forBlock?.children?.some((c) => c.name === "$result")).toBe(true);
  });
});
