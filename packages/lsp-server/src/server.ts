import {
  TextDocumentSyncKind,
  SymbolKind as LspSymbolKind,
  CompletionItemKind as LspCompletionItemKind,
  type Connection,
  type DidChangeTextDocumentParams,
  type DidCloseTextDocumentParams,
  type DidOpenTextDocumentParams,
  type TextDocumentContentChangeEvent,
  type WorkspaceFolder,
  type DocumentSymbol as LspDocumentSymbol,
  type CompletionItem as LspCompletionItem,
  type Hover,
  type Location
} from "vscode-languageserver/node.js";
import { TextDocument } from "vscode-languageserver-textdocument";
import {
  uriToPath,
  DocumentRegistry,
  extractDocumentSymbols,
  getCompletions,
  getHover,
  getDefinition,
  buildTypeEnvironment,
  findWorkspaceRoot,
  loadConfig,
  extractSemanticTokens,
  encodeSemanticTokens,
  TOKEN_TYPES,
  TOKEN_MODIFIERS,
  type DocumentSymbol,
  type SymbolKind,
  type CompletionItem
} from "@mdzlang/lsp-core";
import { collectDiagnostics } from "./diagnostics.js";

type RegisterOptions = {
  getWorkspacePaths?: () => Promise<string[]>;
};

