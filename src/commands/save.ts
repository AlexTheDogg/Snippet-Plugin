import * as vscode from 'vscode';
import { getAllSnippets, findSnippet, saveSnippets } from '../storage';
import { pendingTemplates } from '../templateEditor';
import { Snippet } from '../types';

export async function saveSnippet(): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) { /* ... */ return; }

  const uriKey = editor.document.uri.toString();
  const template = pendingTemplates.get(uriKey);
  if (!template) { /* ... */ return; }

  const body = editor.document.getText().split('\n');
  if (body.join('').trim() === '') { /* ... */ return; }

  // ✅ Собираем итоговый массив как в saveTemplate
  const snippets = getAllSnippets();

  const statsSource = template.originalName
    ? findSnippet(template.originalName)
    : findSnippet(template.name);
  const usageCount = statsSource?.usageCount ?? 0;
  const lastUsed = statsSource?.lastUsed;

  const renamed =
    template.originalName !== undefined &&
    template.originalName !== template.name;

  if (renamed) {
    const oldIdx = snippets.findIndex(s => s.name === template.originalName);
    if (oldIdx >= 0) snippets.splice(oldIdx, 1);
  }

  const newSnippet: Snippet = {
    name: template.name,
    description: template.description,
    language: template.language.length ? template.language : undefined,
    prefix: template.prefix.length ? template.prefix : undefined,
    body,
    usageCount,
    lastUsed,
    favorite: template.favorite,
    categories: template.categories.length ? template.categories : undefined
  };

  const idx = snippets.findIndex(s => s.name === template.name);
  if (idx >= 0) snippets[idx] = newSnippet;
  else snippets.push(newSnippet);

  await saveSnippets(snippets);

  // Чистим
  pendingTemplates.delete(uriKey);
  try { await vscode.workspace.fs.delete(editor.document.uri, { useTrash: false }); } catch {}
  await vscode.commands.executeCommand('workbench.action.closeActiveEditor');

  vscode.window.showInformationMessage(
    renamed
      ? `Шаблон "${template.originalName}" переименован в "${template.name}"`
      : `Шаблон "${template.name}" сохранён`
  );
}