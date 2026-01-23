import {
  createConnection,
  type DidChangeTextDocumentParams,
  type DidCloseTextDocumentParams,
  type DidOpenTextDocumentParams,
  ProposedFeatures,
  TextDocumentSyncKind,
  type TextDocumentContentChangeEvent,
  type WorkspaceFolder
} from "vscode-languageserver/node.js";
import { TextDocument } from "vscode-languageserver-textdocument";
import { collectDiagnostics } from "./diagnostics.js";
import { uriToPath } from "@mdzlang/lsp-core";

const connection = createConnection(ProposedFeatures.all);
const documents = new Map<string, TextDocument>();

connection.onInitialize(() => {
  return {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental
    }
  };
});

const validateTextDocument = async (document: TextDocument): Promise<void> => {
  const workspaceFolders = await connection.workspace.getWorkspaceFolders();
  const workspacePaths =
    workspaceFolders
      ?.map((folder: WorkspaceFolder) => uriToPath(folder.uri))
      .filter((path): path is string => Boolean(path)) ?? [];
  const diagnostics = await collectDiagnostics({
    text: document.getText(),
    uri: document.uri,
    workspacePaths
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
});

connection.onDidCloseTextDocument(({ textDocument }: DidCloseTextDocumentParams) => {
  documents.delete(textDocument.uri);
  connection.sendDiagnostics({ uri: textDocument.uri, diagnostics: [] });
});

connection.listen();
