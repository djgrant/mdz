import { existsSync } from "node:fs";
import {
  parseDocument,
  findWorkspaceRoot,
  loadConfig,
  uriToPath,
  extractLinksFromAst,
  locateLinkOccurrences,
  resolvePathLink,
  collectAnchors,
  normalizeAnchorValue,
  type LinkOccurrence
} from "@mdzlang/lsp-core";
import { DiagnosticSeverity, type Diagnostic } from "vscode-languageserver/node.js";

export const rangeFromLocation = (location?: {
  start: { line: number; column: number };
  end: { line: number; column: number };
}): Diagnostic["range"] => {
  if (!location) {
    return {
      start: { line: 0, character: 0 },
      end: { line: 0, character: 1 }
    };
  }
  return {
    start: {
      line: Math.max(0, location.start.line - 1),
      character: Math.max(0, location.start.column - 1)
    },
    end: {
      line: Math.max(0, location.end.line - 1),
      character: Math.max(0, location.end.column - 1)
    }
  };
};

const rangeFromOccurrence = (occurrence: LinkOccurrence): Diagnostic["range"] => ({
  start: {
    line: occurrence.range.start.line,
    character: occurrence.range.start.column
  },
  end: {
    line: occurrence.range.end.line,
    character: occurrence.range.end.column
  }
});

type CollectInput = {
  text: string;
  uri: string;
  workspacePaths: string[];
};

export const collectDiagnostics = async (
  input: CollectInput
): Promise<Diagnostic[]> => {
  const diagnostics: Diagnostic[] = [];
  const parseResult = await parseDocument(input.text);

  if (!parseResult.ok) {
    diagnostics.push({
      severity: DiagnosticSeverity.Error,
      range: rangeFromLocation(parseResult.diagnostic.location),
      message: parseResult.diagnostic.message,
      code: parseResult.diagnostic.code,
      source: "mdz"
    });
  }

  const docPath = uriToPath(input.uri);
  if (!docPath || input.workspacePaths.length === 0) {
    diagnostics.push({
      severity: DiagnosticSeverity.Warning,
      range: rangeFromLocation(),
      message: "No workspace root found; mdz.config.json is required.",
      code: "MDZC0003_NO_WORKSPACE",
      source: "mdz"
    });
    return diagnostics;
  }

  const workspaceRoot = findWorkspaceRoot(docPath, input.workspacePaths);
  if (!workspaceRoot) {
    diagnostics.push({
      severity: DiagnosticSeverity.Warning,
      range: rangeFromLocation(),
      message: "Document is outside configured workspace roots.",
      code: "MDZC0003_NO_WORKSPACE",
      source: "mdz"
    });
    return diagnostics;
  }

  const configResult = await loadConfig(workspaceRoot);
  if (!configResult.ok) {
    diagnostics.push({
      severity: DiagnosticSeverity.Warning,
      range: rangeFromLocation(),
      message: configResult.error.message,
      code: configResult.error.code,
      source: "mdz"
    });
    return diagnostics;
  }

  if (!parseResult.ok) return diagnostics;

  const links = extractLinksFromAst(parseResult.ast);
  const occurrences = locateLinkOccurrences(input.text, links);
  const anchors = collectAnchors(input.text);

  for (const occurrence of occurrences) {
    if (occurrence.kind === "path") {
      const resolved = resolvePathLink(configResult.rootPath, occurrence.value);
      if (!resolved || !existsSync(resolved)) {
        diagnostics.push({
          severity: DiagnosticSeverity.Warning,
          range: rangeFromOccurrence(occurrence),
          message: `Linked file not found: ${occurrence.value}`,
          code: "MDZL0001_MISSING_PATH",
          source: "mdz"
        });
      }
      continue;
    }

    if (occurrence.kind === "anchor") {
      const anchorName = normalizeAnchorValue(occurrence.value);
      const count = anchors.get(anchorName) ?? 0;
      if (count === 0) {
        diagnostics.push({
          severity: DiagnosticSeverity.Warning,
          range: rangeFromOccurrence(occurrence),
          message: `Anchor not found: ${occurrence.value}`,
          code: "MDZL0002_MISSING_ANCHOR",
          source: "mdz"
        });
      } else if (count > 1) {
        diagnostics.push({
          severity: DiagnosticSeverity.Warning,
          range: rangeFromOccurrence(occurrence),
          message: `Anchor is ambiguous: ${occurrence.value}`,
          code: "MDZL0003_AMBIGUOUS_ANCHOR",
          source: "mdz"
        });
      }
    }
  }

  return diagnostics;
};
