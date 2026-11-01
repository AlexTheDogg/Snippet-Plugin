import * as vscode from 'vscode';
import { createSnippet } from './commands/create';
import { saveSnippet } from './commands/save';
import { insertSnippet } from './commands/insert';
import { deleteSnippet } from './commands/delete';
import { openSnippet } from './commands/list';
import { showStats } from './commands/stats';
import { exportSnippets } from './commands/export';
import { importSnippets } from './commands/import';
import { registerSnippetProviders, disposeSnippetProviders } from './snippetProvider';
import { getAllSnippets, saveSnippets } from './storage';

async function trackInsertion(name: string): Promise<void> {
  const snippets = getAllSnippets();
  const idx = snippets.findIndex(s => s.name === name);
  if (idx < 0) return;

  snippets[idx].usageCount = (snippets[idx].usageCount ?? 0) + 1;
  snippets[idx].lastUsed = Date.now();

  await saveSnippets(snippets);
}

export function activate(context: vscode.ExtensionContext) {
  // 1. Регистрация команд
  context.subscriptions.push(
    vscode.commands.registerCommand('smartSnippet.create',  () => createSnippet(context)),
    vscode.commands.registerCommand('smartSnippet.save', saveSnippet),
    vscode.commands.registerCommand('smartSnippet.insert', insertSnippet),
    vscode.commands.registerCommand('smartSnippet.delete', deleteSnippet),
    vscode.commands.registerCommand('smartSnippet.list', () => openSnippet(context)),
    vscode.commands.registerCommand('smartSnippet.stats', () => showStats(context)),
    vscode.commands.registerCommand('smartSnippet.export', exportSnippets),
    vscode.commands.registerCommand('smartSnippet.import', importSnippets),
    vscode.commands.registerCommand('smartSnippet.trackInsertion', trackInsertion)
  );

  // 2. Первичная регистрация провайдеров
  void registerSnippetProviders(context);

  // 3. Перерегистрация при изменении настроек — ключевой момент
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('smartSnippet.snippets')) {
        void registerSnippetProviders(context);
      }
    })
  );

  // 4. Отписка при деактивации
  context.subscriptions.push({
    dispose: () => disposeSnippetProviders()
  });
}

export function deactivate() {
  disposeSnippetProviders();
}