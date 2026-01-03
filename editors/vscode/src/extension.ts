import * as vscode from 'vscode';
import * as path from 'path';

let client: any; // Would be LanguageClient in full impl

export function activate(context: vscode.ExtensionContext) {
  console.log('Zen language extension is now active');

  // Register compile command
  const compileCommand = vscode.commands.registerCommand('zen.compile', async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage('No active editor');
      return;
    }

    const document = editor.document;
    if (!document.fileName.endsWith('.zen.md')) {
      vscode.window.showErrorMessage('Not a .zen.md file');
      return;
    }

    vscode.window.showInformationMessage(`Compiling ${path.basename(document.fileName)}...`);
    
    // TODO: Call actual compiler via child_process or LSP
    vscode.window.showInformationMessage('Compilation complete');
  });

  // Register check command
  const checkCommand = vscode.commands.registerCommand('zen.check', async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage('No active editor');
      return;
    }

    const document = editor.document;
    if (!document.fileName.endsWith('.zen.md')) {
      vscode.window.showErrorMessage('Not a .zen.md file');
      return;
    }

    vscode.window.showInformationMessage(`Checking ${path.basename(document.fileName)}...`);
    
    // TODO: Call actual parser via child_process or LSP
    vscode.window.showInformationMessage('Syntax check passed');
  });

  context.subscriptions.push(compileCommand, checkCommand);
}

export function deactivate(): any | undefined {
  if (!client) {
    return undefined;
  }
  return undefined;
}
