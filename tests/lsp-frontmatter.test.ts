import { describe, it, expect } from "vitest";
import { createLanguageServer } from "../packages/lsp/src/server";

const buildDocument = () => {
  const lines = [
    "---",
    "name: frontmatter-test",
    "description: test",
    "types:",
    "  Task: any task",
    "input:",
    "  plan: $Task",
    "context:",
    "  runId: $String",
    "---",
    "",
    "## Types",
    "",
    "$Legacy: old type",
    "",
    "## Input",
    "",
    "$legacyInput: $String",
    "",
    "## Context",
    "",
    "$legacyContext: $String",
    "",
    "$",
  ];

  return {
    content: lines.join("\n"),
    lineIndex: {
      taskType: 4,
      inputPlan: 6,
      contextRunId: 8,
      legacyType: 13,
      completionTrigger: lines.length - 1,
    },
  };
};

describe("LSP frontmatter analysis", () => {
  it("surfaces frontmatter types/input/context in completions", () => {
    const { content, lineIndex } = buildDocument();
    const server = createLanguageServer();
    const uri = "file:///frontmatter.mdz";

    server.openDocument(uri, content);

    const completions = server.getCompletions(uri, {
      line: lineIndex.completionTrigger,
      character: 1,
    });

    const labels = completions.map((item) => item.label);
    expect(labels).toContain("Task");
    expect(labels).toContain("plan");
    expect(labels).toContain("runId");
    expect(labels).not.toContain("Legacy");
    expect(labels).not.toContain("legacyInput");
    expect(labels).not.toContain("legacyContext");
  });

  it("uses frontmatter spans for hover and ignores legacy sections", () => {
    const { content, lineIndex } = buildDocument();
    const server = createLanguageServer();
    const uri = "file:///frontmatter.mdz";

    server.openDocument(uri, content);

    const typeHover = server.getHover(uri, {
      line: lineIndex.taskType,
      character: 3,
    });
    expect(typeHover?.contents).toContain("**Type** $Task");

    const inputHover = server.getHover(uri, {
      line: lineIndex.inputPlan,
      character: 3,
    });
    expect(inputHover?.contents).toContain("**Variable** $plan");
    expect(inputHover?.contents).toContain("*input*");

    const contextHover = server.getHover(uri, {
      line: lineIndex.contextRunId,
      character: 3,
    });
    expect(contextHover?.contents).toContain("**Variable** $runId");
    expect(contextHover?.contents).toContain("*context*");

    const legacyHover = server.getHover(uri, {
      line: lineIndex.legacyType,
      character: 1,
    });
    expect(legacyHover).toBeNull();
  });
});


