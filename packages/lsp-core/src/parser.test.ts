import { describe, it, expect } from "vitest";
import { parseDocument } from "./parser.js";

describe("parseDocument", () => {
  it("parses valid MDZ content", async () => {
    const result = await parseDocument("RETURN ok\n");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(Array.isArray(result.ast)).toBe(true);
    }
  });

  it("reports errors for invalid MDZ content", async () => {
    const result = await parseDocument("FOR $item\n");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.diagnostic.code).toMatch(/MDZ000/);
    }
  });
});
