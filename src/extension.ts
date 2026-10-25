import * as vscode from 'vscode';
import { createSnippet } from './commands/create';

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand('smartSnippet.create', createSnippet)
  );
}