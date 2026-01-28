import { describe, it, expect } from "vitest";
import {
  TypeEnvironment,
  inferTypeFromValue,
  astValueToType,
  BUILTIN_TYPES,
  type MdzType
} from "./types.js";
import { parseFrontmatter } from "./frontmatter.js";
import { analyzeFrontmatter } from "./frontmatter-analysis.js";

describe("inferTypeFromValue", () => {
  it("infers Number from numeric values", () => {
    expect(inferTypeFromValue(42)).toEqual(BUILTIN_TYPES.Number);
    expect(inferTypeFromValue(3.14)).toEqual(BUILTIN_TYPES.Number);
    expect(inferTypeFromValue("123")).toEqual(BUILTIN_TYPES.Number);
    expect(inferTypeFromValue("-0.5")).toEqual(BUILTIN_TYPES.Number);
    expect(inferTypeFromValue("1e10")).toEqual(BUILTIN_TYPES.Number);
  });

  it("infers String from string values", () => {
    expect(inferTypeFromValue("hello")).toEqual(BUILTIN_TYPES.String);
    expect(inferTypeFromValue("hello world")).toEqual(BUILTIN_TYPES.String);
  });

  it("infers literal from quoted strings", () => {
    const result = inferTypeFromValue('"draft"');
    expect(result.kind).toBe("literal");
    if (result.kind === "literal") {
      expect(result.value).toBe("draft");
    }
  });

  it("infers link type from link objects", () => {
    const pathLink = { type: "link", kind: "path", value: "~/skill/debug" };
    const result = inferTypeFromValue(pathLink);
    expect(result.kind).toBe("link");
    if (result.kind === "link") {
      expect(result.linkKind).toBe("path");
    }

    const anchorLink = { type: "link", kind: "anchor", value: "#section" };
    const anchorResult = inferTypeFromValue(anchorLink);
    expect(anchorResult.kind).toBe("link");
    if (anchorResult.kind === "link") {
      expect(anchorResult.linkKind).toBe("anchor");
    }
  });

  it("infers lambda type from lambda objects", () => {
    const lambda = { type: "lambda", params: ["$x", "$y"], body: "$x + $y" };
    const result = inferTypeFromValue(lambda);
    expect(result.kind).toBe("lambda");
    if (result.kind === "lambda") {
      expect(result.params).toEqual(["$x", "$y"]);
    }
  });

  it("infers array type from array objects", () => {
    const arr = { type: "array", elements: [1, 2, 3] };
    const result = inferTypeFromValue(arr);
    expect(result.kind).toBe("array");
    if (result.kind === "array") {
      expect(result.element).toEqual(BUILTIN_TYPES.Number);
    }
  });

  it("infers tuple type from tuple objects", () => {
    const tuple = { type: "tuple", elements: ["hello", 42] };
    const result = inferTypeFromValue(tuple);
    expect(result.kind).toBe("tuple");
    if (result.kind === "tuple") {
      expect(result.elements.length).toBe(2);
    }
  });

  it("returns unknown for null/undefined", () => {
    expect(inferTypeFromValue(null)).toEqual({ kind: "unknown" });
    expect(inferTypeFromValue(undefined)).toEqual({ kind: "unknown" });
  });
});

describe("astValueToType", () => {
  it("converts ref types", () => {
    const ref = { type: "ref", name: "Task" };
    const result = astValueToType(ref);
    expect(result.kind).toBe("ref");
    if (result.kind === "ref") {
      expect(result.name).toBe("Task");
    }
  });

  it("converts builtin ref types", () => {
    const ref = { type: "ref", name: "Number" };
    const result = astValueToType(ref);
    expect(result).toEqual(BUILTIN_TYPES.Number);
  });

  it("converts enum types", () => {
    const enumType = {
      type: "enum",
      variants: [
        { type: "literal", value: "draft" },
        { type: "literal", value: "published" }
      ]
    };
    const result = astValueToType(enumType);
    expect(result.kind).toBe("enum");
    if (result.kind === "enum") {
      expect(result.variants.length).toBe(2);
    }
  });

  it("converts semantic types from strings", () => {
    const result = astValueToType("any task description");
    expect(result.kind).toBe("semantic");
    if (result.kind === "semantic") {
      expect(result.description).toBe("any task description");
    }
  });
});

