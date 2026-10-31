import * as vscode from 'vscode';
import { getAllSnippets, saveSnippets } from '../storage';
import { validateSnippetArray } from '../validation';
import { Snippet } from '../types';

export async function importSnippets(): Promise<void> {
  // 1. Диалог выбора файла
  const uris = await vscode.window.showOpenDialog({
    canSelectMany: false,
    filters: { 'JSON': ['json'] },
    openLabel: 'Импортировать'
  });
  if (!uris || uris.length === 0) {return;}

  // 2. Чтение
  let raw: Uint8Array;
  try {
    raw = await vscode.workspace.fs.readFile(uris[0]);
  } catch (err) {
    vscode.window.showErrorMessage(`Не удалось прочитать файл: ${err}`);
    return;
  }

  // 3. Парсинг JSON
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(raw).toString('utf8'));
  } catch {
    vscode.window.showErrorMessage('Файл не является валидным JSON');
    return;
  }

  // 4. Поддержка двух форматов: массив или { version, snippets }
  const rawSnippets =
    Array.isArray(parsed)
      ? parsed
      : (parsed && typeof parsed === 'object' && 'snippets' in parsed)
        ? (parsed as { snippets: unknown }).snippets
        : null;

  if (rawSnippets === null) {
    vscode.window.showErrorMessage(
      'Файл не содержит массива шаблонов (ожидается [...] или { snippets: [...] })'
    );
    return;
  }

  // 5. Валидация структуры
  const result = validateSnippetArray(rawSnippets);
  if (!result.valid || !result.snippets) {
    const top = result.errors.slice(0, 5).join('\n');
    const more = result.errors.length > 5
      ? `\n… и ещё ${result.errors.length - 5} ошибок`
      : '';
    vscode.window.showErrorMessage(`Файл содержит ошибки:\n${top}${more}`);
    return;
  }

  const imported = result.snippets;
  if (imported.length === 0) {
    vscode.window.showInformationMessage('Файл не содержит шаблонов');
    return;
  }

  // 6. Классификация: новые / идентичные / конфликты
  const existing = getAllSnippets();
  const existingByName = new Map(existing.map(s => [s.name, s]));

  const newOnes: Snippet[] = [];
  const conflicts: Snippet[] = [];
  const identical: Snippet[] = [];

  for (const imp of imported) {
    const ex = existingByName.get(imp.name);
    if (!ex) {
      newOnes.push(imp);
    } else if (
      ex.body === imp.body &&
      ex.description === imp.description &&
      ex.language === imp.language
    ) {
      identical.push(imp);
    } else {
      conflicts.push(imp);
    }
  }

  // 7. Если импортировать нечего — выходим
  if (newOnes.length === 0 && conflicts.length === 0) {
    vscode.window.showInformationMessage(
      `Все ${imported.length} шаблонов уже есть — импорт не требуется`
    );
    return;
  }

  // 8. Стратегия для конфликтов
  let overwrite = false;
  if (conflicts.length > 0) {
    const msg = [
      `В файле: ${imported.length} шаблонов.`,
      `Новых: ${newOnes.length}.`,
      `Конфликтов: ${conflicts.length} (имя уже занято, содержимое отличается).`,
      `Идентичных: ${identical.length}.`,
      ``,
      `Что делать с конфликтами?`
    ].join('\n');

    const choice = await vscode.window.showWarningMessage(
      msg,
      { modal: true },
      'Перезаписать конфликты',
      'Пропустить конфликты'
    );
    if (!choice) {return;}   // Esc / закрытие → отмена

    overwrite = choice === 'Перезаписать конфликты';
  }

  // 9. Построение итогового массива
  const merged = new Map(existing.map(s => [s.name, s]));

  for (const imp of newOnes) {
    merged.set(imp.name, imp);
  }

  if (overwrite) {
    for (const imp of conflicts) {
      const old = existingByName.get(imp.name);
      merged.set(imp.name, {
        ...imp,
        // Сохраняем статистику, если в файле её нет
        usageCount: imp.usageCount ?? old?.usageCount ?? 0,
        lastUsed: imp.lastUsed ?? old?.lastUsed
      });
    }
  }

  // 10. Финальное подтверждение с числами — защита от случайной перезаписи
  const finalList = [...merged.values()];
  const willOverwrite = overwrite ? conflicts.length : 0;

  const finalMsg = willOverwrite > 0
    ? `Импорт заменит ${willOverwrite} существующих шаблонов.\n` +
      `Всего станет: ${finalList.length}. Продолжить?`
    : `Будет добавлено ${newOnes.length} шаблонов.\n` +
      `Всего станет: ${finalList.length}. Продолжить?`;

  const confirm = await vscode.window.showWarningMessage(
    finalMsg,
    { modal: true },
    'Импортировать'
  );
  if (confirm !== 'Импортировать') {return;}

  // 11. Запись
  try {
    await saveSnippets(finalList);
  } catch (err) {
    vscode.window.showErrorMessage(`Не удалось сохранить: ${err}`);
    return;
  }

  // 12. Итоговый отчёт
  const parts = [
    newOnes.length > 0 ? `добавлено: ${newOnes.length}` : '',
    willOverwrite > 0 ? `перезаписано: ${willOverwrite}` : '',
    !overwrite && conflicts.length > 0 ? `пропущено: ${conflicts.length}` : '',
    identical.length > 0 ? `идентичных: ${identical.length}` : ''
  ].filter(Boolean);

  vscode.window.showInformationMessage(`Импорт завершён — ${parts.join(', ')}`);
}
