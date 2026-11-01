import * as vscode from 'vscode';
import { getAllSnippets } from '../storage';
import { openTemplateEditor, PendingTemplate } from '../templateEditor';
import { Snippet } from '../types'

export async function openSnippet(context: vscode.ExtensionContext): Promise<void> {
  const snippets = getAllSnippets();
  if (snippets.length === 0) {
    vscode.window.showInformationMessage('Нет шаблонов');
    return;
  }

  const filtered = await filterSnippets(snippets);
  if (!filtered || filtered.length === 0) return;

  const sub = await vscode.window.showQuickPick(
    filtered.map(s => ({
      label: s.name,
      description: [s.language?.join(', '), s.description].filter(Boolean).join(' · '),
      detail: s.body.join('\n').substring(0, 80)
    })),
    { placeHolder: `Найдено: ${filtered.length}` }
  );
  if (!sub) return;

  const snippet = filtered.find(x => x.name === sub.label);
  if (!snippet) return;

  const template: PendingTemplate = {
    name: snippet.name,
    originalName: snippet.name,
    description: snippet.description,
    language: snippet.language ?? [],
    prefix: snippet.prefix ?? [],
    favorite: snippet.favorite,
    categories: snippet.categories ?? [],
    body: snippet.body
  };

  await openTemplateEditor(context, template);
}

export async function filterSnippets(snippets: Snippet[]): Promise<Snippet[] | undefined> {
  const languages = [...new Set(snippets.flatMap(s => s.language ?? []))];
  const categories = [...new Set(snippets.flatMap(s => s.categories ?? []))];

  const items: vscode.QuickPickItem[] = [
    { label: '$(list-unordered) Все шаблоны', description: `${snippets.length}` },
    ...languages.map(l => ({
      label: `$(symbol-method) Язык: ${l}`,
    })),
    { label: '$(star-empty) Популярное (топ-5 по использованию)', description: '' },
    { label: '$(star-full) Избранное (все)', description: '' },
    ...categories.map(l => ({
      label: `$(folder) ${l}`,
    }))
  ];

  const picked = await vscode.window.showQuickPick(items, {
    placeHolder: 'Выберите фильтр',
    matchOnDescription: true
  });
  if (!picked) {return;}

  let filtered = snippets;
  if (picked.label.startsWith('$(symbol-method)')) {
    const lang = picked.label.replace('$(symbol-method) Язык: ', '');
    filtered = snippets.filter(s => s.language?.includes(lang));
  } else if (picked.label.startsWith('$(star-empty)')) {
    filtered = [...snippets]
      .sort((a, b) => (b.usageCount ?? 0) - (a.usageCount ?? 0))
      .slice(0, 5);
  } else if (picked.label.startsWith('$(star-full)')) {
    filtered = snippets.filter(s => s.favorite === true);
  } else if (picked.label.startsWith('$(list-unordered)')) {
    filtered = snippets;
  } else {
    const category = picked.label.replace('$(folder) ', '');
    filtered = snippets.filter(s => s.categories?.includes(category));
  }
  return filtered;
}
