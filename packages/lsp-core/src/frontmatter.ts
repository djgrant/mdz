import { parseDocument as parseYamlDocument } from "yaml";

export type FrontmatterLocation = {
  start: { line: number; column: number };
  end: { line: number; column: number };
};

export type FrontmatterDiagnostic = {
  code: string;
  message: string;
  location?: FrontmatterLocation;
};

export type FrontmatterBlock = {
  raw: string;
  content: string;
  value: unknown;
  location: FrontmatterLocation;
};

type FrontmatterSuccess = { ok: true; frontmatter: FrontmatterBlock | null };
type FrontmatterFailure = { ok: false; diagnostic: FrontmatterDiagnostic };
export type FrontmatterResult = FrontmatterSuccess | FrontmatterFailure;

const createLocation = (startLine: number, endLine: number): FrontmatterLocation => ({
  start: { line: startLine, column: 1 },
  end: { line: endLine, column: 1 }
});

const findFrontmatterFence = (lines: string[], startIndex: number): number => {
  for (let i = startIndex; i < lines.length; i += 1) {
    if (lines[i].trim() === "---") return i;
  }
  return -1;
};

export const parseFrontmatter = (text: string): FrontmatterResult => {
  const lines = text.split(/\r?\n/);
  if (lines.length === 0) return { ok: true, frontmatter: null };

  if (lines[0].trim() !== "---") {
    return { ok: true, frontmatter: null };
  }

  const closingIndex = findFrontmatterFence(lines, 1);
  if (closingIndex === -1) {
    return {
      ok: false,
      diagnostic: {
        code: "MDZL0100_UNCLOSED_FRONTMATTER",
        message: "Frontmatter fence not closed.",
        location: createLocation(1, 1)
      }
    };
  }

  const content = lines.slice(1, closingIndex).join("\n");
  const location = createLocation(1, closingIndex + 1);
  const raw = lines.slice(0, closingIndex + 1).join("\n");

  const doc = parseYamlDocument(content);
  if (doc.errors.length > 0) {
    const first = doc.errors[0];
    const linePos = "linePos" in first ? first.linePos?.[0] : undefined;
    const errorLine = linePos ? linePos.line + 2 : 1;
    const errorColumn = linePos ? linePos.col + 1 : 1;
    return {
      ok: false,
      diagnostic: {
        code: "MDZL0101_INVALID_FRONTMATTER",
        message: first.message,
        location: {
          start: { line: errorLine, column: errorColumn },
          end: { line: errorLine, column: errorColumn + 1 }
        }
      }
    };
  }

  return {
    ok: true,
    frontmatter: {
      raw,
      content,
      value: doc.toJSON(),
      location
    }
  };
};
