import * as vscode from 'vscode';
import { getAllSnippets } from './storage';
import { Snippet } from './types';

// Провайдер сниппетов для всех языков, на которые есть сниппеты.
let registeredProviders: vscode.Disposable[] = [];

// Регистрирует провайдеры сниппетов для всех языков, на которые есть сниппеты.
export function registerSnippetProviders(context: vscode.ExtensionContext): void {
  // Сначала отписываемся от старых провайдеров, чтобы не дублировать предложения
  disposeSnippetProviders();

  const snippets = getAllSnippets();
  const snippetsByLanguage = new Map<string, Snippet[]>();
  
  // Группируем сниппеты по языкам
  for (const snippet of snippets) {
    const langs = snippet.language && snippet.language.length > 0
      ? snippet.language
      : ["plaintext"];

    for (const lang of langs) {
      if (!snippetsByLanguage.has(lang)) {
        snippetsByLanguage.set(lang, []);
      }
      snippetsByLanguage.get(lang)!.push(snippet);
    }
  }

  // Для каждого языка регистрируем свой провайдер
  for (const [language, langSnippets] of snippetsByLanguage) {
    const provider = vscode.languages.registerCompletionItemProvider(
      { language },
      {
        provideCompletionItems() {
          const items: vscode.CompletionItem[] = [];

          for (const snippet of langSnippets) {
            // body: string[] → string (VS Code SnippetString ждёт строку)
            const bodyText = snippet.body.join('\n');

            // prefix: string[] → первым берём триггер, если массив пуст — имя
            const primaryPrefix = (snippet.prefix && snippet.prefix.length > 0)
              ? snippet.prefix[0]
              : snippet.name;

            const item = new vscode.CompletionItem(
              primaryPrefix,
              vscode.CompletionItemKind.Snippet
            );

            // Описание
            item.detail = snippet.description || snippet.name;

            // Markdown-документация: берём первый язык из массива
            const docLanguage = (snippet.language && snippet.language[0]) || '';
            item.documentation = new vscode.MarkdownString(
              '```' + docLanguage + '\n' + bodyText + '\n```'
            );

            // Вставляем как SnippetString (работают ${1}, ${2}, $0)
            item.insertText = new vscode.SnippetString(bodyText);

            // Поиск: все префиксы + имя + категории
            const filterParts: string[] = [
              snippet.name,
              ...(snippet.prefix ?? []),
              ...(snippet.categories ?? [])
            ];
            item.filterText = filterParts.join(' ');
            
            item.command = {
              command: 'smartSnippet.trackInsertion',
              title: '',
              arguments: [snippet.name]
            };
            
            items.push(item);
          }

          return items;
        }
      }
    );

    context.subscriptions.push(provider);
    registeredProviders.push(provider);
  }
}

/**
 * Отписывается от всех зарегистрированных провайдеров.
 * Вызывайте её перед повторной регистрацией, чтобы не дублировать предложения.
 */
export function disposeSnippetProviders(): void {
  for (const provider of registeredProviders) {
    provider.dispose();
  }
  registeredProviders = [];
}