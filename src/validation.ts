import { Snippet } from './types';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  snippets: Snippet[];
}

export function validateSnippetArray(data: unknown): ValidationResult {
  const errors: string[] = [];
  const snippets: Snippet[] = [];

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return {valid: false, errors: ["Неверный формат файла"], snippets: []};
  }

  const obj = data as Record<string, unknown>;
  const keys = Object.keys(obj);

  if (keys.length === 0) {
    return { valid: true, errors: [], snippets: [] };
  }

  for (const [name, rawValue] of Object.entries(obj)) {
    const at = `Сниппет "${name}"`;

    // Имя ключа
    if (!name.trim()) {
      errors.push('Пустое имя ключа в объекте сниппетов');
      continue;
    }

    // Значение — объект
    if (!rawValue || typeof rawValue !== 'object' || Array.isArray(rawValue)) {
      errors.push(`${at}: значение должно быть объектом`);
      continue;
    }

    const v = rawValue as Record<string, unknown>;

    // body — обязательно
    if (!('body' in v)) {
      errors.push(`${at}: отсутствует обязательное поле "body"`);
      continue;
    }

    // body: string | string[]
    let body: string;
    if (typeof v.body === 'string') {
      body = v.body;
    } else if (Array.isArray(v.body)) {
      if (!v.body.every(s => typeof s === 'string')) {
        errors.push(`${at}: "body" должен быть строкой или массивом строк`);
        continue;
      }
      body = (v.body as string[]).join('\n');
    } else {
      errors.push(`${at}: "body" должен быть строкой или массивом строк`);
      continue;
    }

    if (!body.trim()) {
      errors.push(`${at}: пустое тело шаблона ("body")`);
      continue;
    }


    let prefix: string | undefined;
    if (v.prefix !== undefined) {
      if (typeof v.prefix === 'string') {
        prefix = v.prefix;
      } else if (
        Array.isArray(v.prefix) &&
        v.prefix.every(s => typeof s === 'string')
      ) {
        prefix = (v.prefix as string[])[0];
      } else {
        errors.push(`${at}: "prefix" должен быть строкой или массивом строк`);
        continue;
      }
    }

    let language: string | undefined;
    if (v.scope !== undefined) {
      if (typeof v.scope === 'string') {
        language = v.scope.split(',')[0].trim() || undefined;
      } else if (
        Array.isArray(v.scope) &&
        v.scope.every(s => typeof s === 'string')
      ) {
        language = ((v.scope as string[])[0] ?? '').trim() || undefined;
      } else {
        errors.push(`${at}: "scope" должен быть строкой или массивом строк`);
        continue;
      }
    }

    let description: string | undefined;
    if (v.description !== undefined) {
      if (typeof v.description === 'string') {
        description = v.description;
      } else {
        errors.push(`${at}: "description" должен быть строкой`);
        continue;
      }
    }

    snippets.push({
      name,
      body,
      description,
      language,
      prefix,
      usageCount: 0,
      favorite: false
    });
  }

  return { valid: errors.length === 0, errors, snippets };
}