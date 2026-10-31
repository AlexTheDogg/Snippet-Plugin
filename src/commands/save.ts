import * as vscode from 'vscode';
import { addOrUpdateSnippet} from '../storage';

export async function saveSnippet(): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
    vscode.window.showWarningMessage('Нет активного редактора');
    return;
    }

    const fullText = editor.document.getText();
    const body = fullText.split('\n').slice(9);

    if (!body) {
        vscode.window.showWarningMessage('Тело пустое — шаблон не сохранён');
        return;
    }

    let variableNames = ['','',''];
    for (let i: number = 0; i <= 4; i++){
        const temp = fullText.split('\n')[i].match(/[^{\\}]+(?=})/g);
        if(temp){
            variableNames[i] = temp[0];
        };
    }
    let language: string[] = fullText.split('\n')[2].match(/[^{\\}]+(?=})/g)?.[0].split(',').map(s => s.trim()) || [];
    let prefix: string[] = fullText.split('\n')[3].match(/[^{\\}]+(?=})/g)?.[0].split(',').map(s => s.trim()) || [];
    let categories: string[] = fullText.split('\n')[5].match(/[^{\\}]+(?=})/g)?.[0].split(',').map(s => s.trim()) || [];
    if (variableNames[0] === '') {
        vscode.window.showWarningMessage('имени нет — шаблон не сохранён');
        return;
    }
    await addOrUpdateSnippet({
      name: variableNames[0],
      description: variableNames[1] || undefined,
      language: language.length > 0? language : undefined,
      prefix:  prefix.length > 0? prefix : undefined,
      body: body,
      usageCount : 0,
      favorite: variableNames[2] === 'true' ? true : false,
        categories: categories.length > 0 ? categories : undefined,
    });
    vscode.window.showInformationMessage(`Шаблон "${variableNames[0]}" сохранён`);
}