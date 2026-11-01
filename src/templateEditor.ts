import * as vscode from 'vscode';
import { saveSnippets, findSnippet, getAllSnippets } from './storage';
import { Snippet } from './types';

export interface PendingTemplate {
  name: string;
  originalName?: string;
  description?: string;
  language: string[];
  prefix: string[];
  favorite: boolean;
  categories: string[];
  body?: string[];
}

/** Реестр: URI временного документа → метаданные шаблона. */
export const pendingTemplates = new Map<string, PendingTemplate>();

/**
 * QuickPick-визард: список параметров + «Тело» + «Сохранить».
 */
export async function openTemplateEditor(
  context: vscode.ExtensionContext,
  template: PendingTemplate
): Promise<void> {
  while (true) {
    const action = await vscode.window.showQuickPick(
      [
        { label: '$(text) Имя',           description: template.name },
        { label: '$(info) Описание',      description: template.description || '(не задано)' },
        { label: '$(symbol-method) Языки', description: template.language.join(', ') || '(не заданы)' },
        { label: '$(tag) Префиксы',       description: template.prefix.join(', ') || '(не заданы)' },
        { label: '$(star) Избранное',     description: template.favorite ? 'Да' : 'Нет' },
        { label: '$(folder) Категории',   description: template.categories.join(', ') || '(не заданы)' },
        { label: '$(edit) Тело шаблона',  description: template.body && template.body.join('').trim() ? `${template.body.length} строк` : '(не задано)' },
        { label: '$(check) Сохранить' }
      ],
      {
        placeHolder: 'Изменить параметр или открыть «Тело» для редактирования',
        matchOnDescription: true
      }
    );

    if (!action) {return;}   // Esc — отмена

    if (action.label.startsWith('$(check)')) {
      if (!template.body || template.body.join('').trim() === '') {
        vscode.window.showErrorMessage(
          'Тело не задано — откройте «Тело шаблона» и введите код'
        );
        continue;
      }
      await saveTemplate(template);
      return;
    }

    if (action.label.startsWith('$(text)'))           {await editName(template);}
    else if (action.label.startsWith('$(info)'))      {await editDescription(template);}
    else if (action.label.startsWith('$(symbol-method)')) {await editLanguages(template);}
    else if (action.label.startsWith('$(tag)'))       {await editPrefixes(template);}
    else if (action.label.startsWith('$(star)'))      {template.favorite = !template.favorite;}
    else if (action.label.startsWith('$(folder)'))    {await editCategories(template);}
    else if (action.label.startsWith('$(edit)')) {
      await openBodyEditor(context, template);
      return;   // ← сохранение произойдёт через Ctrl+Alt+S
    }
  }
}

// ── Редакторы полей ─────────────────────────────────────────────

async function editName(t: PendingTemplate): Promise<void> {
  const name = await vscode.window.showInputBox({
    prompt: 'Имя шаблона',
    value: t.name,
    validateInput: v => {
      const existing = findSnippet(v.trim());
      if (existing 
          && v.trim() !== t.name 
          && v.trim() !== t.originalName) {
        return `Шаблон "${v.trim()}" уже существует`;
      }
      return null;
    }
  });
  if (name?.trim()) {t.name = name.trim();}
}

async function editDescription(t: PendingTemplate): Promise<void> {
  const d = await vscode.window.showInputBox({
    prompt: 'Описание (Enter на пустом — очистить)',
    value: t.description ?? ''
  });
  if (d === undefined) {return;}   // Esc — оставить как было
  t.description = d.trim() || undefined;
}

async function editPrefixes(t: PendingTemplate): Promise<void> {
  const p = await vscode.window.showInputBox({
    prompt: 'Префиксы через запятую (Enter — очистить)',
    value: t.prefix.join(', ')
  });
  if (p === undefined) {return;}
  t.prefix = p.split(',').map(x => x.trim()).filter(Boolean);
}

async function editLanguages(t: PendingTemplate): Promise<void> {
  const all = await vscode.languages.getLanguages();
  const items: vscode.QuickPickItem[] = [
    ...all.map(lang => ({ label: lang, picked: t.language.includes(lang) }))
  ];
  const picked = await vscode.window.showQuickPick(items, {
    canPickMany: true,
    placeHolder: 'Отметьте языки'
  });
  if (!picked) {return;}

  if (picked.some(p => p.label.startsWith('$(add)'))) {
    const custom = await vscode.window.showInputBox({
      prompt: 'Языки через запятую',
      validateInput: v => {
        if (!v || !v.trim()) {return 'Введите хотя бы один';}
        for (const l of v.split(',')) {
          if (!all.includes(l.trim().toLowerCase())) {return `"${l.trim()}" — неизвестный язык`;}
        }
        return null;
      }
    });
    if (custom) {
      t.language = custom.split(',').map(x => x.trim()).filter(Boolean);
      return;
    }
  }
  t.language = picked.filter(p => !p.label.startsWith('$(add)')).map(p => p.label);
}