export const registerHandlers = (
  connection: Connection,
  options: RegisterOptions = {}
): { registry: DocumentRegistry } => {
  const documents = new Map<string, TextDocument>();
  const registry = new DocumentRegistry();

  let workspaceFolderPaths: string[] = [];

  connection.onInitialize(async (params) => {
    workspaceFolderPaths =
      params.workspaceFolders
        ?.map((folder) => uriToPath(folder.uri))
        .filter((path): path is string => Boolean(path)) ?? [];

    return {
      capabilities: {
        textDocumentSync: TextDocumentSyncKind.Incremental,
        documentSymbolProvider: true,
        completionProvider: {
          triggerCharacters: ["$", "#", "~", ":", "/"]
        },
        hoverProvider: true,
        definitionProvider: true,
        semanticTokensProvider: {
          legend: {
            tokenTypes: TOKEN_TYPES,
            tokenModifiers: TOKEN_MODIFIERS
          },
          full: true
        }
      }
    };
  });

  const validateTextDocument = async (document: TextDocument): Promise<void> => {
    const workspacePaths =
      options.getWorkspacePaths?.() ??
      Promise.resolve(
        connection.workspace
          .getWorkspaceFolders()
          .then((folders) =>
            folders
              ?.map((folder: WorkspaceFolder) => uriToPath(folder.uri))
              .filter((path): path is string => Boolean(path)) ?? []
          )
      );
    const resolvedWorkspacePaths = await workspacePaths;

    await registry.updateDocument(document.uri, document.getText(), document.version);

    const diagnostics = await collectDiagnostics({
      text: document.getText(),
      uri: document.uri,
      workspacePaths: resolvedWorkspacePaths
    });
    connection.sendDiagnostics({ uri: document.uri, diagnostics });
  };

  connection.onDidOpenTextDocument(({ textDocument }: DidOpenTextDocumentParams) => {
    const document = TextDocument.create(
      textDocument.uri,
      textDocument.languageId,
      textDocument.version,
      textDocument.text
    );
    documents.set(textDocument.uri, document);
    void validateTextDocument(document);
  });

  connection.onDidChangeTextDocument(
    ({ textDocument, contentChanges }: DidChangeTextDocumentParams) => {
      const document = documents.get(textDocument.uri);
      if (!document) return;
      const updated = TextDocument.update(
        document,
        contentChanges as TextDocumentContentChangeEvent[],
        textDocument.version
      );
      documents.set(textDocument.uri, updated);
      void validateTextDocument(updated);
    }
  );

  connection.onDidCloseTextDocument(({ textDocument }: DidCloseTextDocumentParams) => {
    documents.delete(textDocument.uri);
    registry.removeDocument(textDocument.uri);
    connection.sendDiagnostics({ uri: textDocument.uri, diagnostics: [] });
  });

  const symbolKindMap: Record<SymbolKind, LspSymbolKind> = {
    variable: LspSymbolKind.Variable,
    type: LspSymbolKind.TypeParameter,
    block: LspSymbolKind.Function,
    section: LspSymbolKind.String,
    parameter: LspSymbolKind.Property
  };

  const completionKindMap: Record<string, LspCompletionItemKind> = {
    keyword: LspCompletionItemKind.Keyword,
    variable: LspCompletionItemKind.Variable,
    type: LspCompletionItemKind.TypeParameter,
    path: LspCompletionItemKind.File,
    anchor: LspCompletionItemKind.Reference,
    snippet: LspCompletionItemKind.Snippet
  };

  const convertSymbol = (symbol: DocumentSymbol): LspDocumentSymbol => ({
    name: symbol.name,
    kind: symbolKindMap[symbol.kind] ?? LspSymbolKind.Variable,
    detail: symbol.detail,
    range: {
      start: { line: symbol.range.start.line - 1, character: symbol.range.start.column - 1 },
      end: { line: symbol.range.end.line - 1, character: symbol.range.end.column - 1 }
    },
    selectionRange: {
      start: { line: symbol.selectionRange.start.line - 1, character: symbol.selectionRange.start.column - 1 },
      end: { line: symbol.selectionRange.end.line - 1, character: symbol.selectionRange.end.column - 1 }
    },
    children: symbol.children?.map(convertSymbol)
  });

  connection.onDocumentSymbol(async (params) => {
    const entry = registry.getDocument(params.textDocument.uri);
    if (!entry || !entry.parseResult.ok) return [];

    const symbols = extractDocumentSymbols(entry.text, entry.parseResult.ast);
    return symbols.map(convertSymbol);
  });

  const convertCompletion = (item: CompletionItem): LspCompletionItem => ({
    label: item.label,
    kind: completionKindMap[item.kind] ?? LspCompletionItemKind.Text,
    detail: item.detail,
    insertText: item.insertText,
    documentation: item.documentation
  });

  connection.onCompletion(async (params) => {
    const entry = registry.getDocument(params.textDocument.uri);
    if (!entry) return [];

    const typeEnv = entry.parseResult.ok
      ? buildTypeEnvironment(entry.parseResult.ast, entry.frontmatterAnalysis)
      : undefined;

    const completions = getCompletions({
      text: entry.text,
      line: params.position.line + 1,
      column: params.position.character + 1,
      typeEnv
    });

    return completions.map(convertCompletion);
  });

  connection.onHover(async (params): Promise<Hover | null> => {
    const entry = registry.getDocument(params.textDocument.uri);
    if (!entry) return null;

    const typeEnv = entry.parseResult.ok
      ? buildTypeEnvironment(entry.parseResult.ast, entry.frontmatterAnalysis)
      : undefined;

    const result = getHover({
      text: entry.text,
      line: params.position.line + 1,
      column: params.position.character + 1,
      typeEnv
    });

    if (!result) return null;

    return {
      contents: { kind: "markdown", value: result.content },
      range: result.range
        ? {
            start: { line: result.range.start.line - 1, character: result.range.start.column - 1 },
            end: { line: result.range.end.line - 1, character: result.range.end.column - 1 }
          }
        : undefined
    };
  });

  connection.onDefinition(async (params): Promise<Location | null> => {
    const entry = registry.getDocument(params.textDocument.uri);
    if (!entry) return null;

    const docPath = uriToPath(params.textDocument.uri);
    let rootPath: string | undefined;

    if (docPath && workspaceFolderPaths.length > 0) {
      const workspaceRoot = findWorkspaceRoot(docPath, workspaceFolderPaths);
      if (workspaceRoot) {
        const configResult = await loadConfig(workspaceRoot);
        if (configResult.ok) {
          rootPath = configResult.rootPath;
        }
      }
    }

    const typeEnv = entry.parseResult.ok
      ? buildTypeEnvironment(entry.parseResult.ast, entry.frontmatterAnalysis)
      : undefined;

    const result = getDefinition({
      text: entry.text,
      uri: params.textDocument.uri,
      line: params.position.line + 1,
      column: params.position.character + 1,
      typeEnv,
      rootPath
    });

    if (!result) return null;

    return {
      uri: result.uri,
      range: {
        start: { line: result.range.start.line - 1, character: result.range.start.column - 1 },
        end: { line: result.range.end.line - 1, character: result.range.end.column - 1 }
      }
    };
  });

  connection.languages.semanticTokens.on(async (params) => {
    const entry = registry.getDocument(params.textDocument.uri);
    if (!entry) return { data: [] };

    const tokens = extractSemanticTokens(entry.text);
    const data = encodeSemanticTokens(tokens);

    return { data };
  });

  return { registry };
};
