import { describe, it, expect } from "vitest";
import { getDefinition, type DefinitionContext } from "./definition.js";
import { TypeEnvironment, BUILTIN_TYPES } from "./types.js";

describe("getDefinition", () => {
  describe("variable definition", () => {
    it("finds variable definition location", () => {
      const env = new TypeEnvironment();
      env.addVariable({
        name: "$count",
        type: BUILTIN_TYPES.Number,
        source: "assignment",
        location: {
          start: { line: 1, column: 1 },
          end: { line: 1, column: 12 }
        }
      });

      const context: DefinitionContext = {
        text: "$count = 5\nIF $count > 0\n",
        uri: "file:///test/doc.mdz",
        line: 2,
        column: 6,
        typeEnv: env
      };

      const result = getDefinition(context);

      expect(result).not.toBeNull();
      expect(result?.uri).toBe("file:///test/doc.mdz");
      expect(result?.range.start.line).toBe(1);
    });

    it("returns null for undefined variable", () => {
      const env = new TypeEnvironment();

      const context: DefinitionContext = {
        text: "IF $unknown\n",
        uri: "file:///test/doc.mdz",
        line: 1,
        column: 6,
        typeEnv: env
      };

      const result = getDefinition(context);

      expect(result).toBeNull();
    });

    it("returns null for variable without location", () => {
      const env = new TypeEnvironment();
      env.addVariable({
        name: "$count",
        type: BUILTIN_TYPES.Number,
        source: "input"
      });

      const context: DefinitionContext = {
        text: "IF $count\n",
        uri: "file:///test/doc.mdz",
        line: 1,
        column: 6,
        typeEnv: env
      };

      const result = getDefinition(context);

      expect(result).toBeNull();
    });
  });

  describe("type definition", () => {
    it("finds type definition location", () => {
      const env = new TypeEnvironment();
      env.addType({
        name: "Status",
        type: { kind: "semantic", description: "a status" },
        location: {
          start: { line: 1, column: 1 },
          end: { line: 1, column: 30 }
        }
      });

      const context: DefinitionContext = {
        text: "TYPE Status = draft | published\n$var: Status\n",
        uri: "file:///test/doc.mdz",
        line: 2,
        column: 8,
        typeEnv: env
      };

      const result = getDefinition(context);

      expect(result).not.toBeNull();
      expect(result?.range.start.line).toBe(1);
    });

    it("returns null for undefined type", () => {
      const env = new TypeEnvironment();

      const context: DefinitionContext = {
        text: "$var: Unknown\n",
        uri: "file:///test/doc.mdz",
        line: 1,
        column: 8,
        typeEnv: env
      };

      const result = getDefinition(context);

      expect(result).toBeNull();
    });
  });

  describe("anchor definition", () => {
    it("finds anchor heading location", () => {
      const text = `# Overview
## Getting Started
SPAWN ~/agent WITH #getting-started
`;

      const context: DefinitionContext = {
        text,
        uri: "file:///test/doc.mdz",
        line: 3,
        column: 25
      };

      const result = getDefinition(context);

      expect(result).not.toBeNull();
      expect(result?.uri).toBe("file:///test/doc.mdz");
      expect(result?.range.start.line).toBe(2);
    });

    it("returns null for missing anchor", () => {
      const text = `# Overview
SPAWN ~/agent WITH #missing
`;

      const context: DefinitionContext = {
        text,
        uri: "file:///test/doc.mdz",
        line: 2,
        column: 22
      };

      const result = getDefinition(context);

      expect(result).toBeNull();
    });
  });

  describe("path link definition", () => {
    it("resolves path link to file URI", () => {
      const context: DefinitionContext = {
        text: "USE ~/skill/debug\n",
        uri: "file:///test/doc.mdz",
        line: 1,
        column: 8,
        rootPath: "/workspace"
      };

      const result = getDefinition(context);

      expect(result).not.toBeNull();
      expect(result?.uri).toContain("file://");
      expect(result?.uri).toContain("/workspace/skill/debug");
    });

    it("returns null without rootPath", () => {
      const context: DefinitionContext = {
        text: "USE ~/skill/debug\n",
        uri: "file:///test/doc.mdz",
        line: 1,
        column: 8
      };

      const result = getDefinition(context);

      expect(result).toBeNull();
    });
  });

  describe("no definition", () => {
    it("returns null for whitespace", () => {
      const context: DefinitionContext = {
        text: "   \n",
        uri: "file:///test/doc.mdz",
        line: 1,
        column: 2
      };

      const result = getDefinition(context);

      expect(result).toBeNull();
    });

    it("returns null for plain text", () => {
      const context: DefinitionContext = {
        text: "some text\n",
        uri: "file:///test/doc.mdz",
        line: 1,
        column: 3
      };

      const result = getDefinition(context);

      expect(result).toBeNull();
    });
  });
});