async function editCategories(t: PendingTemplate): Promise<void> {
  // ✅ Источник правды — settings.json + текущий шаблон
  const existing = getAllSnippets();
  const all = [...new Set([
    ...existing.flatMap(s => s.categories ?? []),
    ...t.categories   // на случай, если категория уже удалена из всех шаблонов,
                      // но пользователь только что её добавил
  ])].sort((a, b) => a.localeCompare(b));

  const items: vscode.QuickPickItem[] = [
    { label: '$(add) Создать новую...' },
    ...all.map(c => ({
      label: c,
      picked: t.categories.includes(c)   // ← предзаполненные галочки
    }))
  ];

  const picked = await vscode.window.showQuickPick(items, {
    canPickMany: true,
    placeHolder: 'Отметьте категории'
  });
  if (!picked) {return;}

  const createNew = picked.some(p => p.label.startsWith('$(add)'));

  if (createNew) {
    const n = await vscode.window.showInputBox({
      prompt: 'Категории через запятую (добавятся к выбранным)',
      validateInput: v => (!v || !v.trim()) ? 'Введите категорию' : null
    });
    if (n === undefined) {return;}   // Esc — оставить как было

    // ✅ Новые категории ДОБАВЛЯЮТСЯ к выбранным, а не заменяют их
    const selected = picked
      .filter(p => !p.label.startsWith('$(add)'))
      .map(p => p.label);
    const added = n.split(',').map(x => x.trim()).filter(Boolean);
    t.categories = [...new Set([...selected, ...added])];
    return;
  }

  t.categories = picked
    .filter(p => !p.label.startsWith('$(add)'))
    .map(p => p.label);
}

// ── Сохранение в settings.json ──────────────────────────────────

async function saveTemplate(t: PendingTemplate): Promise<void> {
  const snippets = getAllSnippets();

  // ── Статистика «переезжает» со старого имени на новое ──────────
  const statsSource = t.originalName
    ? findSnippet(t.originalName)
    : findSnippet(t.name);
  const usageCount = statsSource?.usageCount ?? 0;
  const lastUsed = statsSource?.lastUsed;

  // ── Если переименовали — удаляем старый ────────────────────────
  const renamed = t.originalName !== undefined && t.originalName !== t.name;
  if (renamed) {
    const oldIdx = snippets.findIndex(s => s.name === t.originalName);
    if (oldIdx >= 0) {snippets.splice(oldIdx, 1);}
  }

  // ── Готовим итоговый объект ────────────────────────────────────
  const newSnippet: Snippet = {
    name: t.name,
    description: t.description,
    language: t.language.length ? t.language : undefined,
    prefix: t.prefix.length ? t.prefix : undefined,
    body: t.body ?? [],
    usageCount,                    // ← перенесли со старого
    lastUsed,                      // ← перенесли со старого
    favorite: t.favorite,
    categories: t.categories.length ? t.categories : undefined
  };

  // ── Заменяем или добавляем ─────────────────────────────────────
  const idx = snippets.findIndex(s => s.name === t.name);
  if (idx >= 0) {snippets[idx] = newSnippet;}
  else {snippets.push(newSnippet);}

  // ── Одно сохранение — одно событие onDidChangeConfiguration ────
  await saveSnippets(snippets);

  vscode.window.showInformationMessage(
    renamed 
      ? `Шаблон "${t.originalName}" переименован в "${t.name}"`
      : `Шаблон "${t.name}" сохранён`
  );
}

// ── Текстовый редактор тела ─────────────────────────────────────

async function openBodyEditor(
  context: vscode.ExtensionContext,
  template: PendingTemplate
): Promise<void> {
  const tmpDir = context.globalStorageUri;
  await vscode.workspace.fs.createDirectory(tmpDir);

  const uri = vscode.Uri.joinPath(
    tmpDir,
    `template-body-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.txt`
  );

  await vscode.workspace.fs.writeFile(
    uri,
    Buffer.from((template.body ?? []).join('\n'), 'utf8')
  );

  const doc = await vscode.workspace.openTextDocument(uri);
  const editor = await vscode.window.showTextDocument(doc, {
    preview: false,
    viewColumn: vscode.ViewColumn.Beside
  });

  // Курсор в конец
  const last = doc.lineCount - 1;
  const pos = new vscode.Position(last, doc.lineAt(last).text.length);
  editor.selection = new vscode.Selection(pos, pos);
  editor.revealRange(new vscode.Range(pos, pos));

  // Регистрируем метаданные — saveSnippet найдёт по URI
  pendingTemplates.set(uri.toString(), template);

  // Активируем Ctrl+Alt+S
  await vscode.commands.executeCommand('setContext', 'smartSnippet.save', true);
}