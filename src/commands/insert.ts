import * as vscode from 'vscode';
import { getAllSnippets, saveSnippets } from '../storage';
import { filterSnippets } from './list';

// вставляет выбранный сниппет в активный редактор с живым предпросмотром
export async function insertSnippet(): Promise<void> {
  const snippets = getAllSnippets();

  if (snippets.length === 0) {
    const action = await vscode.window.showInformationMessage(
      'Нет шаблонов. Создать первый?', 'Создать'
    );
    if (action === 'Создать') {
      vscode.commands.executeCommand('smartSnippet.create');
    }
    return;
  }

  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showWarningMessage('Нет активного редактора');
    return;
  }

  // ── Снимок исходного выделения / курсора ─────────────────────────
  const originalSelection = editor.selection;
  const savedSelectionText: string | null = originalSelection.isEmpty
    ? null
    : editor.document.getText(originalSelection);

  // ── Состояние предпросмотра ──────────────────────────────────────
  let currentPreviewRange: vscode.Range | null = null;
  let isAccepted = false;
  let pendingEdit: Promise<unknown> = Promise.resolve();

  const quickPick = vscode.window.createQuickPick();
  quickPick.placeholder = 'Выберите шаблон (живой предпросмотр)';
  quickPick.matchOnDescription = true;
  quickPick.matchOnDetail = true;

  // ── Фильтрация сниппетов ─────────────────────────────────────────
  const filtered = await filterSnippets(snippets);
  if (!filtered) {return;}
  quickPick.items = filtered.map(s => ({
    label: s.name,
    description: [s.language, s.description].filter(Boolean).join(' · '),
    detail: s.body[0] + (s.body.length > 1 ? '…' : '')
  }));

  // ── Применение превью ────────────────────────────────────────────
  const applyPreview = async (body: string): Promise<void> => {
    if (isAccepted) {return;}

    const startPos = currentPreviewRange?.start ?? originalSelection.start;
    const oldRange = currentPreviewRange;

  // Leading whitespace текущей строки — как в insertSnippet
    const lineIndent = editor.document
      .lineAt(startPos.line).text
      .match(/^[ \t]*/)?.[0] ?? '';

    const indentedBody = body
      .split('\n')
      .map((line, i) => {
        if (i === 0) {return line;}
        if (line.length === 0) {return line;}
        return lineIndent + line;
      })
      .join('\n');

    await editor.edit(eb => {
      if (oldRange) {eb.delete(oldRange);}
      eb.insert(startPos, indentedBody);
    }, { undoStopBefore: false, undoStopAfter: false });

    const bodyLines = indentedBody.split('\n');
    const lastLine = bodyLines[bodyLines.length - 1];
    const endLine = startPos.line + bodyLines.length - 1;
    const endChar = bodyLines.length === 1
      ? startPos.character + lastLine.length
      : lastLine.length;

    currentPreviewRange = new vscode.Range(
      startPos,
      new vscode.Position(endLine, endChar)
    );
  };

  // ── Навигация → обновляем превью ─────────────────────────────────
  quickPick.onDidChangeActive((activeItems) => {
    if (isAccepted) {return;}
    const activeItem = activeItems[0];
    if (!activeItem) {return;}
    const snippet = filtered.find(s => s.name === activeItem.label);
    if (!snippet) {return;}

    pendingEdit = pendingEdit
      .catch(() => {})
      .then(() => applyPreview(snippet.body.join('\n')));
  });

  // ── Подтверждение → заменяем превью настоящим сниппетом ──────────
  quickPick.onDidAccept(async () => {
    isAccepted = true;
    const selected = quickPick.selectedItems[0];
    quickPick.hide();
    await pendingEdit.catch(() => {});
    if (!selected) {return;}

    const snippet = snippets.find(s => s.name === selected.label);
    if (!snippet) {return;}

    const startPos = (currentPreviewRange ?? originalSelection).start;

    if (currentPreviewRange) {
      await editor.edit(eb => {
        eb.delete(currentPreviewRange!);
      }, { undoStopBefore: false, undoStopAfter: true });
      currentPreviewRange = null;
    }

    await editor.insertSnippet(
      new vscode.SnippetString(snippet.body.join('\n')),
      startPos
    );

    const updated = getAllSnippets();
    const idx = updated.findIndex(s => s.name === snippet.name);
    if (idx >= 0) {
      updated[idx].usageCount = (updated[idx].usageCount ?? 0) + 1;
      updated[idx].lastUsed = Date.now();
      await saveSnippets(updated);
    }
  });

  // ── Отмена (Esc) → восстанавливаем исходный текст ────────────────
  quickPick.onDidHide(async () => {
    if (!isAccepted) {
      await pendingEdit.catch(() => {});

      if (currentPreviewRange) {
        await editor.edit(eb => {
          if (savedSelectionText !== null) {
            eb.replace(currentPreviewRange!, savedSelectionText);
          } else {
            eb.delete(currentPreviewRange!);
          }
        }, { undoStopBefore: false, undoStopAfter: false });

        currentPreviewRange = null;
        editor.selection = originalSelection;
      }
    }
    quickPick.dispose();
  });

  quickPick.show();
}