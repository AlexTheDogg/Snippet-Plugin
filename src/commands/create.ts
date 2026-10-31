import * as vscode from 'vscode';
import { findSnippet } from '../storage';


export async function createSnippet(): Promise<void> {
  const name = await vscode.window.showInputBox({
    prompt: 'Имя шаблона'
  });
  if (!name) {return;}
  let description: string | undefined;
  let prefix: string[] | undefined;
  let language: string[] | undefined;
  let body: string[] | undefined;
  let favorite: boolean | undefined;
  let categories: string[] | undefined;
  let temp: string | undefined;
  const existing = findSnippet(name);
  if (existing) {
    const c = await vscode.window.showWarningMessage(
      `Шаблон "${name}" уже существует. Перезаписать?`,
      { modal: true }, 'Перезаписать'
    );
    if (c !== 'Перезаписать') {return;}
    description = existing.description;
    prefix = existing.prefix;
    language = existing.language;
    favorite = existing.favorite;
    categories = existing.categories;
    body = existing.body;
  }
  else{
    description = await vscode.window.showInputBox({
      prompt: 'Описание (необязательно)'
    });
    if (description === undefined) {return;}

    temp = await vscode.window.showInputBox({
      prompt: 'Префикс для вставки (необязательно)'
    });
    if (temp === undefined) {return;}
    prefix = temp.split(',').map(s => s.trim());

    favorite = await vscode.window.showQuickPick(['Да', 'Нет'], {
      placeHolder: 'Добавить в избранное?',
      canPickMany: false
    }).then(v => v === 'Да');
    if (favorite === undefined) {return;}
  }
  
  const edit_doc = vscode.window.activeTextEditor;
  if (edit_doc && !edit_doc.selection.isEmpty){
    body = edit_doc.document.getText(edit_doc.selection).replace(/\r/g, '').split('\n');
    language = [edit_doc.document.languageId];
  }
  if(!language){
    const allLanguages = await vscode.languages.getLanguages();
    temp = await vscode.window.showInputBox({
      prompt: 'Язык (необязательно, например: typescript)',
      validateInput: (value) => {
        if (!value || !value.trim()) {return null;}
        for (const lang of value.split(',').map(s => s.trim())){
          const normalized = lang.trim().toLowerCase();
          if (!allLanguages.includes(normalized)) {
          return `${lang} - Неизвестный язык. Известные: ${allLanguages.slice(0, 10).join(', ')}...`;
          }
        }
        return null;
      }
    });
    if (temp === undefined) {return;}
    language = temp.split(',').map(s => s.trim());
  }
  
  await openTextRedactor(name, description, language, prefix, body, favorite, categories);
}

export async function openTextRedactor(name: string,
  description: string | undefined,
  language: string[] | undefined,
  prefix: string[] | undefined,
  body: string[] | undefined,
  favorite: boolean | undefined,
  categories: string[] | undefined
): Promise<void> {
  const initialcontent = 
  `//Имя: \${${name}}\n`+
    `//Описание: \${${description? description : ''}}\n`+
    `//Язык: \${${language? language.join(', ') : ''}}\n`+
    `//Префикс: \${${prefix? prefix.join(', '): ''}}\n`+
    `//Избранный: \${${favorite}}\n`+
    `//Категории: \${${categories? categories.join(', ') : ''}}\n`+
    '//для сохранения используйте комбинацию клавиш Ctrl+Alt+S\n'+
    '//тело пишите, начиная с 10 строки!!!\n'+
    '//------------------------------------------\n'+
    (body? body.join('\n') : '');
  const doc = await vscode.workspace.openTextDocument({
    content: initialcontent,
    language: language? language[0] : 'plaintext'
  });

  const editor = await vscode.window.showTextDocument(doc, {
    preview: false,
    viewColumn: vscode.ViewColumn.Beside
  });

  const last = doc.lineCount - 1;
  const pos = new vscode.Position(last, doc.lineAt(last).text.length);
  editor.selection = new vscode.Selection(pos, pos);
  editor.revealRange(new vscode.Range(pos, pos));

  await vscode.commands.executeCommand('setContext', 'smartSnippet.save', true);
  
}