import {
  TextDocumentSyncKind,
  type Connection,
  type DidChangeTextDocumentParams,
  type DidCloseTextDocumentParams,
  type DidOpenTextDocumentParams,
  type TextDocumentContentChangeEvent,
  type WorkspaceFolder
} from "vscode-languageserver/node.js";
import { TextDocument } from "vscode-languageserver-textdocument";
import { uriToPath } from "@mdzlang/lsp-core";
import { collectDiagnostics } from "./diagnostics.js";

type RegisterOptions = {
  getWorkspacePaths?: () => Promise<string[]>;
};

export const registerHandlers = (
  connection: Connection,
  options: RegisterOptions = {}
): void => {
  const documents = new Map<string, TextDocument>();

  connection.onInitialize(() => {
    return {
      capabilities: {
        textDocumentSync: TextDocumentSyncKind.Incremental
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
    connection.sendDiagnostics({ uri: textDocument.uri, diagnostics: [] });
  });
};
