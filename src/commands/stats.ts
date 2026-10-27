import * as vscode from 'vscode';
import { getAllSnippets } from '../storage';
import { openTextRedactor } from './create';

export async function showStats(): Promise<void> {
  const snippets = getAllSnippets();
  if (snippets.length === 0) {
    vscode.window.showInformationMessage('Нет шаблонов');
    return;
  }

  const sorted = [...snippets].sort(
    (a, b) => (b.usageCount ?? 0) - (a.usageCount ?? 0)
  );

  const total = snippets.reduce((sum, s) => sum + (s.usageCount ?? 0), 0);

  const items = sorted.map((s, i) => ({
    label: `${i + 1}. ${s.name}`,
    description: `${s.usageCount ?? 0}× использования`,
    detail: s.lastUsed
      ? `Последний раз: ${new Date(s.lastUsed).toLocaleString('ru')}`
      : 'Ещё не использовался'
  }));

  const picked = await vscode.window.showQuickPick(items, {
    placeHolder: `Всего вставок: ${total} · Шаблонов: ${snippets.length}`
  });
  if (!picked) {return;}

  const s = snippets.find(x => x.name === picked.label.slice(3));
      if (s) {
        await openTextRedactor(s.name, s.description, s.language, s.prefix, s.body, s.favorite, s.categories);
      }
      return;
}