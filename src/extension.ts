import * as vscode from 'vscode';
import { createSnippet } from './commands/create';
import { insertSnippet } from './commands/insert';

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand('smartSnippet.create', createSnippet)
  );
  context.subscriptions.push(
    vscode.commands.registerCommand('smartSnippet.insert', insertSnippet)
  );
}