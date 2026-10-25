import * as vscode from 'vscode';
import { addOrUpdateSnippet, findSnippet } from '../storage';

export async function createSnippet(): Promise<void> {
  const name = await vscode.window.showInputBox({
    prompt: 'Имя шаблона',
    validateInput: v => (!v || !/^[a-zA-Z0-9_-]+$/.test(v))
      ? 'Только буквы, цифры, _ и -'
      : null
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

  const body = await vscode.window.showInputBox({
    prompt: 'Тело шаблона (\\n для переноса)'
  });
  if (!body) {return;}

  await addOrUpdateSnippet({ name, body: body.replace(/\\n/g, '\n') });
  vscode.window.showInformationMessage(`Шаблон "${name}" сохранён`);
}