import * as vscode from 'vscode';
import { getAllSnippets, saveSnippets } from '../storage';
import { filterSnippets } from './list';

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

  // ── QuickPick ────────────────────────────────────────────────────
  const quickPick = vscode.window.createQuickPick();
  quickPick.placeholder = 'Выберите шаблон (живой предпросмотр)';
  quickPick.matchOnDescription = true;
  quickPick.matchOnDetail = true;

  const filtered = await filterSnippets(snippets);
  if (!filtered) {return;}
  quickPick.items = filtered.map(s => ({
    label: s.name,
    description: [s.language, s.description].filter(Boolean).join(' · '),
    detail: s.body.substring(0, 120) + (s.body.length > 120 ? '…' : '')
  }));

  // ── Применение превью ────────────────────────────────────────────
  const applyPreview = async (body: string): Promise<void> => {
    if (isAccepted) {return;}

    if (!currentPreviewRange) {
      // Первый показ: заменяем выделение (или вставляем в точку)
      await editor.edit(eb => {
        eb.replace(originalSelection, body);
      }, { undoStopBefore: false, undoStopAfter: false });

      const start = originalSelection.start;
      const lines = body.split('\n');
      const endLine = start.line + lines.length - 1;
      const endChar = lines.length === 1
        ? start.character + body.length
        : lines[lines.length - 1].length;

      currentPreviewRange = new vscode.Range(
        start,
        new vscode.Position(endLine, endChar)
      );
    } else {
      // Последующие: заменяем предыдущее превью
      const start = currentPreviewRange.start;
      await editor.edit(eb => {
        eb.replace(currentPreviewRange!, body);
      }, { undoStopBefore: false, undoStopAfter: false });

      const lines = body.split('\n');
      const endLine = start.line + lines.length - 1;
      const endChar = lines.length === 1
        ? start.character + body.length
        : lines[lines.length - 1].length;

      currentPreviewRange = new vscode.Range(
        start,
        new vscode.Position(endLine, endChar)
      );
    }
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
      .then(() => applyPreview(snippet.body));
  });

  // ── Подтверждение → заменяем превью настоящим сниппетом ──────────
  quickPick.onDidAccept(async () => {
    isAccepted = true;

    const selected = quickPick.selectedItems[0];
    quickPick.hide();

    await pendingEdit.catch(() => {});

    if (!selected) {return;}
    const snippet = filtered.find(s => s.name === selected.label);
    if (!snippet) {return;}

    const targetRange = currentPreviewRange ?? originalSelection;

    await editor.insertSnippet(
      new vscode.SnippetString(snippet.body),
      targetRange
    );

    currentPreviewRange = null;

    // Статистика
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