describe("TypeEnvironment", () => {
  it("stores and retrieves type declarations", () => {
    const env = new TypeEnvironment();
    env.addType({
      name: "Task",
      type: { kind: "semantic", description: "a task" }
    });

    const decl = env.lookupType("Task");
    expect(decl).toBeDefined();
    expect(decl?.name).toBe("Task");
  });

  it("stores and retrieves variable bindings", () => {
    const env = new TypeEnvironment();
    env.addVariable({
      name: "$count",
      type: BUILTIN_TYPES.Number,
      source: "assignment"
    });

    const binding = env.lookupVariable("$count");
    expect(binding).toBeDefined();
    expect(binding?.type).toEqual(BUILTIN_TYPES.Number);
  });

  it("supports scoped lookups via parent", () => {
    const parent = new TypeEnvironment();
    parent.addType({
      name: "Task",
      type: { kind: "semantic", description: "a task" }
    });

    const child = parent.createChild();
    child.addType({
      name: "Strategy",
      type: { kind: "literal", value: "fast" }
    });

    expect(child.lookupType("Strategy")).toBeDefined();
    expect(child.lookupType("Task")).toBeDefined();
    expect(parent.lookupType("Strategy")).toBeUndefined();
  });

  it("child scope shadows parent bindings", () => {
    const parent = new TypeEnvironment();
    parent.addVariable({
      name: "$x",
      type: BUILTIN_TYPES.Number,
      source: "input"
    });

    const child = parent.createChild();
    child.addVariable({
      name: "$x",
      type: BUILTIN_TYPES.String,
      source: "assignment"
    });

    const binding = child.lookupVariable("$x");
    expect(binding?.type).toEqual(BUILTIN_TYPES.String);
    expect(binding?.source).toBe("assignment");
  });

  it("resolves type references", () => {
    const env = new TypeEnvironment();
    const taskType: MdzType = { kind: "semantic", description: "a task" };
    env.addType({ name: "Task", type: taskType });

    const ref: MdzType = { kind: "ref", name: "Task" };
    const resolved = env.resolveType(ref);
    expect(resolved).toEqual(taskType);
  });

  it("returns original type if ref not found", () => {
    const env = new TypeEnvironment();
    const ref: MdzType = { kind: "ref", name: "Unknown" };
    const resolved = env.resolveType(ref);
    expect(resolved).toEqual(ref);
  });

  it("gets all types including parent", () => {
    const parent = new TypeEnvironment();
    parent.addType({ name: "Task", type: { kind: "semantic", description: "task" } });

    const child = parent.createChild();
    child.addType({ name: "Strategy", type: { kind: "literal", value: "fast" } });

    const allTypes = child.getAllTypes();
    expect(allTypes.length).toBe(2);
    expect(allTypes.some((t) => t.name === "Task")).toBe(true);
    expect(allTypes.some((t) => t.name === "Strategy")).toBe(true);
  });
});

describe("TypeEnvironment.fromFrontmatter", () => {
  it("creates environment from frontmatter analysis", async () => {
    const text = `---
types:
  Task: any task description
  Status: '"draft" | "published"'
input:
  $task: Task
context:
  $count: Number = 0
---
RETURN ok
`;
    const parsed = parseFrontmatter(text);
    if (!parsed.ok || !parsed.frontmatter) {
      throw new Error("Failed to parse frontmatter");
    }

    const analysis = await analyzeFrontmatter(parsed.frontmatter);
    const env = TypeEnvironment.fromFrontmatter(analysis.analysis);

    expect(env.lookupType("Task")).toBeDefined();
    expect(env.lookupType("Status")).toBeDefined();
    expect(env.lookupVariable("$task")).toBeDefined();
    expect(env.lookupVariable("$count")).toBeDefined();
    expect(env.lookupVariable("$count")?.source).toBe("context");
  });
});
