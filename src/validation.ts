import { Snippet } from './types';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  snippets?: Snippet[];   // очищенные валидные данные
}

/**
 * Проверяет массив на соответствие структуре Snippet[].
 *
 * Возвращает:
 *   - valid: true, если все элементы корректны
 *   - errors: список ошибок с индексами (для показа пользователю)
 *   - snippets: нормализованные объекты (только известные поля,
 *               опциональные — со значениями по умолчанию)
 */
export function validateSnippetArray(data: unknown): ValidationResult {
  const errors: string[] = [];

  if (!Array.isArray(data)) {
    return { valid: false, errors: ['Корневой элемент должен быть массивом'] };
  }

  const snippets: Snippet[] = [];
  const seenNames = new Set<string>();

  for (let i = 0; i < data.length; i++) {
    const item = data[i];
    const at = `Элемент [${i}]`;

    if (!item || typeof item !== 'object') {
      errors.push(`${at}: не является объектом`);
      continue;
    }

    const obj = item as Record<string, unknown>;

    // Обязательные поля
    if (typeof obj.name !== 'string' || obj.name.trim().length === 0) {
      errors.push(`${at}: отсутствует или пустое поле "name"`);
      continue;
    }

    if (typeof obj.body !== 'string' || obj.body.trim().length === 0) {
      errors.push(`${at} ("${obj.name}"): отсутствует или пустое поле "body"`);
      continue;
    }

    // Дубликаты внутри файла
    if (seenNames.has(obj.name)) {
      errors.push(`${at}: дубликат имени "${obj.name}" внутри файла`);
      continue;
    }
    seenNames.add(obj.name);

    // Опциональные поля
    if (obj.description !== undefined && typeof obj.description !== 'string') {
      errors.push(`${at} ("${obj.name}"): "description" должен быть строкой`);
      continue;
    }
    if (obj.language !== undefined && typeof obj.language !== 'string') {
      errors.push(`${at} ("${obj.name}"): "language" должен быть строкой`);
      continue;
    }
    if (obj.prefix !== undefined && typeof obj.prefix !== 'string') {
      errors.push(`${at} ("${obj.name}"): "prefix" должен быть строкой`);
      continue;
    }
    if (obj.usageCount !== undefined && typeof obj.usageCount !== 'number') {
      errors.push(`${at} ("${obj.name}"): "usageCount" должен быть числом`);
      continue;
    }
    if (obj.favorite !== undefined && typeof obj.favorite !== 'boolean') {
      errors.push(`${at} ("${obj.name}"): "favorite" должен быть boolean`);
      continue;
    }
    if (obj.categories !== undefined && !Array.isArray(obj.categories)) {
      errors.push(`${at} ("${obj.name}"): "categories" должен быть массивом`);
      continue;
    }

    // Собираем «чистый» Snippet — только известные поля
    snippets.push({
      name: obj.name,
      body: obj.body,
      description: typeof obj.description === 'string' ? obj.description : undefined,
      language: typeof obj.language === 'string' ? obj.language : undefined,
      prefix: typeof obj.prefix === 'string' ? obj.prefix : undefined,
      usageCount: typeof obj.usageCount === 'number' ? obj.usageCount : 0,
      lastUsed: typeof obj.lastUsed === 'number' ? obj.lastUsed : undefined,
      favorite: typeof obj.favorite === 'boolean' ? obj.favorite : false,
      categories: Array.isArray(obj.categories)
        ? obj.categories.filter((c): c is string => typeof c === 'string')
        : undefined
    });
  }

  return { valid: errors.length === 0, errors, snippets };
}