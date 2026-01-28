import { describe, it, expect } from "vitest";
import { validateContract, extractWithParams, type WithParam } from "./contract-validation.js";
import type { FrontmatterAnalysis } from "./frontmatter-analysis.js";

describe("validateContract", () => {
  const createAnalysis = (
    inputs: Record<string, { value: unknown; defaultValue?: string }>
  ): FrontmatterAnalysis => ({
    types: {},
    input: Object.fromEntries(
      Object.entries(inputs).map(([name, { value, defaultValue }]) => [
        name,
        { name, value, raw: "", defaultValue }
      ])
    ),
    context: {}
  });

  it("reports missing required parameters", () => {
    const targetAnalysis = createAnalysis({
      $task: { value: { kind: "ref", name: "Task" } },
      $priority: { value: { kind: "ref", name: "Number" } }
    });

    const result = validateContract({
      withParams: [{ name: "task", value: "do something" }],
      targetAnalysis,
      targetPath: "~/agent/test"
    });

    const codes = result.diagnostics.map((d) => d.code);
    expect(codes).toContain("MDZC0011_MISSING_PARAMETER");
    expect(result.diagnostics.some((d) => d.message.includes("priority"))).toBe(true);
  });

  it("does not report missing parameters with defaults", () => {
    const targetAnalysis = createAnalysis({
      $task: { value: { kind: "ref", name: "Task" } },
      $priority: { value: { kind: "ref", name: "Number" }, defaultValue: "1" }
    });

    const result = validateContract({
      withParams: [{ name: "task", value: "do something" }],
      targetAnalysis,
      targetPath: "~/agent/test"
    });

    const codes = result.diagnostics.map((d) => d.code);
    expect(codes).not.toContain("MDZC0011_MISSING_PARAMETER");
  });

  it("reports unknown parameters", () => {
    const targetAnalysis = createAnalysis({
      $task: { value: { kind: "ref", name: "Task" } }
    });

    const result = validateContract({
      withParams: [
        { name: "task", value: "do something" },
        { name: "unknown", value: "value" }
      ],
      targetAnalysis,
      targetPath: "~/agent/test"
    });

    const codes = result.diagnostics.map((d) => d.code);
    expect(codes).toContain("MDZC0010_UNKNOWN_PARAMETER");
    expect(result.diagnostics.some((d) => d.message.includes("unknown"))).toBe(true);
  });

  it("handles $ prefix in parameter names", () => {
    const targetAnalysis = createAnalysis({
      $task: { value: { kind: "ref", name: "Task" } }
    });

    const result = validateContract({
      withParams: [{ name: "$task", value: "do something" }],
      targetAnalysis,
      targetPath: "~/agent/test"
    });

    expect(result.diagnostics.length).toBe(0);
  });

  it("returns no diagnostics when all parameters match", () => {
    const targetAnalysis = createAnalysis({
      $task: { value: { kind: "ref", name: "Task" } },
      $priority: { value: { kind: "ref", name: "Number" }, defaultValue: "1" }
    });

    const result = validateContract({
      withParams: [{ name: "task", value: "do something" }],
      targetAnalysis,
      targetPath: "~/agent/test"
    });

    expect(result.diagnostics.length).toBe(0);
  });

  it("includes location in diagnostics when provided", () => {
    const targetAnalysis = createAnalysis({
      $task: { value: { kind: "ref", name: "Task" } }
    });

    const location = {
      start: { line: 5, column: 3 },
      end: { line: 5, column: 15 }
    };

    const result = validateContract({
      withParams: [{ name: "unknown", value: "value", location }],
      targetAnalysis,
      targetPath: "~/agent/test"
    });

    expect(result.diagnostics[0].location).toEqual(location);
  });
});

describe("extractWithParams", () => {
  it("extracts WITH params from spawn blocks", () => {
    const ast = [
      {
        type: "spawn",
        target: { type: "link", kind: "path", value: "~/agent/test" },
        with: [
          { name: "task", value: "do something" },
          { name: "priority", value: "1" }
        ]
      }
    ];

    const results = extractWithParams(ast);

    expect(results.length).toBe(1);
    expect(results[0].target).toBe("~/agent/test");
    expect(results[0].params.length).toBe(2);
    expect(results[0].params[0].name).toBe("task");
  });

  it("extracts WITH params from use blocks", () => {
    const ast = [
      {
        type: "use",
        target: { type: "link", kind: "path", value: "~/skill/debug" },
        with: [{ name: "context", value: "current file" }]
      }
    ];

    const results = extractWithParams(ast);

    expect(results.length).toBe(1);
    expect(results[0].target).toBe("~/skill/debug");
  });

  it("handles nested blocks", () => {
    const ast = [
      {
        type: "for",
        blocks: [
          {
            type: "spawn",
            target: { type: "link", kind: "path", value: "~/agent/test" },
            with: [{ name: "item", value: "$item" }]
          }
        ]
      }
    ];

    const results = extractWithParams(ast);

    expect(results.length).toBe(1);
  });

  it("returns empty array when no WITH blocks", () => {
    const ast = [
      {
        type: "spawn",
        target: { type: "link", kind: "path", value: "~/agent/test" }
      }
    ];

    const results = extractWithParams(ast);

    expect(results.length).toBe(0);
  });
});
