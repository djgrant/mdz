/**
 * Zen Language Server Worker Entry Point
 *
 * This worker provides LSP-like functionality for the zen playground:
 * - parse: Parse zen code and return AST
 * - completions: Get autocomplete suggestions
 * - hover: Get hover information
 * - diagnostics: Get syntax/semantic errors
 */

import { parse } from '../../src/parser/parser';
import { ZenLanguageServer } from '../../src/lsp/server';
import type { Document } from '../../src/parser/ast';
import type { Position, CompletionItem, Hover, Diagnostic } from '../../src/lsp/server';

// ============================================================================
// Message Types
// ============================================================================

type WorkerRequest =
  | { type: 'parse'; id: number; source: string }
  | { type: 'completions'; id: number; uri: string; source: string; position: Position }
  | { type: 'hover'; id: number; uri: string; source: string; position: Position }
  | { type: 'diagnostics'; id: number; uri: string; source: string };

type WorkerResponse =
  | { type: 'parse'; id: number; result: Document }
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
