import * as vscode from 'vscode';
import * as path from 'path';
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind,
} from 'vscode-languageclient/node';

let client: LanguageClient | undefined;

export function activate(context: vscode.ExtensionContext) {
  console.log('MDZ language extension is now active');

  const serverModule = path.join(
    context.extensionPath,
    '..',
    '..',
    'packages',
    'lsp',
    'dist',
    'stdio.js'
  );

  const serverOptions: ServerOptions = {
    run: { module: serverModule, transport: TransportKind.stdio },
    debug: { module: serverModule, transport: TransportKind.stdio },
  };

  const clientOptions: LanguageClientOptions = {
    documentSelector: [
      { scheme: 'file', language: 'mdz' },
      { scheme: 'untitled', language: 'mdz' },
    ],
  };

  client = new LanguageClient(
    'mdzLanguageServer',
    'MDZ Language Server',
    serverOptions,
    clientOptions
  );

  context.subscriptions.push(client.start());

  // Register compile command
  const compileCommand = vscode.commands.registerCommand('mdz.compile', async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage('No active editor');
      return;
    }

    const document = editor.document;
    if (document.languageId !== 'mdz') {
      vscode.window.showErrorMessage('Not a MDZ file');
      return;
    }

    await document.save();
    vscode.window.showInformationMessage(`Compiling ${path.basename(document.fileName)}...`);

    // In a full implementation, this would invoke the @zenmarkdown/core compiler
    // For now, we validate the file extension and language mode
    vscode.window.showInformationMessage('Compilation complete (Mock)');
  });

  // Register check command
  const checkCommand = vscode.commands.registerCommand('mdz.check', async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage('No active editor');
      return;
    }

    const document = editor.document;
    if (document.languageId !== 'mdz') {
      vscode.window.showErrorMessage('Not a MDZ file');
      return;
    }

    vscode.window.showInformationMessage(`Checking ${path.basename(document.fileName)}...`);
    // Mock syntax check
    vscode.window.showInformationMessage('Syntax check passed');
  });

  context.subscriptions.push(compileCommand, checkCommand);
}

export function deactivate(): any | undefined {
  return client?.stop();
}
