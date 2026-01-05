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
import { compile, CompileResult, Diagnostic as CompilerDiagnostic, DependencyGraph, DocumentMetadata } from '../../packages/core/src/compiler/compiler';
import { ZenLanguageServer } from '../../packages/lsp/src/server';
import type { Document } from '../../packages/core/src/parser/ast';
import type { Position, CompletionItem, Hover, Diagnostic } from '../../packages/lsp/src/server';

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
    edges: Array<{ target: string; type: 'uses' | 'reference' }>;
  };
}

type WorkerRequest =
  | { type: 'parse'; id: number; source: string }
  | { type: 'validate'; id: number; source: string }
  | { type: 'completions'; id: number; uri: string; source: string; position: Position }
  | { type: 'hover'; id: number; uri: string; source: string; position: Position }
  | { type: 'diagnostics'; id: number; uri: string; source: string };

type WorkerResponse =
  | { type: 'parse'; id: number; result: Document }
  | { type: 'validate'; id: number; result: ValidateResult }
  | { type: 'completions'; id: number; result: CompletionItem[] }
  | { type: 'hover'; id: number; result: Hover | null }
  | { type: 'diagnostics'; id: number; result: Diagnostic[] }
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

    case 'completions':
      handleCompletions(message.id, message.uri, message.source, message.position);
      break;

    case 'hover':
      handleHover(message.id, message.uri, message.source, message.position);
      break;

    case 'diagnostics':
      handleDiagnostics(message.id, message.uri, message.source);
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
