import { describe, expect, it } from "vitest";
import { parseFrontmatter } from "./frontmatter.js";

describe("parseFrontmatter", () => {
  it("returns null when no frontmatter is present", () => {
    const result = parseFrontmatter("RETURN ok\n");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.frontmatter).toBeNull();
  });

  it("parses YAML frontmatter at the start of a document", () => {
    const input = `---
name: demo
count: 2
---
RETURN ok
`;
    const result = parseFrontmatter(input);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.frontmatter?.value).toEqual({ name: "demo", count: 2 });
  });

  it("reports missing closing fence", () => {
    const input = `---
name: demo
RETURN ok
`;
    const result = parseFrontmatter(input);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.diagnostic.code).toBe("MDZL0100_UNCLOSED_FRONTMATTER");
  });

  it("reports invalid YAML", () => {
    const input = `---
name: [demo
---
RETURN ok
`;
    const result = parseFrontmatter(input);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.diagnostic.code).toBe("MDZL0101_INVALID_FRONTMATTER");
  });
});
