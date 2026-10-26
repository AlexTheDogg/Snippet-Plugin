import * as vscode from 'vscode';
import { getAllSnippets, saveSnippets } from '../storage';

export async function insertSnippet(): Promise<void> {
  const snippets = getAllSnippets();

  if (snippets.length === 0) {
    const action = await vscode.window.showInformationMessage(
      'Нет шаблонов. Создать первый?', 'Создать'
    );
    if (action === 'Создать') {
      vscode.commands.executeCommand('smartSnippet.create');
    }
    return;
  }

  const items = snippets.map(s => ({
    label: s.name,
    description: [s.language, s.description].filter(Boolean).join(' · '),
    detail: s.body[0] + (s.body.length > 1 ? '…' : '')
  }));

  const selected = await vscode.window.showQuickPick(items, {
    placeHolder: 'Выберите шаблон',
    matchOnDescription: true,
    matchOnDetail: true
  });
  if (!selected) {return;}

  const snippet = snippets.find(s => s.name === selected.label);
  if (!snippet) {return;}

  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showWarningMessage('Нет активного редактора');
    return;
  }

  await editor.insertSnippet(new vscode.SnippetString(snippet.body.join('\n')));

  const updated = getAllSnippets();
  const idx = updated.findIndex(s => s.name === snippet.name);
  if (idx >= 0) {
    updated[idx].usageCount = (updated[idx].usageCount ?? 0) + 1;
    updated[idx].lastUsed = Date.now();
    await saveSnippets(updated);
  }
}
