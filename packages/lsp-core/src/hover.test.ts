import { describe, it, expect } from "vitest";
import { getHover, type HoverContext } from "./hover.js";
import { TypeEnvironment, BUILTIN_TYPES } from "./types.js";

describe("getHover", () => {
  describe("variable hover", () => {
    it("shows variable type and source for input", () => {
      const env = new TypeEnvironment();
      env.addVariable({ name: "$count", type: BUILTIN_TYPES.Number, source: "input" });

      const context: HoverContext = {
        text: "IF $count > 0\n",
        line: 1,
        column: 5,
        typeEnv: env
      };

      const result = getHover(context);

      expect(result).not.toBeNull();
      expect(result?.content).toContain("$count");
      expect(result?.content).toContain("Number");
      expect(result?.content).toContain("Input parameter");
    });

    it("shows variable type for assignment", () => {
      const env = new TypeEnvironment();
      env.addVariable({ name: "$name", type: BUILTIN_TYPES.String, source: "assignment" });

      const context: HoverContext = {
        text: "RETURN $name\n",
        line: 1,
        column: 10,
        typeEnv: env
      };

      const result = getHover(context);

      expect(result).not.toBeNull();
      expect(result?.content).toContain("$name");
      expect(result?.content).toContain("String");
      expect(result?.content).toContain("Local variable");
    });

    it("shows variable type for context", () => {
      const env = new TypeEnvironment();
      env.addVariable({ name: "$config", type: BUILTIN_TYPES.String, source: "context" });

      const context: HoverContext = {
        text: "USE $config\n",
        line: 1,
        column: 6,
        typeEnv: env
      };

      const result = getHover(context);

      expect(result?.content).toContain("Context variable");
    });

    it("returns null for unknown variable", () => {
      const env = new TypeEnvironment();

      const context: HoverContext = {
        text: "IF $unknown\n",
        line: 1,
        column: 5,
        typeEnv: env
      };

      const result = getHover(context);

      expect(result).toBeNull();
    });
  });

  describe("type hover", () => {
    it("shows type definition", () => {
      const env = new TypeEnvironment();
      env.addType({
        name: "Status",
        type: {
          kind: "enum",
          variants: [
            { kind: "literal", value: "draft" },
            { kind: "literal", value: "published" }
          ]
        }
      });

      const context: HoverContext = {
        text: "$var: Status\n",
        line: 1,
        column: 8,
        typeEnv: env
      };

      const result = getHover(context);

      expect(result).not.toBeNull();
      expect(result?.content).toContain("TYPE Status");
      expect(result?.content).toContain("draft");
      expect(result?.content).toContain("published");
    });
  });

  describe("anchor hover", () => {
    it("shows heading info for anchor", () => {
      const text = `# Overview
## Getting Started
SPAWN ~/agent WITH #getting-started
`;

      const context: HoverContext = {
        text,
        line: 3,
        column: 25
      };

      const result = getHover(context);

      expect(result).not.toBeNull();
      expect(result?.content).toContain("Getting Started");
      expect(result?.content).toContain("Line 2");
    });

    it("returns null for missing anchor", () => {
      const text = `# Overview
SPAWN ~/agent WITH #missing
`;

      const context: HoverContext = {
        text,
        line: 2,
        column: 22
      };

      const result = getHover(context);

      expect(result).toBeNull();
    });
  });

  describe("path hover", () => {
    it("shows path link info", () => {
      const context: HoverContext = {
        text: "USE ~/skill/debug\n",
        line: 1,
        column: 8
      };

      const result = getHover(context);

      expect(result).not.toBeNull();
      expect(result?.content).toContain("~/skill/debug");
      expect(result?.content).toContain("Link to file");
    });
  });

  describe("keyword hover", () => {
    it("shows FOR keyword documentation", () => {
      const context: HoverContext = {
        text: "FOR $item IN $items\n",
        line: 1,
        column: 2
      };

      const result = getHover(context);

      expect(result).not.toBeNull();
      expect(result?.content).toContain("Loop over items");
    });

    it("shows IF keyword documentation", () => {
      const context: HoverContext = {
        text: "IF $condition THEN\n",
        line: 1,
        column: 2
      };

      const result = getHover(context);

      expect(result).not.toBeNull();
      expect(result?.content).toContain("Conditional");
    });

    it("shows SPAWN keyword documentation", () => {
      const context: HoverContext = {
        text: "SPAWN ~/agent/test\n",
        line: 1,
        column: 3
      };

      const result = getHover(context);

      expect(result).not.toBeNull();
      expect(result?.content).toContain("Delegate");
    });
  });

  describe("range", () => {
    it("returns correct range for hovered word", () => {
      const env = new TypeEnvironment();
      env.addVariable({ name: "$count", type: BUILTIN_TYPES.Number, source: "input" });

      const context: HoverContext = {
        text: "IF $count > 0\n",
        line: 1,
        column: 6,
        typeEnv: env
      };

      const result = getHover(context);

      expect(result?.range).toEqual({
        start: { line: 1, column: 4 },
        end: { line: 1, column: 10 }
      });
    });
  });

  describe("no hover", () => {
    it("returns null for whitespace", () => {
      const context: HoverContext = {
        text: "   \n",
        line: 1,
        column: 2
      };

      const result = getHover(context);

      expect(result).toBeNull();
    });

    it("returns null for unknown word", () => {
      const context: HoverContext = {
        text: "random text here\n",
        line: 1,
        column: 3
      };

      const result = getHover(context);

      expect(result).toBeNull();
    });
  });
});
