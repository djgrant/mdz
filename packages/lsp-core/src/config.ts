import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

export type MdzConfig = {
  root: string;
};

export type ConfigError =
  | { code: "MDZC0001_MISSING_CONFIG"; message: string }
  | { code: "MDZC0002_INVALID_CONFIG"; message: string }
  | { code: "MDZC0003_NO_WORKSPACE"; message: string };

export const uriToPath = (uri: string): string | null => {
  if (!uri.startsWith("file://")) return null;
  try {
    return fileURLToPath(uri);
  } catch {
    return null;
  }
};

export const findWorkspaceRoot = (
  filePath: string,
  workspaceFolders: string[]
): string | null => {
  const normalized = resolve(filePath);
  let bestMatch: string | null = null;
  for (const folder of workspaceFolders) {
    const folderPath = resolve(folder);
    if (!normalized.startsWith(folderPath)) continue;
    if (!bestMatch || folderPath.length > bestMatch.length) {
      bestMatch = folderPath;
    }
  }
  return bestMatch;
};

export type ConfigResult =
  | { ok: true; config: MdzConfig; rootPath: string }
  | { ok: false; error: ConfigError };

export const loadConfig = async (workspaceRoot: string): Promise<ConfigResult> => {
  const configPath = join(workspaceRoot, "mdz.config.json");
  if (!existsSync(configPath)) {
    return {
      ok: false,
      error: {
        code: "MDZC0001_MISSING_CONFIG",
        message: "Missing mdz.config.json at workspace root."
      }
    };
  }

  try {
    const raw = await readFile(configPath, "utf-8");
    const parsed = JSON.parse(raw) as Partial<MdzConfig>;
    if (!parsed.root || typeof parsed.root !== "string") {
      return {
        ok: false,
        error: {
          code: "MDZC0002_INVALID_CONFIG",
          message: "mdz.config.json must include a string 'root' field."
        }
      };
    }
    const rootPath = resolve(dirname(configPath), parsed.root);
    return { ok: true, config: { root: parsed.root }, rootPath };
  } catch (error) {
    return {
      ok: false,
      error: {
        code: "MDZC0002_INVALID_CONFIG",
        message: `Failed to read mdz.config.json: ${String(error)}`
      }
    };
  }
};
