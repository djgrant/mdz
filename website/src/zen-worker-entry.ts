/**
 * MDZ Language Server Worker Entry Point
 *
 * This worker provides LSP-like functionality for the MDZ playground:
 * - parse: Parse MDZ code and return AST
 * - validate: Validate MDZ code and return diagnostics + metadata + dependencies
 * - completions: Get autocomplete suggestions
 * - hover: Get hover information
 * - diagnostics: Get syntax/semantic errors (legacy, use validate instead)
 */

import { parse } from '../../packages/core/src/parser/parser';
import { compile } from '../../packages/core/src/compiler/compiler';
import type { CompileResult, Diagnostic as CompilerDiagnostic, DependencyGraph, DocumentMetadata } from '../../packages/core/src/compiler/compiler';
import { ZenLanguageServer } from '../../packages/lsp/src/server';
import type { Document } from '../../packages/core/src/parser/ast';
import type { Position, CompletionItem, Hover, Diagnostic, SemanticTokens } from '../../packages/lsp/src/server';

// ============================================================================
// Message Types
// ============================================================================

interface ValidateResult {
  diagnostics: Array<{
    severity: 'error' | 'warning' | 'info';
    code: string;
    message: string;
    line: number;
    column: number;
    endLine: number;
    endColumn: number;
  }>;
  metadata: {
    name: string;
    description: string;
    uses: string[];
    types: Array<{ name: string; definition: string }>;
    variables: Array<{ name: string; type: string | null }>;
    references: Array<{ kind: 'skill' | 'section'; target: string }>;
    sections: Array<{ title: string; anchor: string; level: number }>;
  };
  dependencies: {
    nodes: string[];
    edges: Array<{ target: string; type: 'uses' | 'reference' | 'imports' }>;
  };
}

interface ValidateProjectResult {
  // Diagnostics per file
  fileResults: Record<string, ValidateResult>;
  // Unified dependency graph across all files
  unifiedGraph: {
    nodes: Array<{ id: string; file: string | null }>;
    edges: Array<{ source: string; target: string; type: 'uses' | 'reference' | 'imports' }>;
  };
}

type WorkerRequest =
  | { type: 'parse'; id: number; source: string }
  | { type: 'validate'; id: number; source: string }
  | { type: 'validateProject'; id: number; files: Record<string, string> }
  | { type: 'completions'; id: number; uri: string; source: string; position: Position }
  | { type: 'hover'; id: number; uri: string; source: string; position: Position }
  | { type: 'diagnostics'; id: number; uri: string; source: string }
  | { type: 'semanticTokens'; id: number; uri: string; source: string };

type WorkerResponse =
  | { type: 'parse'; id: number; result: Document }
  | { type: 'validate'; id: number; result: ValidateResult }
  | { type: 'validateProject'; id: number; result: ValidateProjectResult }
  | { type: 'completions'; id: number; result: CompletionItem[] }
  | { type: 'hover'; id: number; result: Hover | null }
  | { type: 'diagnostics'; id: number; result: Diagnostic[] }
  | { type: 'semanticTokens'; id: number; result: SemanticTokens }
  | { type: 'error'; id: number; error: string };

// ============================================================================
// Worker State
// ============================================================================

const lspServer = new ZenLanguageServer();

// ============================================================================
// Message Handlers
// ============================================================================

function handleParse(id: number, source: string): void {
  try {
    const result = parse(source);
    postMessage({
      type: 'parse',
      id,
      result,
    } as WorkerResponse);
  } catch (error) {
    postMessage({
      type: 'error',
      id,
      error: error instanceof Error ? error.message : String(error),
    } as WorkerResponse);
  }
}

function handleValidate(id: number, source: string): void {
  try {
    const compileResult = compile(source);
    
    // Convert to playground-friendly format
    const result: ValidateResult = {
      diagnostics: compileResult.diagnostics.map(d => ({
        severity: d.severity,
        code: d.code,
        message: d.message,
        line: d.span.start.line,
        column: d.span.start.column,
        endLine: d.span.end.line,
        endColumn: d.span.end.column,
      })),
      metadata: {
        name: compileResult.metadata.name,
        description: compileResult.metadata.description,
        uses: compileResult.metadata.uses,
        types: compileResult.metadata.types.map(t => ({
          name: t.name,
          definition: t.definition,
        })),
        variables: compileResult.metadata.variables.map(v => ({
          name: v.name,
          type: v.type,
        })),
        references: compileResult.metadata.references.map(r => ({
          kind: r.kind,
          target: r.target,
        })),
        sections: compileResult.metadata.sections.map(s => ({
          title: s.title,
          anchor: s.anchor,
          level: s.level,
        })),
      },
      dependencies: {
        nodes: compileResult.dependencies.nodes,
        edges: compileResult.dependencies.edges.map(e => ({
          target: e.target,
          type: e.type,
        })),
      },
    };

    postMessage({
      type: 'validate',
      id,
      result,
    } as WorkerResponse);
  } catch (error) {
    postMessage({
      type: 'error',
      id,
      error: error instanceof Error ? error.message : String(error),
    } as WorkerResponse);
  }
}

function handleCompletions(id: number, uri: string, source: string, position: Position): void {
  try {
    // Update document in LSP server
    lspServer.updateDocument(uri, source);

    // Get completions
    const result = lspServer.getCompletions(uri, position);

    postMessage({
      type: 'completions',
      id,
      result,
    } as WorkerResponse);
  } catch (error) {
    postMessage({
      type: 'error',
      id,
      error: error instanceof Error ? error.message : String(error),
    } as WorkerResponse);
  }
}

