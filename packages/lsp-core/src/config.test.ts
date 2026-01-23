import { describe, it, expect } from "vitest";
import { mkdtemp, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { loadConfig } from "./config.js";

describe("loadConfig", () => {
  it("loads mdz.config.json with a root", async () => {
    const root = await mkdtemp(join(tmpdir(), "mdz-config-"));
    const configPath = join(root, "mdz.config.json");
    await writeFile(configPath, JSON.stringify({ root: "." }));

    const result = await loadConfig(root);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.config.root).toBe(".");
    }
  });

  it("fails when mdz.config.json is missing", async () => {
    const root = await mkdtemp(join(tmpdir(), "mdz-config-"));
    const result = await loadConfig(root);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("MDZC0001_MISSING_CONFIG");
    }
  });
});
