import * as vscode from 'vscode';
import { findSnippet } from '../storage';
import { openTemplateEditor, PendingTemplate } from '../templateEditor';

export async function createSnippet(context: vscode.ExtensionContext): Promise<void> {
  const activeEditor = vscode.window.activeTextEditor;
  const hasSelection = !!activeEditor && !activeEditor.selection.isEmpty;

  const selectionText: string | undefined = hasSelection
    ? activeEditor!.document.getText(activeEditor!.selection).replace(/\r/g, '')
    : undefined;

  const selectionLanguage: string[] | undefined = hasSelection
    ? [activeEditor!.document.languageId]
    : undefined;
  
  const name = await vscode.window.showInputBox({
    prompt: 'Имя шаблона'
  });
  if (!name) {return;}

  const existing = findSnippet(name);
  if (existing) {
    const c = await vscode.window.showWarningMessage(
      `Шаблон "${name}" уже существует. Перезаписать?`,
      { modal: true }, 'Перезаписать'
    );
    if (c !== 'Перезаписать') {return;}
  }

  const template: PendingTemplate = existing
    ? {
        name: existing.name,
        originalName: existing.name,
        description: existing.description,
        language: existing.language ?? [],
        prefix: existing.prefix ?? [],
        favorite: existing.favorite,
        categories: existing.categories ?? [],
        body: existing.body
      }
    : {
        name,
        language: [],
        prefix: [],
        favorite: false,
        categories: [],
        body: selectionText !== undefined ? selectionText.split('\n') : undefined
      };

  await openTemplateEditor(context, template);
}