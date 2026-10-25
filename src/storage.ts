import * as vscode from 'vscode';
import { Snippet } from './types';

export function getAllSnippets(): Snippet[] {
  return vscode.workspace
    .getConfiguration('smartSnippet')
    .get<Snippet[]>('snippets', []);
}

export async function saveSnippets(snippets: Snippet[]): Promise<void> {
  await vscode.workspace
    .getConfiguration('smartSnippet')
    .update('snippets', snippets, vscode.ConfigurationTarget.Global);
}

export async function addOrUpdateSnippet(snippet: Snippet): Promise<void> {
  const snippets = getAllSnippets();
  const idx = snippets.findIndex(s => s.name === snippet.name);
  if (idx >= 0) {
    snippets[idx] = snippet;
  } else {
    snippets.push(snippet);
  }
  await saveSnippets(snippets);
}

export async function removeSnippet(name: string): Promise<boolean> {
  const snippets = getAllSnippets();
  const filtered = snippets.filter(s => s.name !== name);
  if (filtered.length === snippets.length) {return false;}
  await saveSnippets(filtered);
  return true;
}

export function findSnippet(name: string): Snippet | undefined {
  return getAllSnippets().find(s => s.name === name);
}