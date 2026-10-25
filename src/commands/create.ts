import * as vscode from 'vscode';
import { addOrUpdateSnippet, findSnippet } from '../storage';

const HEADER_MARKER = '// === Введите тело шаблона ниже ===';

export async function createSnippet(): Promise<void> {
  // 1. Имя
  const name = await vscode.window.showInputBox({
    prompt: 'Имя шаблона',
    validateInput: v => (!v || !/^[a-zA-Z0-9_-]+$/.test(v))
      ? 'Только буквы, цифры, _ и -'
      : null
  });
  if (!name) return;

  // 2. Проверка перезаписи
  const existing = findSnippet(name);
  if (existing) {
    const c = await vscode.window.showWarningMessage(
      `Шаблон "${name}" уже существует. Перезаписать?`,
      { modal: true }, 'Перезаписать'
    );
    if (c !== 'Перезаписать') return;
  }

  // 3. Метаданные (опционально, можно пропустить Enter'ом)
  const description = await vscode.window.showInputBox({
    prompt: 'Описание (необязательно)'
  });

  const language = await vscode.window.showInputBox({
    prompt: 'Язык (необязательно, например: typescript)'
  });

  const prefix = await vscode.window.showInputBox({
    prompt: 'Префикс для вставки (необязательно)'
  });

  const body = await vscode.window.showInputBox({
    prompt: 'Тело шаблона (\\n для переноса)'
  });
  if (!body) return;

  await addOrUpdateSnippet({
      name,
      description: description || undefined,
      language: language || undefined,
      prefix: prefix || undefined,
      body: body.replace(/\\n/g, '\n')
    });
}