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

    const name: string = fullText.split('\n')[0].match(/[^{\\}]+(?=})/g)?.[0] || '';
    const description: string = fullText.split('\n')[1].match(/[^{\\}]+(?=})/g)?.[0] || '';
    const language: string[] = fullText.split('\n')[2].match(/[^{\\}]+(?=})/g)?.[0].split(',').map(s => s.trim()) || [];
    const prefix: string[] = fullText.split('\n')[3].match(/[^{\\}]+(?=})/g)?.[0].split(',').map(s => s.trim()) || [];
    const favorite: string = fullText.split('\n')[4].match(/[^{\\}]+(?=})/g)?.[0] || '';
    const categories: string[] = fullText.split('\n')[5].match(/[^{\\}]+(?=})/g)?.[0].split(',').map(s => s.trim()) || [];
    if (name === '') {
        vscode.window.showWarningMessage('имени нет — шаблон не сохранён');
        return;
    }
    const allLangs = await vscode.languages.getLanguages();
    for (let i = 0; i < language.length; i++){
        if (!allLangs.includes(language[i].trim().toLowerCase())){
            vscode.window.showWarningMessage(`язык "${language[i]}" не существует - шаблон не сохранён`);
            return;
        }
    }
    await addOrUpdateSnippet({
      name: name,
      description: description || undefined,
      language: language.length > 0? language : undefined,
      prefix:  prefix.length > 0? prefix : undefined,
      body: body,
      usageCount : 0,
      favorite: favorite === 'true' ? true : false,
        categories: categories.length > 0 ? categories : undefined,
    });
    vscode.window.showInformationMessage(`Шаблон "${name}" сохранён`);
}