function handleHover(id: number, uri: string, source: string, position: Position): void {
  try {
    // Update document in LSP server
    lspServer.updateDocument(uri, source);

    // Get hover info
    const result = lspServer.getHover(uri, position);

    postMessage({
      type: 'hover',
      id,
      result,
    } as WorkerResponse);
  } catch (error) {
    postMessage({
      type: 'error',
      id,
      error: error instanceof Error ? error.message : String(error),
    } as WorkerResponse);
  }
}

function handleDiagnostics(id: number, uri: string, source: string): void {
  try {
    // Update document and get diagnostics
    const result = lspServer.updateDocument(uri, source);

    postMessage({
      type: 'diagnostics',
      id,
      result,
    } as WorkerResponse);
  } catch (error) {
    postMessage({
      type: 'error',
      id,
      error: error instanceof Error ? error.message : String(error),
    } as WorkerResponse);
  }
}

function handleSemanticTokens(id: number, uri: string, source: string): void {
  try {
    lspServer.updateDocument(uri, source);
    const result = lspServer.getSemanticTokens(uri);
    postMessage({
      type: 'semanticTokens',
      id,
      result,
    } as WorkerResponse);
  } catch (error) {
    postMessage({
      type: 'error',
      id,
      error: error instanceof Error ? error.message : String(error),
    } as WorkerResponse);
  }
}

function handleValidateProject(id: number, files: Record<string, string>): void {
  try {
    const fileResults: Record<string, ValidateResult> = {};
    const allNodes = new Map<string, string | null>(); // skill name -> file name (null if external)
    const allEdges: Array<{ source: string; target: string; type: 'uses' | 'reference' | 'imports' }> = [];

    // Build a map of skill names to file names
    const skillToFile = new Map<string, string>();
    for (const [fileName, source] of Object.entries(files)) {
      const compileResult = compile(source);
      if (compileResult.metadata.name) {
        skillToFile.set(compileResult.metadata.name, fileName);
      }
    }

    // Validate each file and build unified graph
    for (const [fileName, source] of Object.entries(files)) {
      const compileResult = compile(source);
      const skillName = compileResult.metadata.name;

      // Convert to playground-friendly format
      fileResults[fileName] = {
        diagnostics: compileResult.diagnostics.map(d => ({
          severity: d.severity,
          code: d.code,
          message: d.message,
          line: d.span.start.line,
          column: d.span.start.column,
          endLine: d.span.end.line,
          endColumn: d.span.end.column,
        })),
        metadata: {
          name: compileResult.metadata.name,
          description: compileResult.metadata.description,
          uses: compileResult.metadata.uses,
          types: compileResult.metadata.types.map(t => ({
            name: t.name,
            definition: t.definition,
          })),
          variables: compileResult.metadata.variables.map(v => ({
            name: v.name,
            type: v.type,
          })),
          references: compileResult.metadata.references.map(r => ({
            kind: r.kind,
            target: r.target,
          })),
          sections: compileResult.metadata.sections.map(s => ({
            title: s.title,
            anchor: s.anchor,
            level: s.level,
          })),
        },
        dependencies: {
          nodes: compileResult.dependencies.nodes,
          edges: compileResult.dependencies.edges.map(e => ({
            target: e.target,
            type: e.type,
          })),
        },
      };

      // Add this skill as a node
      if (skillName) {
        allNodes.set(skillName, fileName);
      }

      // Add dependency nodes and edges
      for (const dep of compileResult.dependencies.nodes) {
        if (!allNodes.has(dep)) {
          // Check if it's in our project or external
          allNodes.set(dep, skillToFile.get(dep) || null);
        }
      }

      for (const edge of compileResult.dependencies.edges) {
        if (skillName) {
          allEdges.push({
            source: skillName,
            target: edge.target,
            type: edge.type,
          });
        }
      }
    }

    const result: ValidateProjectResult = {
      fileResults,
      unifiedGraph: {
        nodes: Array.from(allNodes.entries()).map(([id, file]) => ({ id, file })),
        edges: allEdges,
      },
    };

    postMessage({
      type: 'validateProject',
      id,
      result,
    } as WorkerResponse);
  } catch (error) {
    postMessage({
      type: 'error',
      id,
      error: error instanceof Error ? error.message : String(error),
    } as WorkerResponse);
  }
}

// ============================================================================
// Main Message Handler
// ============================================================================

self.addEventListener('message', (event: MessageEvent<WorkerRequest>) => {
  const message = event.data;

  switch (message.type) {
    case 'parse':
      handleParse(message.id, message.source);
      break;

    case 'validate':
      handleValidate(message.id, message.source);
      break;

    case 'validateProject':
      handleValidateProject(message.id, message.files);
      break;

    case 'completions':
      handleCompletions(message.id, message.uri, message.source, message.position);
      break;

    case 'hover':
      handleHover(message.id, message.uri, message.source, message.position);
      break;

    case 'diagnostics':
      handleDiagnostics(message.id, message.uri, message.source);
      break;

    case 'semanticTokens':
      handleSemanticTokens(message.id, message.uri, message.source);
      break;

    default:
      postMessage({
        type: 'error',
        id: (message as any).id || 0,
        error: `Unknown message type: ${(message as any).type}`,
      } as WorkerResponse);
  }
});

// Signal that worker is ready
postMessage({ type: 'ready' });
