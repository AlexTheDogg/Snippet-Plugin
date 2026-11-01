import * as vscode from 'vscode';
import { Snippet } from './types';

// Получение всех сниппетов из настроек расширения
export function getAllSnippets(): Snippet[] {
  return vscode.workspace
    .getConfiguration('smartSnippet')
    .get<Snippet[]>('snippets', []);
}

// Сохранение всех сниппетов в настройки расширения
export async function saveSnippets(snippets: Snippet[]): Promise<void> {
  await vscode.workspace
    .getConfiguration('smartSnippet')
    .update('snippets', snippets, vscode.ConfigurationTarget.Global);
}

// Добавление или обновление сниппета
export async function addOrUpdateSnippet(snippet: Snippet): Promise<void> {
  const snippets = getAllSnippets();
  const idx = snippets.findIndex(s => s.name === snippet.name);
  if (idx >= 0) {
    snippets[idx].description = snippet.description;
    snippets[idx].language = snippet.language;
    snippets[idx].prefix = snippet.prefix;
    snippets[idx].body = snippet.body;
    snippets[idx].favorite = snippet.favorite;
    snippets[idx].categories = snippet.categories;
  } else {
    snippets.push(snippet);
  }
  await saveSnippets(snippets);
}

// Удаление сниппета по имени
export async function removeSnippet(name: string): Promise<boolean> {
  const snippets = getAllSnippets();
  const filtered = snippets.filter(s => s.name !== name);
  if (filtered.length === snippets.length) {return false;}
  await saveSnippets(filtered);
  return true;
}
// Поиск сниппета по имени
export function findSnippet(name: string): Snippet | undefined {
  return getAllSnippets().find(s => s.name === name);
}
