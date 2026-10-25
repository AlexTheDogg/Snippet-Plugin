import * as vscode from 'vscode';
import { getAllSnippets, removeSnippet } from '../storage';

export async function deleteSnippet(): Promise<void> {
  const snippets = getAllSnippets();
  if (snippets.length === 0) {
    vscode.window.showInformationMessage('Нет шаблонов');
    return;
  }

  const selected = await vscode.window.showQuickPick(
    snippets.map(s => s.name),
    { placeHolder: 'Какой шаблон удалить?' }
  );
  if (!selected) {return;}

  const c = await vscode.window.showWarningMessage(
    `Удалить "${selected}"?`,
    { modal: true }, 'Удалить'
  );
  if (c !== 'Удалить') {return;}

  await removeSnippet(selected);
  vscode.window.showInformationMessage(`Шаблон "${selected}" удалён`);
}