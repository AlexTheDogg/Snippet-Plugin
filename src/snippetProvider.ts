import * as vscode from 'vscode';
import { getAllSnippets } from './storage';
import { Snippet } from './types';

// Храним зарегистрированные провайдеры, чтобы можно было их обновлять
let registeredProviders: vscode.Disposable[] = [];

export function registerSnippetProviders(context: vscode.ExtensionContext): void {
  // Сначала отписываемся от старых провайдеров, если они были
  disposeSnippetProviders();

  const snippets = getAllSnippets();

  // Группируем шаблоны по каждому языку.
  // Шаблон без языка ([] или undefined) → попадает в 'plaintext'.
  // Шаблон с несколькими языками → попадает в КАЖДУЮ группу.
  const snippetsByLanguage = new Map<string, Snippet[]>();

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