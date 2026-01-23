import { describe, expect, it } from "vitest";
import { parseFrontmatter } from "./frontmatter.js";
import { analyzeFrontmatter } from "./frontmatter-analysis.js";

describe("analyzeFrontmatter", () => {
  it("indexes types, input, and context declarations", async () => {
    const input = `---
name: demo
description: When needed, does X
types:
  Task: any task that an agent can execute
  Strategy: '"fast" | "slow"'
input:
  task: $Task
  strategy: $Strategy = "fast"
context:
  currentFile: $FilePath
---
RETURN ok
`;
    const parsed = parseFrontmatter(input);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok || !parsed.frontmatter) return;
    const result = await analyzeFrontmatter(parsed.frontmatter);
    expect(result.diagnostics).toHaveLength(0);
    expect(Object.keys(result.analysis.types)).toEqual(["Task", "Strategy"]);
    expect(result.analysis.input.task).toBeDefined();
    expect(result.analysis.input.strategy.defaultValue).toBe("\"fast\"");
    expect(result.analysis.context.currentFile).toBeDefined();
  });

  it("reports duplicate keys in declaration maps", async () => {
    const input = `---
name: demo
description: When needed, does X
types:
  Task: any task
  Task: "other"
---
RETURN ok
`;
    const parsed = parseFrontmatter(input);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok || !parsed.frontmatter) return;
    const result = await analyzeFrontmatter(parsed.frontmatter);
    const codes = result.diagnostics.map((diag) => diag.code);
    expect(codes).toContain("MDZL0102_DUPLICATE_FRONTMATTER_KEY");
  });

  it("reports invalid type declarations", async () => {
    const input = `---
name: demo
description: When needed, does X
types:
  Task: $Number = 2
---
RETURN ok
`;
    const parsed = parseFrontmatter(input);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok || !parsed.frontmatter) return;
    const result = await analyzeFrontmatter(parsed.frontmatter);
    const codes = result.diagnostics.map((diag) => diag.code);
    expect(codes).toContain("MDZL0103_INVALID_FRONTMATTER_DECL");
  });
});
