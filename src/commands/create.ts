import * as vscode from 'vscode';
import { findSnippet, addOrUpdateSnippet } from '../storage';


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

  const description = await vscode.window.showInputBox({
    prompt: 'Описание (необязательно)'
  });
  
  const prefix = await vscode.window.showInputBox({
    prompt: 'Префикс для вставки (необязательно)'
  });
  const edit_doc = vscode.window.activeTextEditor;
  if (edit_doc){
    const selection = edit_doc.document.getText(edit_doc.selection).replace(/\r/g, '').split('\n');
    if (!(selection.length === 1 && selection[0] === '')){
      await addOrUpdateSnippet({
        name,
        description: description || undefined,
        language: edit_doc.document.languageId || undefined,
        prefix: prefix || undefined,
        body: selection,
        usageCount: 0,

      });
      return;
    }
  }
  
  const language = await vscode.window.showInputBox({
    prompt: 'Язык (необязательно, например: typescript)'
  });

  let initialContent = 
  `//Имя: \${${name}}\n`+
  `//Описание: \${${description}}\n`+
  `//Язык: \${${language}}\n`+
  `//Префикс: \${${prefix}}\n`+
  '//для сохранения используйте комбинацию клавиш Ctrl+Alt+S\n'+
  '//тело пишите, начиная с 9 строки!!!';
  
  if (existing){
    initialContent += '\n\n'+
    existing.body.join('\n');
  } else{
    initialContent += '//Введите тело шаблона ниже:\n\n';
  }
  
  const doc = await vscode.workspace.openTextDocument({
    content: initialContent,
    language: language || 'plaintext'
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