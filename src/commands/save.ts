import * as vscode from 'vscode';
import { addOrUpdateSnippet} from '../storage';

export async function saveSnippet(): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
    vscode.window.showWarningMessage('Нет активного редактора');
    return;
    }

    const fullText = editor.document.getText();
    const body = fullText.split('\n').slice(8);

    if (body.length === 0) {
        vscode.window.showWarningMessage('Тело пустое — шаблон не сохранён');
        return;
    }

    let variableNames = ['','','',''];
    for (let i: number = 0; i <= 3; i++){
        const temp = fullText.split('\n')[i].match(/[^{\\}]+(?=})/g);
        if(temp){
            variableNames[i] = temp[0];
        };
    }

    if (variableNames[0] === '') {
        vscode.window.showWarningMessage('имени нет — шаблон не сохранён');
        return;
    }
    await addOrUpdateSnippet({
      name: variableNames[0],
      description: variableNames[1] || undefined,
      language: variableNames[2] || undefined,
      prefix: variableNames[3] || undefined,
      body: body,
      usageCount : 0
    });
}