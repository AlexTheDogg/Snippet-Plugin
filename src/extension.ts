import * as vscode from 'vscode';
import { createSnippet } from './commands/create';
import { insertSnippet } from './commands/insert';
import { deleteSnippet } from './commands/delete';
import { saveSnippet } from './commands/save';

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand('smartSnippet.create', createSnippet)
  );
  context.subscriptions.push(
    vscode.commands.registerCommand('smartSnippet.insert', insertSnippet)
  );
  context.subscriptions.push(
    vscode.commands.registerCommand('smartSnippet.delete', deleteSnippet)
  );
  context.subscriptions.push(
    vscode.commands.registerCommand('smartSnippet.save', saveSnippet)
  );
}

export function deactivate() {}