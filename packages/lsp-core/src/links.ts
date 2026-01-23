import { existsSync } from "node:fs";
import { resolve } from "node:path";

export type LinkKind = "path" | "anchor";

export type LinkRef = {
  kind: LinkKind;
  value: string;
};

export type LinkRange = {
  start: { line: number; column: number };
  end: { line: number; column: number };
};

export type LinkOccurrence = LinkRef & {
  range: LinkRange;
};

const isLinkRef = (value: unknown): value is LinkRef => {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    record.type === "link" &&
    (record.kind === "path" || record.kind === "anchor") &&
    typeof record.value === "string"
  );
};

export const extractLinksFromAst = (ast: unknown): LinkRef[] => {
  const found: LinkRef[] = [];
  const seen = new Set<string>();

  const visit = (value: unknown): void => {
    if (Array.isArray(value)) {
      for (const item of value) visit(item);
      return;
    }
    if (!value || typeof value !== "object") return;

    if (isLinkRef(value)) {
      const ref = { kind: value.kind, value: value.value };
      const key = `${ref.kind}:${ref.value}`;
      if (!seen.has(key)) {
        seen.add(key);
        found.push(ref);
      }
    }

    for (const child of Object.values(value as Record<string, unknown>)) {
      visit(child);
    }
  };

  visit(ast);
  return found;
};

const buildLineOffsets = (text: string): number[] => {
  const offsets = [0];
  for (let i = 0; i < text.length; i += 1) {
    if (text[i] === "\n") offsets.push(i + 1);
  }
  return offsets;
};

const offsetToPosition = (
  offset: number,
  lineOffsets: number[]
): { line: number; column: number } => {
  let low = 0;
  let high = lineOffsets.length - 1;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (lineOffsets[mid] <= offset) {
      if (mid === lineOffsets.length - 1 || lineOffsets[mid + 1] > offset) {
        const line = mid;
        const column = offset - lineOffsets[mid];
        return { line, column };
      }
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return { line: 0, column: offset };
};

export const locateLinkOccurrences = (
  text: string,
  links: LinkRef[]
): LinkOccurrence[] => {
  const results: LinkOccurrence[] = [];
  const lineOffsets = buildLineOffsets(text);

  for (const link of links) {
    let index = text.indexOf(link.value);
    while (index !== -1) {
      const start = offsetToPosition(index, lineOffsets);
      const end = { line: start.line, column: start.column + link.value.length };
      results.push({ ...link, range: { start, end } });
      index = text.indexOf(link.value, index + link.value.length);
    }
  }

  return results;
};

export const resolvePathLink = (rootPath: string, value: string): string | null => {
  if (!value.startsWith("~/")) return null;
  const relative = value.slice(2);
  return resolve(rootPath, relative);
};

export const pathLinkExists = (rootPath: string, value: string): boolean => {
  const resolved = resolvePathLink(rootPath, value);
  if (!resolved) return false;
  return existsSync(resolved);
};

const headingPattern = /^(#{1,6})\s+(.+)\s*$/;

export const slugifyHeading = (heading: string): string => {
  const trimmed = heading.trim().toLowerCase();
  const collapsed = trimmed.replace(/\s+/g, "-");
  const cleaned = collapsed.replace(/[^a-z0-9_-]/g, "");
  return cleaned.replace(/-+/g, "-").replace(/^-+|-+$/g, "");
};

export const collectAnchors = (text: string): Map<string, number> => {
  const anchors = new Map<string, number>();
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    const match = headingPattern.exec(line);
    if (!match) continue;
    const slug = slugifyHeading(match[2]);
    if (!slug) continue;
    anchors.set(slug, (anchors.get(slug) ?? 0) + 1);
  }
  return anchors;
};

export const normalizeAnchorValue = (value: string): string => {
  if (value.startsWith("#")) return value.slice(1);
  return value;
};
