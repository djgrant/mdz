import { describe, it, expect } from "vitest";
import { getCompletions, type CompletionContext } from "./completion.js";
import { TypeEnvironment, BUILTIN_TYPES } from "./types.js";

describe("getCompletions", () => {
  describe("keyword completions", () => {
    it("returns keywords at line start", () => {
      const context: CompletionContext = {
        text: "\n",
        line: 1,
        column: 1
      };

      const completions = getCompletions(context);
      const labels = completions.map((c) => c.label);

      expect(labels).toContain("FOR");
      expect(labels).toContain("IF");
      expect(labels).toContain("WHILE");
      expect(labels).toContain("SPAWN");
      expect(labels).toContain("USE");
      expect(labels).toContain("RETURN");
    });

    it("returns keywords after list marker", () => {
      const context: CompletionContext = {
        text: "- \n",
        line: 1,
        column: 3
      };

      const completions = getCompletions(context);
      const labels = completions.map((c) => c.label);

      expect(labels).toContain("FOR");
      expect(labels).toContain("IF");
    });

    it("returns keywords after indentation", () => {
      const context: CompletionContext = {
        text: "    \n",
        line: 1,
        column: 5
      };

      const completions = getCompletions(context);
      const labels = completions.map((c) => c.label);

      expect(labels).toContain("FOR");
    });
  });

  describe("variable completions", () => {
    it("returns variables after $", () => {
      const env = new TypeEnvironment();
      env.addVariable({ name: "$count", type: BUILTIN_TYPES.Number, source: "input" });
      env.addVariable({ name: "$name", type: BUILTIN_TYPES.String, source: "assignment" });

      const context: CompletionContext = {
        text: "IF $\n",
        line: 1,
        column: 5,
        typeEnv: env
      };

      const completions = getCompletions(context);

      expect(completions.length).toBe(2);
      expect(completions.some((c) => c.label === "$count")).toBe(true);
      expect(completions.some((c) => c.label === "$name")).toBe(true);
    });

    it("returns variables with partial match", () => {
      const env = new TypeEnvironment();
      env.addVariable({ name: "$counter", type: BUILTIN_TYPES.Number, source: "input" });
      env.addVariable({ name: "$config", type: BUILTIN_TYPES.String, source: "context" });

      const context: CompletionContext = {
        text: "IF $co\n",
        line: 1,
        column: 7,
        typeEnv: env
      };

      const completions = getCompletions(context);

      expect(completions.length).toBe(2);
    });

    it("includes variable source in detail", () => {
      const env = new TypeEnvironment();
      env.addVariable({ name: "$input", type: BUILTIN_TYPES.Number, source: "input" });

      const context: CompletionContext = {
        text: "$\n",
        line: 1,
        column: 2,
        typeEnv: env
      };

      const completions = getCompletions(context);
      const inputCompletion = completions.find((c) => c.label === "$input");

      expect(inputCompletion?.detail).toContain("input");
    });
  });

  describe("type completions", () => {
    it("returns types after colon", () => {
      const env = new TypeEnvironment();
      env.addType({ name: "Task", type: { kind: "semantic", description: "a task" } });

      const context: CompletionContext = {
        text: "$var: \n",
        line: 1,
        column: 7,
        typeEnv: env
      };

      const completions = getCompletions(context);
      const labels = completions.map((c) => c.label);

      expect(labels).toContain("Number");
      expect(labels).toContain("String");
      expect(labels).toContain("Array");
      expect(labels).toContain("Task");
    });

    it("returns types with partial name", () => {
      const env = new TypeEnvironment();

      const context: CompletionContext = {
        text: "$var: Num\n",
        line: 1,
        column: 10,
        typeEnv: env
      };

      const completions = getCompletions(context);

      expect(completions.some((c) => c.label === "Number")).toBe(true);
    });
  });

  describe("anchor completions", () => {
    it("returns anchors after #", () => {
      const text = `# Overview
## Getting Started
SPAWN ~/agent WITH #\n`;

      const context: CompletionContext = {
        text,
        line: 3,
        column: 21
      };

      const completions = getCompletions(context);
      const labels = completions.map((c) => c.label);

      expect(labels).toContain("#overview");
      expect(labels).toContain("#getting-started");
    });

    it("returns anchors with partial match", () => {
      const text = `# Overview
## Getting Started
WITH #get\n`;

      const context: CompletionContext = {
        text,
        line: 3,
        column: 10
      };

      const completions = getCompletions(context);

      expect(completions.some((c) => c.label === "#getting-started")).toBe(true);
    });
  });

  describe("path completions", () => {
    it("returns path prefixes after ~/", () => {
      const context: CompletionContext = {
        text: "USE ~/\n",
        line: 1,
        column: 7,
        workspaceFiles: ["agent/reporter.mdz", "skill/debug.mdz", "skill/test.mdz"]
      };

      const completions = getCompletions(context);
      const labels = completions.map((c) => c.label);

      expect(labels).toContain("~/agent/");
      expect(labels).toContain("~/skill/");
    });

    it("returns path completions with partial match", () => {
      const context: CompletionContext = {
        text: "SPAWN ~/ag\n",
        line: 1,
        column: 11,
        workspaceFiles: ["agent/reporter.mdz", "skill/debug.mdz"]
      };

      const completions = getCompletions(context);

      expect(completions.some((c) => c.label === "~/agent/")).toBe(true);
    });
  });

  describe("no completions", () => {
    it("returns empty array mid-line without trigger", () => {
      const context: CompletionContext = {
        text: "some text here\n",
        line: 1,
        column: 6
      };

      const completions = getCompletions(context);

      expect(completions.length).toBe(0);
    });
  });
});
