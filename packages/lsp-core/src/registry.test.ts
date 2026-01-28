import { describe, it, expect, beforeEach } from "vitest";
import { DocumentRegistry } from "./registry.js";

describe("DocumentRegistry", () => {
  let registry: DocumentRegistry;

  beforeEach(() => {
    registry = new DocumentRegistry();
  });

  it("stores and retrieves documents", async () => {
    const uri = "file:///test/doc.mdz";
    const text = "RETURN ok\n";

    const entry = await registry.updateDocument(uri, text, 1);

    expect(entry.uri).toBe(uri);
    expect(entry.version).toBe(1);
    expect(entry.text).toBe(text);
    expect(entry.parseResult.ok).toBe(true);

    const retrieved = registry.getDocument(uri);
    expect(retrieved).toBe(entry);
  });

  it("extracts frontmatter analysis from documents", async () => {
    const uri = "file:///test/doc.mdz";
    const text = `---
types:
  Task: any task description
input:
  $task: Task
---
RETURN ok
`;

    const entry = await registry.updateDocument(uri, text, 1);

    expect(entry.frontmatter).not.toBeNull();
    expect(entry.frontmatterAnalysis).not.toBeNull();
    expect(entry.frontmatterAnalysis?.types.Task).toBeDefined();
    expect(entry.frontmatterAnalysis?.input.$task).toBeDefined();
  });

  it("extracts links from parsed AST", async () => {
    const uri = "file:///test/doc.mdz";
    const text = "USE ~/skill/debug\nSPAWN ~/agent/test WITH #note\n";

    const entry = await registry.updateDocument(uri, text, 1);

    expect(entry.links.length).toBeGreaterThan(0);
    const pathLinks = entry.links.filter((l) => l.kind === "path");
    expect(pathLinks.some((l) => l.value === "~/skill/debug")).toBe(true);
    expect(pathLinks.some((l) => l.value === "~/agent/test")).toBe(true);
  });

  it("finds type declarations across documents", async () => {
    await registry.updateDocument(
      "file:///test/a.mdz",
      `---
types:
  Task: a task
---
RETURN ok
`,
      1
    );

    await registry.updateDocument(
      "file:///test/b.mdz",
      `---
types:
  Strategy: '"fast" | "slow"'
---
RETURN ok
`,
      1
    );

    const taskResult = registry.findTypeDeclaration("Task");
    expect(taskResult).toBeDefined();
    expect(taskResult?.uri).toBe("file:///test/a.mdz");

    const strategyResult = registry.findTypeDeclaration("Strategy");
    expect(strategyResult).toBeDefined();
    expect(strategyResult?.uri).toBe("file:///test/b.mdz");

    const notFound = registry.findTypeDeclaration("Unknown");
    expect(notFound).toBeUndefined();
  });

  it("finds documents referencing a path", async () => {
    await registry.updateDocument(
      "file:///test/a.mdz",
      "USE ~/skill/debug\n",
      1
    );

    await registry.updateDocument(
      "file:///test/b.mdz",
      "SPAWN ~/agent/test\n",
      1
    );

    const debugRefs = registry.findDocumentsReferencingPath("~/skill/debug");
    expect(debugRefs.length).toBe(1);
    expect(debugRefs[0].uri).toBe("file:///test/a.mdz");
  });

  it("removes documents", async () => {
    const uri = "file:///test/doc.mdz";
    await registry.updateDocument(uri, "RETURN ok\n", 1);

    expect(registry.getDocument(uri)).toBeDefined();

    registry.removeDocument(uri);

    expect(registry.getDocument(uri)).toBeUndefined();
  });

  it("returns all documents", async () => {
    await registry.updateDocument("file:///test/a.mdz", "RETURN a\n", 1);
    await registry.updateDocument("file:///test/b.mdz", "RETURN b\n", 1);

    const docs = registry.getAllDocuments();
    expect(docs.length).toBe(2);
  });
});
