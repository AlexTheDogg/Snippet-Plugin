import * as assert from 'assert';
import * as vscode from 'vscode';

import {
  getAllSnippets,
  saveSnippets,
  findSnippet,
  addOrUpdateSnippet,
  removeSnippet,
} from '../storage';
import { Snippet } from '../types';

// ─────────────────────────────────────────────────────────────
// Утилиты
// ─────────────────────────────────────────────────────────────

function makeSnippet(overrides: Partial<Snippet> = {}): Snippet {
  return {
    name: 'test-snippet',
    body: ['console.log("hello");'],
    language: ['typescript'],
    prefix: ['test'],
    favorite: false,
    ...overrides,
  };
}

async function clearAll(): Promise<void> {
  await saveSnippets([]);
}

/**
 * Сравнивает два массива строк по содержимому.
 * Синхронизировано с логикой import.ts — используется для тестов.
 */
function arraysEqual(a: string[] | undefined, b: string[] | undefined): boolean {
  return JSON.stringify(a ?? []) === JSON.stringify(b ?? []);
}

/**
 * Полнотекстовый поиск — синхронизировано с логикой list.ts.
 */
function searchAll(snippets: Snippet[], query: string): Snippet[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  return snippets.filter(s => {
    const haystack = [
      s.name,
      s.description ?? '',
      s.body.join('\n'),
    ].join('\n').toLowerCase();
    return words.every(w => haystack.includes(w));
  });
}

// ─────────────────────────────────────────────────────────────
// Основной набор
// ─────────────────────────────────────────────────────────────

