import { describe, it, expect } from "vitest";
import { mkdtemp, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
import { collectDiagnostics } from "./diagnostics.js";

const createWorkspace = async (): Promise<string> => {
  return mkdtemp(join(tmpdir(), "mdz-lsp-"));
};

describe("collectDiagnostics", () => {
  it("reports missing config when mdz.config.json is absent", async () => {
    const workspace = await createWorkspace();
    const filePath = join(workspace, "doc.mdz");
    const uri = pathToFileURL(filePath).toString();
    const diagnostics = await collectDiagnostics({
      text: "RETURN ok\n",
      uri,
      workspacePaths: [workspace]
    });
    const codes = diagnostics.map((diag) => String(diag.code));
    expect(codes).toContain("MDZC0001_MISSING_CONFIG");
  });

  it("reports missing path and anchor links", async () => {
    const workspace = await createWorkspace();
    const configPath = join(workspace, "mdz.config.json");
    await writeFile(configPath, JSON.stringify({ root: "." }));

    const filePath = join(workspace, "doc.mdz");
    const uri = pathToFileURL(filePath).toString();
    const diagnostics = await collectDiagnostics({
      text: "USE ~/missing/path\nSPAWN ~/agent/reporter WITH #missing\n",
      uri,
      workspacePaths: [workspace]
    });

    const codes = diagnostics.map((diag) => String(diag.code));
    expect(codes).toContain("MDZL0001_MISSING_PATH");
    expect(codes).toContain("MDZL0002_MISSING_ANCHOR");
  });
});
