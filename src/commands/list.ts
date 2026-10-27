import * as vscode from 'vscode';
import { getAllSnippets } from '../storage';

export async function listSnippets(): Promise<void> {
  const snippets = getAllSnippets();
  if (snippets.length === 0) {
    vscode.window.showInformationMessage('Нет шаблонов');
    return;
  }

  const languages = [...new Set(snippets.map(s => s.language).filter(Boolean))];

  const items: vscode.QuickPickItem[] = [
    { label: '$(list-unordered) Все шаблоны', description: `${snippets.length}` },
    ...languages.map(l => ({
      label: `$(symbol-method) Язык: ${l}`,
      description: `фильтр`
    })),
    { label: '$(star) Избранное (топ-5 по использованию)', description: '' }
  ];

  const picked = await vscode.window.showQuickPick(items, {
    placeHolder: 'Выберите фильтр или шаблон',
    matchOnDescription: true
  });
  if (!picked) {return;}

  let filtered = snippets;
  if (picked.label.startsWith('$(symbol-method)')) {
    const lang = picked.label.replace('$(symbol-method) Язык: ', '');
    filtered = snippets.filter(s => s.language === lang);
  } else if (picked.label.startsWith('$(star)')) {
    filtered = [...snippets]
      .sort((a, b) => (b.usageCount ?? 0) - (a.usageCount ?? 0))
      .slice(0, 5);
  } else if (picked.label.startsWith('$(list-unordered)')) {
    filtered = snippets;
  } else {
    // выбрали конкретный шаблон — показать его содержимое
    const s = snippets.find(x => x.name === picked.label);
    if (s) {
      const doc = await vscode.workspace.openTextDocument({
        content: s.body,
        language: s.language || 'plaintext'
      });
      await vscode.window.showTextDocument(doc, { preview: true });
    }
    return;
  }

  // показать отфильтрованный список
  const sub = await vscode.window.showQuickPick(
    filtered.map(s => ({
      label: s.name,
      description: [s.language, `${s.usageCount ?? 0}×`, s.description].filter(Boolean).join(' · '),
      detail: s.body.substring(0, 80)
    })),
    { placeHolder: `Найдено: ${filtered.length}`, matchOnDescription: true, matchOnDetail: true }
  );

  if (sub) {
    const s = snippets.find(x => x.name === sub.label);
    if (s) {
      const doc = await vscode.workspace.openTextDocument({
        content: s.body,
        language: s.language || 'plaintext'
      });
      await vscode.window.showTextDocument(doc, { preview: true });
    }
  }
}