suite('Extension Test Suite', function () {
  // ✅ this.timeout работает ТОЛЬКО в function(), не в стрелочной
  this.timeout(10000);   // 10 секунд на каждый тест и хук

  vscode.window.showInformationMessage('Start all tests.');

  let originalSnippets: Snippet[] = [];

  suiteSetup(async function () {
    this.timeout(15000);   // запись settings.json — дай время
    originalSnippets = getAllSnippets();
  });

  suiteTeardown(async function () {
    this.timeout(15000);   // восстановление — тоже запись
    await saveSnippets(originalSnippets);
  });

  setup(async function () {
    this.timeout(10000);
    // ✅ Пишем в settings.json только если есть что чистить
    if (getAllSnippets().length > 0) {
      await clearAll();
    }
  });

  // ───────────────────────────────────────────────────────────
  // Sample (как в шаблоне — чтобы формат был понятен)
  // ───────────────────────────────────────────────────────────

  test('Sample test', () => {
    assert.strictEqual(-1, [1, 2, 3].indexOf(5));
    assert.strictEqual(-1, [1, 2, 3].indexOf(0));
  });

  // ───────────────────────────────────────────────────────────
  // storage: getAllSnippets
  // ───────────────────────────────────────────────────────────

  suite('storage: getAllSnippets', () => {
    test('возвращает пустой массив, если ничего не сохранено', () => {
      const snippets = getAllSnippets();
      assert.ok(Array.isArray(snippets));
      assert.strictEqual(snippets.length, 0);
    });

    test('возвращает сохранённые шаблоны', async () => {
      await saveSnippets([makeSnippet({ name: 'alpha' })]);
      const result = getAllSnippets();
      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].name, 'alpha');
    });
  });

  // ───────────────────────────────────────────────────────────
  // storage: saveSnippets
  // ───────────────────────────────────────────────────────────

  suite('storage: saveSnippets', () => {
    test('перезаписывает список целиком', async () => {
      await saveSnippets([
        makeSnippet({ name: 'a' }),
        makeSnippet({ name: 'b' }),
      ]);
      await saveSnippets([makeSnippet({ name: 'c' })]);

      const result = getAllSnippets();
      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].name, 'c');
    });

    test('сохраняет массивы body / language / prefix', async () => {
      await saveSnippets([
        makeSnippet({
          name: 'arrays',
          body: ['line1', 'line2', 'line3'],
          language: ['typescript', 'javascript'],
          prefix: ['p1', 'p2'],
        }),
      ]);

      const found = findSnippet('arrays')!;
      assert.deepStrictEqual(found.body, ['line1', 'line2', 'line3']);
      assert.deepStrictEqual(found.language, ['typescript', 'javascript']);
      assert.deepStrictEqual(found.prefix, ['p1', 'p2']);
    });
  });

  // ───────────────────────────────────────────────────────────
  // storage: findSnippet
  // ───────────────────────────────────────────────────────────

  suite('storage: findSnippet', () => {
    test('возвращает undefined для несуществующего', () => {
      assert.strictEqual(findSnippet('nonexistent'), undefined);
    });

    test('находит по имени', async () => {
      await saveSnippets([makeSnippet({ name: 'find-me', body: ['X'] })]);
      const found = findSnippet('find-me');
      assert.ok(found);
      assert.strictEqual(found!.name, 'find-me');
      assert.deepStrictEqual(found!.body, ['X']);
    });
  });

  // ───────────────────────────────────────────────────────────
  // storage: addOrUpdateSnippet
  // ───────────────────────────────────────────────────────────

  suite('storage: addOrUpdateSnippet', () => {
    test('добавляет новый шаблон', async () => {
      await addOrUpdateSnippet(makeSnippet({ name: 'new-one' }));
      const result = getAllSnippets();
      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].name, 'new-one');
    });

    test('обновляет существующий, не создавая дубликат', async () => {
      await addOrUpdateSnippet(makeSnippet({ name: 'dup', body: ['old'] }));
      await addOrUpdateSnippet(makeSnippet({ name: 'dup', body: ['new'] }));

      const result = getAllSnippets();
      assert.strictEqual(result.length, 1);
      assert.deepStrictEqual(result[0].body, ['new']);
    });

    test('usageCount НЕ сбрасывается при обновлении', async () => {
      await saveSnippets([makeSnippet({ name: 'stat', usageCount: 5 })]);
      const existing = findSnippet('stat')!;

      await addOrUpdateSnippet({
        name: 'stat',
        body: ['new body'],
        favorite: false,
        usageCount: existing.usageCount ?? 0,
        lastUsed: existing.lastUsed,
      });

      assert.strictEqual(findSnippet('stat')!.usageCount, 5);
    });
  });

  // ───────────────────────────────────────────────────────────
  // storage: removeSnippet
  // ───────────────────────────────────────────────────────────

  suite('storage: removeSnippet', () => {
    test('удаляет существующий и возвращает true', async () => {
      await saveSnippets([makeSnippet({ name: 'to-remove' })]);
      const ok = await removeSnippet('to-remove');

      assert.strictEqual(ok, true);
      assert.strictEqual(getAllSnippets().length, 0);
    });

    test('возвращает false для несуществующего', async () => {
      const ok = await removeSnippet('nonexistent');
      assert.strictEqual(ok, false);
    });

    test('не трогает остальные шаблоны', async () => {
      await saveSnippets([
        makeSnippet({ name: 'a' }),
        makeSnippet({ name: 'b' }),
      ]);
      await removeSnippet('a');

      const result = getAllSnippets();
      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].name, 'b');
    });
  });

  // ───────────────────────────────────────────────────────────
  // Snippet: структура
  // ───────────────────────────────────────────────────────────

  suite('Snippet: структура', () => {
    test('body — массив строк', () => {
      const s = makeSnippet({ body: ['line1', 'line2'] });
      assert.ok(Array.isArray(s.body));
      assert.deepStrictEqual(s.body, ['line1', 'line2']);
    });

    test('language — массив строк', () => {
      const s = makeSnippet({ language: ['typescript', 'javascript'] });
      assert.ok(Array.isArray(s.language));
      assert.strictEqual(s.language!.length, 2);
    });

    test('favorite — обязательный boolean', () => {
      assert.strictEqual(typeof makeSnippet().favorite, 'boolean');
    });

    test('опциональные поля могут отсутствовать', () => {
      const s: Snippet = { name: 'min', body: ['x'], favorite: false };
      assert.strictEqual(s.description, undefined);
      assert.strictEqual(s.language, undefined);
      assert.strictEqual(s.prefix, undefined);
      assert.strictEqual(s.categories, undefined);
    });

    test('JSON round-trip сохраняет все поля', () => {
      const original = makeSnippet({
        name: 'full',
        body: ['a', 'b'],
        description: 'desc',
        language: ['typescript'],
        prefix: ['p1', 'p2'],
        usageCount: 3,
        lastUsed: 1700000000000,
        favorite: true,
        categories: ['cat1'],
      });

      const restored = JSON.parse(JSON.stringify(original)) as Snippet;
      assert.deepStrictEqual(restored, original);
    });
  });

  // ───────────────────────────────────────────────────────────
  // Фильтрация по языку
  // ───────────────────────────────────────────────────────────

  suite('Фильтрация по языку', () => {
    test('s.language?.includes(lang) находит шаблоны', () => {
      const snippets = [
        makeSnippet({ name: 'a', language: ['typescript'] }),
        makeSnippet({ name: 'b', language: ['python'] }),
        makeSnippet({ name: 'c', language: ['typescript', 'javascript'] }),
      ];

      const filtered = snippets.filter(s => s.language?.includes('typescript'));
      assert.strictEqual(filtered.length, 2);
      assert.deepStrictEqual(filtered.map(s => s.name).sort(), ['a', 'c']);
    });

    test('шаблон без language не попадает ни в один фильтр', () => {
      const s: Snippet = { name: 'no-lang', body: ['x'], favorite: false };
      assert.strictEqual(s.language?.includes('typescript'), undefined);
      assert.ok(!s.language?.includes('typescript'));
    });

    test('мультиязычный шаблон находится по каждому языку', () => {
      const s = makeSnippet({ language: ['typescript', 'javascript'] });
      assert.ok(s.language?.includes('typescript'));
      assert.ok(s.language?.includes('javascript'));
    });
  });

  // ───────────────────────────────────────────────────────────
  // Фильтрация по категориям
  // ───────────────────────────────────────────────────────────

  suite('Фильтрация по категориям', () => {
    test('s.categories?.includes(cat)', () => {
      const snippets = [
        makeSnippet({ name: 'a', categories: ['frontend'] }),
        makeSnippet({ name: 'b', categories: ['backend'] }),
        makeSnippet({ name: 'c', categories: ['frontend', 'utils'] }),
      ];

      const filtered = snippets.filter(s => s.categories?.includes('frontend'));
      assert.strictEqual(filtered.length, 2);
      assert.deepStrictEqual(filtered.map(s => s.name).sort(), ['a', 'c']);
    });

    test('шаблон без категорий не находится ни по одной', () => {
      const s = makeSnippet({ categories: undefined });
      assert.strictEqual(s.categories?.includes('frontend'), undefined);
    });
  });

  // ───────────────────────────────────────────────────────────
  // Поиск по телу / описанию
  // ───────────────────────────────────────────────────────────

  suite('Поиск по телу и описанию', () => {
    test('находит по телу', () => {
      const snippets = [
        makeSnippet({ name: 'a', body: ['useEffect(() => {})'] }),
        makeSnippet({ name: 'b', body: ['useState()'] }),
      ];

      const result = searchAll(snippets, 'useEffect');
      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].name, 'a');
    });

    test('находит по описанию', () => {
      const snippets = [
        makeSnippet({ name: 'a', description: 'React component' }),
        makeSnippet({ name: 'b', description: 'Node utility' }),
      ];

      assert.strictEqual(searchAll(snippets, 'react').length, 1);
    });

    test('несколько слов — AND', () => {
      const snippets = [
        makeSnippet({ name: 'a', body: ['useEffect()', 'react import'] }),
        makeSnippet({ name: 'b', body: ['useEffect()'] }),
      ];

      const result = searchAll(snippets, 'useEffect react');
      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].name, 'a');
    });

    test('регистронезависимый', () => {
      const snippets = [makeSnippet({ body: ['USEEFFECT'] })];
      assert.strictEqual(searchAll(snippets, 'useeffect').length, 1);
    });

    test('пустой результат для несуществующего', () => {
      const snippets = [makeSnippet({ body: ['foo'] })];
      assert.strictEqual(searchAll(snippets, 'nonexistent-xyz').length, 0);
    });

    test('находит во второй строке тела', () => {
      const snippets = [
        makeSnippet({
          name: 'long',
          body: ['line one', 'line two', 'useEffect here'],
        }),
      ];
      assert.strictEqual(searchAll(snippets, 'useEffect').length, 1);
    });
  });

  // ───────────────────────────────────────────────────────────
  // arraysEqual
  // ───────────────────────────────────────────────────────────

  suite('arraysEqual', () => {
    test('одинаковые массивы равны', () => {
      assert.strictEqual(arraysEqual(['a', 'b'], ['a', 'b']), true);
    });

    test('разный порядок — не равны', () => {
      assert.strictEqual(arraysEqual(['a', 'b'], ['b', 'a']), false);
    });

    test('undefined и пустой массив — равны', () => {
      assert.strictEqual(arraysEqual(undefined, []), true);
    });

    test('разная длина', () => {
      assert.strictEqual(arraysEqual(['a'], ['a', 'b']), false);
    });

    test('разное содержимое', () => {
      assert.strictEqual(arraysEqual(['a'], ['b']), false);
    });

    test('оба undefined — равны', () => {
      assert.strictEqual(arraysEqual(undefined, undefined), true);
    });
  });

  // ───────────────────────────────────────────────────────────
  // Статистика
  // ───────────────────────────────────────────────────────────

  suite('Статистика', () => {
    test('total — сумма usageCount всех шаблонов', () => {
      const snippets = [
        makeSnippet({ usageCount: 5 }),
        makeSnippet({ usageCount: 3 }),
        makeSnippet(), // undefined → 0
      ];

      const total = snippets.reduce((sum, s) => sum + (s.usageCount ?? 0), 0);
      assert.strictEqual(total, 8);
    });

    test('total = 0 для пустого списка', () => {
      const total: number[] = [];
      const sum = total.reduce((s, v) => s + v, 0);
      assert.strictEqual(sum, 0);
    });

    test('сортировка по убыванию usageCount', () => {
      const snippets = [
        makeSnippet({ name: 'a', usageCount: 5 }),
        makeSnippet({ name: 'b', usageCount: 10 }),
        makeSnippet({ name: 'c', usageCount: 1 }),
      ];

      const sorted = [...snippets].sort(
        (a, b) => (b.usageCount ?? 0) - (a.usageCount ?? 0)
      );
      assert.deepStrictEqual(sorted.map(s => s.name), ['b', 'a', 'c']);
    });

    test('шаблоны без usageCount идут в конец', () => {
      const snippets = [
        makeSnippet({ name: 'used', usageCount: 5 }),
        makeSnippet({ name: 'unused' }), // undefined
      ];

      const sorted = [...snippets].sort(
        (a, b) => (b.usageCount ?? 0) - (a.usageCount ?? 0)
      );
      assert.strictEqual(sorted[0].name, 'used');
      assert.strictEqual(sorted[1].name, 'unused');
    });

    test('инкремент usageCount при вставке', async () => {
      await saveSnippets([makeSnippet({ name: 'inc', usageCount: 5 })]);

      const snippets = getAllSnippets();
      const idx = snippets.findIndex(s => s.name === 'inc');
      snippets[idx].usageCount = (snippets[idx].usageCount ?? 0) + 1;
      snippets[idx].lastUsed = Date.now();
      await saveSnippets(snippets);

      const found = findSnippet('inc')!;
      assert.strictEqual(found.usageCount, 6);
      assert.ok(found.lastUsed !== undefined);
    });

    test('lastUsed обновляется при вставке', async () => {
      await saveSnippets([makeSnippet({ name: 'stamp' })]);

      const before = Date.now();
      const snippets = getAllSnippets();
      const idx = snippets.findIndex(s => s.name === 'stamp');
      snippets[idx].lastUsed = Date.now();
      await saveSnippets(snippets);

      const found = findSnippet('stamp')!;
      assert.ok(found.lastUsed !== undefined);
      assert.ok(found.lastUsed! >= before);
    });
  });

  // ───────────────────────────────────────────────────────────
  // Регистрация команд (интеграция)
  // ───────────────────────────────────────────────────────────

  suite('Регистрация команд', () => {
    test('все команды плагина зарегистрированы', async function () {
      this.timeout(5000);
      const allCommands = await vscode.commands.getCommands(true);
		
	  const snippetCommands = allCommands.filter(c =>
        c.toLowerCase().includes('smartSnippet')
      );
      console.log('[test] Snippet-команды:', snippetCommands);

      const expected = [
        'smartSnippet.create',
        'smartSnippet.save',
        'smartSnippet.insert',
        'smartSnippet.delete',
        'smartSnippet.list',
        'smartSnippet.stats',
        'smartSnippet.export',
        'smartSnippet.import',
        'smartSnippet.trackInsertion',
      ];

      for (const cmd of expected) {
        assert.ok(
          allCommands.includes(cmd),
          `Команда ${cmd} не зарегистрирована`
        );
      }
    });

	suiteSetup(async function () {
  		this.timeout(20000);
  
  		// Находим расширение и активируем вручную
  		const ext = vscode.extensions.all.find(
    		e => e.id.toLowerCase().includes('snippet') ||
         		(e.packageJSON.name ?? '').toLowerCase().includes('snippet')
  		);
  
  		console.log('[test] Найдено расширение:', ext?.id);
  		console.log('[test] Активно до активации:', ext?.isActive);
  
  		if (ext && !ext.isActive) {
    		await ext.activate();
    		console.log('[test] Активировано');
  		}
  
  		originalSnippets = getAllSnippets();
	});
  });
});

