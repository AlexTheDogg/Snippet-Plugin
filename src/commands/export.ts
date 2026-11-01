import * as vscode from 'vscode';
import { getAllSnippets } from '../storage';
import { Snippet } from '../types';

export async function exportSnippets(): Promise<void> {
  let snippets = getAllSnippets();
  if (snippets.length === 0) {
    vscode.window.showInformationMessage('Нет шаблонов для экспорта');
    return;
  }

  const mode = await vscode.window.showQuickPick(
    [
      {
        label: '$(files) Все шаблоны',
        description: `${snippets.length}`
      },
      {
        label: '$(checklist) Выбрать вручную...',
        description: 'отметить нужные галочками'
      }
    ],
    { placeHolder: 'Что экспортировать?' }
  );
  if (!mode) {return;}

  let toExport: Snippet[] | undefined;
  if (mode.label === '$(files) Все шаблоны'){
    toExport = snippets;
  }
  else{
    toExport = await SelectForExport(snippets);
  }

  if (!toExport || toExport.length === 0) {return;}

  const converted = toVsCodeSnippetFormat(toExport);

  const uri = await vscode.window.showSaveDialog({
    filters: { 'JSON': ['json'] },
    defaultUri: vscode.Uri.file('snippets-export.json'),
    saveLabel: 'Экспортировать'
  });
  if (!uri) {return;}

  try {
    const content = JSON.stringify(converted, null, 2);
    await vscode.workspace.fs.writeFile(uri, Buffer.from(content, 'utf8'));
    vscode.window.showInformationMessage(
      `Экспортировано шаблонов: ${toExport.length}`
    );
  } catch (err) {
    vscode.window.showErrorMessage(`Не удалось записать файл: ${err}`);
  }
}


function SelectForExport (snippets: Snippet[]): Promise<Snippet[] | undefined> {
  return new Promise(resolve => {
    const quickPick = vscode.window.createQuickPick<
      vscode.QuickPickItem & { snippet: Snippet }
    >();
    quickPick.canSelectMany = true;
    quickPick.title = 'Экспорт шаблонов';
    quickPick.placeholder =
      'Отметьте шаблоны (Enter — экспортировать выделенные)';
    quickPick.matchOnDescription = true;
    quickPick.matchOnDetail = true;

    quickPick.items = snippets.map(s => ({
      label: s.name,
      description: [
        s.language?.join(', '),
        s.favorite ? '$(star-full)' : '',
        s.description
      ].filter(Boolean).join(' · '),
      detail: s.body[0] + (s.body.length > 1 ? '…' : ''),
      snippet: s
    }));

    // Кнопка «Выбрать все / Снять всё»
    let allSelected = false;
    const toggleAllBtn: vscode.QuickInputButton = {
      iconPath: new vscode.ThemeIcon('check-all'),
      tooltip: 'Выбрать все / Снять всё'
    };
    quickPick.buttons = [toggleAllBtn];

    quickPick.onDidTriggerButton(btn => {
      if (btn === toggleAllBtn) {
        quickPick.selectedItems = allSelected ? [] : quickPick.items;
        allSelected = !allSelected;
      }
    });

    quickPick.onDidAccept(() => {
      const picked = quickPick.selectedItems.map(i => i.snippet);
      resolve(picked.length > 0 ? picked : undefined);
      quickPick.hide();
    });

    quickPick.onDidHide(() => {
      // Если accept не сработал (Esc) — resolve(undefined).
      // Повторный resolve после accept — no-op (Promise уже разрешён).
      resolve(undefined);
      quickPick.dispose();
    });

    quickPick.show();
  });
}

function toVsCodeSnippetFormat(
  snippets: Snippet[]
): Record<string, { prefix: string; body: string[]; description?: string; scope?: string }> {
  const result: Record<string, any> = {};

  for (const snippet of snippets) {
    result[snippet.name] = {
      prefix: snippet.prefix,
      body: snippet.body,
      ...(snippet.description ? { description: snippet.description } : {}),
      ...(snippet.language ? { scope: snippet.language.join(', ') } : {})
    };
  }

  return result;
}