import { describe, it, expect } from "vitest";
import { PassThrough } from "node:stream";
import { mkdtemp, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
import {
  createConnection,
  ProposedFeatures,
  type WorkspaceFolder
} from "vscode-languageserver/node.js";
import {
  createMessageConnection,
  StreamMessageReader,
  StreamMessageWriter
} from "vscode-jsonrpc/node";
import { registerHandlers } from "./server.js";

const createWorkspace = async (): Promise<{ path: string; folder: WorkspaceFolder }> => {
  const path = await mkdtemp(join(tmpdir(), "mdz-lsp-"));
  const folder = {
    name: "mdz-workspace",
    uri: pathToFileURL(path).toString()
  };
  return { path, folder };
};

const waitForDiagnostics = async (
  client: ReturnType<typeof createMessageConnection>,
  uri: string
): Promise<unknown> => {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("Timed out waiting for diagnostics."));
    }, 1500);

    client.onNotification("textDocument/publishDiagnostics", (params) => {
      if (params?.uri !== uri) return;
      clearTimeout(timeout);
      resolve(params);
    });
  });
};

describe("LSP integration", () => {
  it("publishes diagnostics over JSON-RPC", async () => {
    const { path: workspacePath, folder } = await createWorkspace();
    await writeFile(join(workspacePath, "mdz.config.json"), JSON.stringify({ root: "." }));

    const serverIn = new PassThrough();
    const serverOut = new PassThrough();
    const serverConnection = createConnection(
      ProposedFeatures.all,
      new StreamMessageReader(serverIn),
      new StreamMessageWriter(serverOut)
    );
    registerHandlers(serverConnection);
    serverConnection.listen();

    const clientConnection = createMessageConnection(
      new StreamMessageReader(serverOut),
      new StreamMessageWriter(serverIn)
    );
    clientConnection.onRequest("workspace/workspaceFolders", () => [folder]);
    clientConnection.listen();

    await clientConnection.sendRequest("initialize", {
      processId: null,
      rootUri: folder.uri,
      capabilities: {
        workspace: { workspaceFolders: true }
      },
      workspaceFolders: [folder]
    });

    const docUri = pathToFileURL(join(workspacePath, "doc.mdz")).toString();
    const diagnosticsPromise = waitForDiagnostics(clientConnection, docUri);

    clientConnection.sendNotification("textDocument/didOpen", {
      textDocument: {
        uri: docUri,
        languageId: "mdz",
        version: 1,
        text: "USE ~/missing/path\nSPAWN ~/agent/reporter WITH #missing\n"
      }
    });

    const diagnosticsParams = await diagnosticsPromise;
    const codes = (diagnosticsParams as { diagnostics: { code?: unknown }[] }).diagnostics.map(
      (diag) => String(diag.code)
    );
    expect(codes).toContain("MDZL0001_MISSING_PATH");
    expect(codes).toContain("MDZL0002_MISSING_ANCHOR");

    clientConnection.dispose();
    serverConnection.dispose();
  });

  it("reports missing config over JSON-RPC", async () => {
    const { path: workspacePath, folder } = await createWorkspace();

    const serverIn = new PassThrough();
    const serverOut = new PassThrough();
    const serverConnection = createConnection(
      ProposedFeatures.all,
      new StreamMessageReader(serverIn),
      new StreamMessageWriter(serverOut)
    );
    registerHandlers(serverConnection);
    serverConnection.listen();

    const clientConnection = createMessageConnection(
      new StreamMessageReader(serverOut),
      new StreamMessageWriter(serverIn)
    );
    clientConnection.onRequest("workspace/workspaceFolders", () => [folder]);
    clientConnection.listen();

    await clientConnection.sendRequest("initialize", {
      processId: null,
      rootUri: folder.uri,
      capabilities: {
        workspace: { workspaceFolders: true }
      },
      workspaceFolders: [folder]
    });

    const docUri = pathToFileURL(join(workspacePath, "doc.mdz")).toString();
    const diagnosticsPromise = waitForDiagnostics(clientConnection, docUri);

    clientConnection.sendNotification("textDocument/didOpen", {
      textDocument: {
        uri: docUri,
        languageId: "mdz",
        version: 1,
        text: "RETURN ok\n"
      }
    });

    const diagnosticsParams = await diagnosticsPromise;
    const codes = (diagnosticsParams as { diagnostics: { code?: unknown }[] }).diagnostics.map(
      (diag) => String(diag.code)
    );
    expect(codes).toContain("MDZC0001_MISSING_CONFIG");

    clientConnection.dispose();
    serverConnection.dispose();
  });

  it("supports custom workspace roots for multi-root tests", async () => {
    const workspaceA = await createWorkspace();
    const workspaceB = await createWorkspace();
    await writeFile(join(workspaceB.path, "mdz.config.json"), JSON.stringify({ root: "." }));

    const serverIn = new PassThrough();
    const serverOut = new PassThrough();
    const serverConnection = createConnection(
      ProposedFeatures.all,
      new StreamMessageReader(serverIn),
      new StreamMessageWriter(serverOut)
    );
    registerHandlers(serverConnection, {
      getWorkspacePaths: async () => [workspaceA.path, workspaceB.path]
    });
    serverConnection.listen();

    const clientConnection = createMessageConnection(
      new StreamMessageReader(serverOut),
      new StreamMessageWriter(serverIn)
    );
    clientConnection.listen();

    await clientConnection.sendRequest("initialize", {
      processId: null,
      rootUri: workspaceB.folder.uri,
      capabilities: {}
    });

    const docUri = pathToFileURL(join(workspaceB.path, "doc.mdz")).toString();
    const diagnosticsPromise = waitForDiagnostics(clientConnection, docUri);

    clientConnection.sendNotification("textDocument/didOpen", {
      textDocument: {
        uri: docUri,
        languageId: "mdz",
        version: 1,
        text: "RETURN ok\n"
      }
    });

    const diagnosticsParams = await diagnosticsPromise;
    const codes = (diagnosticsParams as { diagnostics: { code?: unknown }[] }).diagnostics.map(
      (diag) => String(diag.code)
    );
    expect(codes).not.toContain("MDZC0001_MISSING_CONFIG");

    clientConnection.dispose();
    serverConnection.dispose();
  });
});
