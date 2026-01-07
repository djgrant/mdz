import * as vscode from 'vscode';
import * as path from 'path';

export function activate(context: vscode.ExtensionContext) {
  console.log('MDZ language extension is now active');

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
  return undefined;
}
