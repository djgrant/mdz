import { describe, it, expect } from "vitest";
import { parseDocument } from "./parser.js";
import { parseFrontmatter } from "./frontmatter.js";
import { analyzeFrontmatter } from "./frontmatter-analysis.js";
import {
  extractBindingsFromAst,
  buildTypeEnvironment
} from "./ast-analysis.js";
import { BUILTIN_TYPES } from "./types.js";

describe("extractBindingsFromAst", () => {
  it("extracts variable assignments", async () => {
    const text = `$count = 5
$name = "hello"
$result = some semantic expression
`;
    const result = await parseDocument(text);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const analysis = extractBindingsFromAst(result.ast);

    expect(analysis.variables.length).toBe(3);

    const countVar = analysis.variables.find((v) => v.name === "$count");
    expect(countVar).toBeDefined();
    expect(countVar?.type).toEqual(BUILTIN_TYPES.Number);

    const nameVar = analysis.variables.find((v) => v.name === "$name");
    expect(nameVar).toBeDefined();
    expect(nameVar?.type.kind).toBe("literal");

    const resultVar = analysis.variables.find((v) => v.name === "$result");
    expect(resultVar).toBeDefined();
    expect(resultVar?.type).toEqual(BUILTIN_TYPES.String);
  });

  it("extracts typed assignments", async () => {
    const text = `$status: "draft" | "published" = "draft"
$count: Number = 10
`;
    const result = await parseDocument(text);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const analysis = extractBindingsFromAst(result.ast);

    expect(analysis.variables.length).toBe(2);

    const statusVar = analysis.variables.find((v) => v.name === "$status");
    expect(statusVar).toBeDefined();
    expect(statusVar?.type.kind).toBe("enum");

    const countVar = analysis.variables.find((v) => v.name === "$count");
    expect(countVar).toBeDefined();
    expect(countVar?.type).toEqual(BUILTIN_TYPES.Number);
  });

  it("extracts FOR loop targets", async () => {
    const text = `FOR $item IN $items
  $total = $total + 1
END
`;
    const result = await parseDocument(text);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const analysis = extractBindingsFromAst(result.ast);

    const itemVar = analysis.variables.find((v) => v.name === "$item");
    expect(itemVar).toBeDefined();

    const totalVar = analysis.variables.find((v) => v.name === "$total");
    expect(totalVar).toBeDefined();
  });

  it("extracts TYPE declarations", async () => {
    const text = `TYPE Status = "draft" | "published"
TYPE Task = any task description
`;
    const result = await parseDocument(text);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const analysis = extractBindingsFromAst(result.ast);

    expect(analysis.types.length).toBe(2);

    const statusType = analysis.types.find((t) => t.name === "Status");
    expect(statusType).toBeDefined();
    expect(statusType?.type.kind).toBe("enum");

    const taskType = analysis.types.find((t) => t.name === "Task");
    expect(taskType).toBeDefined();
    expect(taskType?.type.kind).toBe("semantic");
  });

  it("extracts nested block variables", async () => {
    const text = `IF $condition THEN
  $inner = 1
  FOR $x IN $list
    $nested = 2
  END
ELSE
  $elseVar = 3
END
`;
    const result = await parseDocument(text);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const analysis = extractBindingsFromAst(result.ast);
    const names = analysis.variables.map((v) => v.name);

    expect(names).toContain("$inner");
    expect(names).toContain("$x");
    expect(names).toContain("$nested");
    expect(names).toContain("$elseVar");
  });

  it("extracts CASE block variables", async () => {
    const text = `CASE $status
WHEN "draft"
  $draftVar = 1
WHEN "published"
  $pubVar = 2
ELSE
  $defaultVar = 3
END
`;
    const result = await parseDocument(text);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const analysis = extractBindingsFromAst(result.ast);
    const names = analysis.variables.map((v) => v.name);

    expect(names).toContain("$draftVar");
    expect(names).toContain("$pubVar");
    expect(names).toContain("$defaultVar");
  });
});

describe("buildTypeEnvironment", () => {
  it("creates environment from AST", async () => {
    const text = `TYPE Status = "draft" | "published"
$count = 5
$name = "hello"
`;
    const result = await parseDocument(text);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const env = buildTypeEnvironment(result.ast);

    expect(env.lookupType("Status")).toBeDefined();
    expect(env.lookupVariable("$count")).toBeDefined();
    expect(env.lookupVariable("$name")).toBeDefined();
  });

  it("combines frontmatter and AST bindings", async () => {
    const text = `---
types:
  Task: any task
input:
  $input: Task
---
$local = 5
`;
    const fmResult = parseFrontmatter(text);
    expect(fmResult.ok).toBe(true);
    if (!fmResult.ok || !fmResult.frontmatter) return;

    const fmAnalysis = await analyzeFrontmatter(fmResult.frontmatter);
    const parseResult = await parseDocument(text);
    expect(parseResult.ok).toBe(true);
    if (!parseResult.ok) return;

    const env = buildTypeEnvironment(parseResult.ast, fmAnalysis.analysis);

    expect(env.lookupType("Task")).toBeDefined();
    expect(env.lookupVariable("$input")).toBeDefined();
    expect(env.lookupVariable("$input")?.source).toBe("input");
    expect(env.lookupVariable("$local")).toBeDefined();
    expect(env.lookupVariable("$local")?.source).toBe("assignment");
  });

  it("preserves input bindings over assignments", async () => {
    const text = `---
input:
  $x: Number
---
$x = 10
`;
    const fmResult = parseFrontmatter(text);
    expect(fmResult.ok).toBe(true);
    if (!fmResult.ok || !fmResult.frontmatter) return;

    const fmAnalysis = await analyzeFrontmatter(fmResult.frontmatter);
    const parseResult = await parseDocument(text);
    expect(parseResult.ok).toBe(true);
    if (!parseResult.ok) return;

    const env = buildTypeEnvironment(parseResult.ast, fmAnalysis.analysis);

    const xBinding = env.lookupVariable("$x");
    expect(xBinding).toBeDefined();
    expect(xBinding?.source).toBe("input");
  });
});
