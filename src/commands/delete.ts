import * as vscode from 'vscode';
import { getAllSnippets, removeSnippet } from '../storage';

// Удаление сниппета по имени
export async function deleteSnippet(): Promise<void> {
  const snippets = getAllSnippets();
  if (snippets.length === 0) {
    vscode.window.showInformationMessage('Нет шаблонов');
    return;
  }
  
  const selected = await vscode.window.showQuickPick(
    snippets.map(s => s.name),
    { canPickMany: true, 
      placeHolder: 'Выберите шаблоны для удаления' }
  );
  if (!selected) {return;}

  const c = await vscode.window.showWarningMessage(
    `Удалить ${selected.length} шаблон(а/ов)?`,
    { modal: true }, 'Удалить'
  );
  if (c !== 'Удалить') {return;}
  
  // Удаляем выбранные шаблоны
  for (const name of selected) {
    await removeSnippet(name);
  }
  vscode.window.showInformationMessage(`Шаблон(ы) "${selected.join('", "')}" удалён(ы)`);
}