import { stat } from "node:fs/promises";
import * as path from "node:path";
import * as vscode from "vscode";
import { LanguageClient, TransportKind } from "vscode-languageclient/node";

const CONFIG_FILE = "mdz.config.json";

let client: LanguageClient | undefined;

const findConfigFile = async (): Promise<string | null> => {
  const matches = await vscode.workspace.findFiles(
    `**/${CONFIG_FILE}`,
    "**/node_modules/**",
    1
  );
  return matches[0]?.fsPath ?? null;
};

const resolveServerModule = (extensionPath: string): string =>
  path.resolve(extensionPath, "dist/server.js");

const createServerOptions = (serverModule: string) => {
  const args = [serverModule];
  return {
    run: {
      command: process.execPath,
      args,
      transport: TransportKind.stdio
    },
    debug: {
      command: process.execPath,
      args,
      transport: TransportKind.stdio
    }
  };
};

const createClientOptions = (outputChannel: vscode.OutputChannel) => ({
  documentSelector: [{ language: "mdz", scheme: "file" }],
  outputChannel
});

const ensureServerModule = async (
  serverModule: string,
  outputChannel: vscode.OutputChannel
): Promise<boolean> => {
  try {
    await stat(serverModule);
    return true;
  } catch (error) {
    outputChannel.appendLine(
      `mdz: LSP server not found at ${serverModule}. Run "pnpm build" in the repo.`
    );
    return false;
  }
};

const shouldStartServer = async (outputChannel: vscode.OutputChannel): Promise<boolean> => {
  const configPath = await findConfigFile();
  if (!configPath) {
    outputChannel.appendLine(`mdz: ${CONFIG_FILE} not found; LSP not started.`);
    return false;
  }
  return true;
};

const startClient = async (
  context: vscode.ExtensionContext,
  outputChannel: vscode.OutputChannel
): Promise<void> => {
  if (!(await shouldStartServer(outputChannel))) return;

  const serverModule = resolveServerModule(context.extensionPath);
  if (!(await ensureServerModule(serverModule, outputChannel))) return;

  const serverOptions = createServerOptions(serverModule);
  const clientOptions = createClientOptions(outputChannel);

  client = new LanguageClient("mdz", "mdz LSP", serverOptions, clientOptions);
  await client.start();
};

export const activate = async (context: vscode.ExtensionContext): Promise<void> => {
  const outputChannel = vscode.window.createOutputChannel("mdz");
  context.subscriptions.push(outputChannel);
  await startClient(context, outputChannel);
};

export const deactivate = async (): Promise<void> => {
  if (client) {
    await client.stop();
    client = undefined;
  }
};
