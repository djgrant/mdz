#!/usr/bin/env node
import {
  createConnection,
  ProposedFeatures,
  TextDocuments,
  TextDocumentSyncKind,
  InitializeParams,
  InitializeResult,
  CompletionItem,
  Hover,
  Location,
  DocumentSymbol,
  CompletionParams,
  HoverParams,
  DefinitionParams,
  DocumentSymbolParams,
  TextDocumentChangeEvent,
  SemanticTokensParams,
  SemanticTokens,
} from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { ZenLanguageServer } from './server';

const connection = createConnection(ProposedFeatures.all);
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);
const zenServer = new ZenLanguageServer();

connection.onInitialize((_params: InitializeParams): InitializeResult => {
  return {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      completionProvider: {
        triggerCharacters: ['~', '#', '$', '/'],
      },
      hoverProvider: true,
      definitionProvider: true,
      documentSymbolProvider: true,
      semanticTokensProvider: {
        full: true,
        legend: zenServer.getSemanticTokensLegend(),
      },
    },
  };
});

documents.onDidOpen((event: TextDocumentChangeEvent<TextDocument>) => {
  const diagnostics = zenServer.openDocument(event.document.uri, event.document.getText());
  connection.sendDiagnostics({ uri: event.document.uri, diagnostics });
});

documents.onDidChangeContent((event: TextDocumentChangeEvent<TextDocument>) => {
  const diagnostics = zenServer.updateDocument(event.document.uri, event.document.getText());
  connection.sendDiagnostics({ uri: event.document.uri, diagnostics });
});

documents.onDidClose((event: TextDocumentChangeEvent<TextDocument>) => {
  zenServer.closeDocument(event.document.uri);
  connection.sendDiagnostics({ uri: event.document.uri, diagnostics: [] });
});

connection.onCompletion((params: CompletionParams) => {
  return zenServer.getCompletions(params.textDocument.uri, params.position) as CompletionItem[];
});

connection.onHover((params: HoverParams) => {
  return zenServer.getHover(params.textDocument.uri, params.position) as Hover | null;
});

connection.onDefinition((params: DefinitionParams) => {
  return zenServer.getDefinition(params.textDocument.uri, params.position) as Location | null;
});

connection.onDocumentSymbol((params: DocumentSymbolParams) => {
  return zenServer.getDocumentSymbols(params.textDocument.uri) as DocumentSymbol[];
});

connection.languages.semanticTokens.on((params: SemanticTokensParams): SemanticTokens => {
  return zenServer.getSemanticTokens(params.textDocument.uri);
});

documents.listen(connection);
connection.listen();
