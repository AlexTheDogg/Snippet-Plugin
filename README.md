# Smart Snippet Inserter

> Менеджер пользовательских шаблонов кода для Visual Studio Code: создание, вставка с динамическими параметрами, категории, избранное, статистика, импорт/экспорт и интеграция со стандартным автодополнением.

**Автор:** Мясников Александр, группа М3108
**Репозиторий:** https://github.com/AlexTheDogg/Snippet-Plugin  

---

## 📋 Содержание

- [Возможности](#-возможности)
- [Установка](#-установка)
- [Команды и горячие клавиши](#-команды-и-горячие-клавиши)
- [Динамические параметры](#-динамические-параметры)
- [Настройки](#-настройки)
- [Примеры использования](#-примеры-использования)
- [Архитектура](#-архитектура)
- [Разработка](#-разработка)

---

## ✨ Возможности

### Создание и редактирование
- **QuickPick-визард** — пошаговое создание шаблона: имя, описание, языки, префиксы, избранное, категории, тело
- **Создание из выделения** — выдели код → `Ctrl+Alt+N` → тело и язык подставятся автоматически
- **Редактирование метаданных** — каждое поле меняется отдельным диалогом с возвратом в главное меню
- **Многострочное тело** — редактируется в стандартном редакторе VS Code с подсветкой синтаксиса

### Вставка
- **Живой предпросмотр** — при навигации по списку тело временно вставляется в редактор, чтобы видеть результат в контексте
- **Динамические параметры** — поддержка `${1}`, `${2}`, `$0` (табуляция как у встроенных сниппетов)
- **Автодополнение по префиксу** — шаблоны появляются в стандартном IntelliSense наравне со встроенными сниппетами
- **Статистика** — каждый путь вставки инкрементирует `usageCount` и обновляет `lastUsed`

### Организация
- **Категории** — пользовательские группы («Frontend», «Backend», «Utils»), выводимые из шаблонов
- **Избранное** — флаг `favorite` с приоритетом в списках и отдельным фильтром
- **Мультиязычность** — один шаблон может быть привязан к нескольким языкам
- **Фильтрация** — по языку, категории, избранному, популярности (топ-5)
- **Поиск** — по имени, описанию и **полному** телу

### Данные
- **Хранение в `settings.json`** — видно, редактируется руками, синхронизируется через Settings Sync
- **Импорт/экспорт JSON** — с валидацией структуры, обработкой конфликтов и защитой от перезаписи
- **Совместимость с `.json`** — можно импортировать файлы стандартных сниппетов VS Code
- **Статистика** — сводка и сортировка по количеству использований

---

## 📦 Установка

### Из GitHub (вручную)

```bash
git clone https://github.com/AlexTheDogg/Snippet-Plugin.git
cd Snippet-Plugin
npm install
npm run compile
```

Затем нажмите `F5` в VS Code — откроется **Extension Development Host** с установленным расширением.

### Сборка `.vsix` для распространения

```bash
npm install -g @vscode/vsce
vsce package
```

Получится файл `my-first-extension-0.0.1.vsix`, который устанавливается через:

- VS Code → расширения → `...` → **Install from VSIX**
- Или: `code --install-extension my-first-extension-0.0.1.vsix`

---

## 🎮 Команды и горячие клавиши

| Команда | Клавиша (Win/Linux) | macOS | Описание |
|---|---|---|---|
| `smartSnippet.create` | `Ctrl+Alt+N` | `Cmd+Alt+N` | Создать шаблон (с захватом выделения) |
| `smartSnippet.insert` | `Ctrl+Shift+I` | `Cmd+Shift+I` | Вставить шаблон с живым предпросмотром |
| `smartSnippet.delete` | `Ctrl+Alt+D` | `Cmd+Alt+D` | Удалить шаблон с подтверждением |
| `smartSnippet.save` | `Ctrl+Alt+S` | `Cmd+Alt+S` | Сохранить тело из temp-документа |
| `smartSnippet.import` | `Ctrl+Alt+M` | `Cmd+Alt+M` | Импорт из JSON  |
| `smartSnippet.list` |`Ctrl+Alt+X` | `Ctrl+Alt+X`| Список с фильтрацией и поиском |
| `smartSnippet.stats` | `Ctrl+Shift+S` | `Ctrl+Shift+S` | Статистика использования |
| `smartSnippet.export` | `Ctrl+Alt+E` | `Ctrl+Alt+E` | Экспорт шаблонов в JSON |

Все команды доступны через **`Ctrl+Shift+P`** → введите `Snippet`.

Комбинации можно переназначить: `File → Preferences → Keyboard Shortcuts` → поиск `smartSnippet`.

---

## 🔤 Динамические параметры

Тело шаблона поддерживает **синтаксис сниппетов VS Code**.

### Позиции табуляции

| Синтаксис | Что делает |
|---|---|
| `${1:default}` | Позиция с подстановкой `default` |
| `${2:params}` | Следующая позиция (`Tab` переключает) |
| `${3}` | Позиция без подстановки |
| `$0` | **Финальная** позиция (после последнего `Tab`) |

**Пример тела:**

```typescript
function ${1:name}(${2:params}) {
  ${0:// body}
}
```

**При вставке:**
1. Курсор встаёт на `name` (выделен)
2. Печатаешь имя → `Tab` → на `params`
3. `Tab` → на тело
4. `Shift+Tab` — назад

### Зеркальные позиции

Одинаковый `${1}` можно использовать несколько раз — редактирование одного меняет остальные:

```typescript
const ${1:variable} = ${1:variable} ?? defaultValue;
```
---

## ⚙️ Настройки

### `smartSnippet.snippets`

Массив шаблонов. Обычно редактируется через команды, но можно менять руками в `settings.json`.

**Полный пример:**

```json
"smartSnippet.snippets": [
  {
    "name": "react-fc",
    "description": "Функциональный React-компонент",
    "language": ["typescript", "typescriptreact"],
    "prefix": ["rfc", "component"],
    "body": [
      "import React from 'react';",
      "",
      "interface ${1:Props} {}",
      "",
      "export const ${2:Component}: React.FC<${1:Props}> = (props) => {",
      "  return <div>${0}</div>;",
      "};"
    ],
    "usageCount": 12,
    "lastUsed": 1700000000000,
    "favorite": true,
    "categories": ["Frontend", "React"]
  },
  {
    "name": "try-catch",
    "body": [
      "try {",
      "  ${0}",
      "} catch (e) {",
      "  console.error(e);",
      "}"
    ],
    "favorite": false
  }
]
```

**Поля:**

| Поле | Тип | Обязательно | Описание |
|---|---|---|---|
| `name` | `string` | ✅ | Уникальный идентификатор |
| `body` | `string[]` | ✅ | Тело шаблона построчно |
| `favorite` | `boolean` | ✅ | Флаг «Избранное» |
| `description` | `string` | — | Краткое описание |
| `language` | `string[]` | — | `languageId` VS Code (см. [список](https://code.visualstudio.com/docs/languages/identifiers)) |
| `prefix` | `string[]` | — | Триггеры для автодополнения |
| `usageCount` | `number` | — | Сколько раз вставлен |
| `lastUsed` | `number` | — | Timestamp последней вставки |
| `categories` | `string[]` | — | Пользовательские категории |

**Как открыть `settings.json`:** `Ctrl+Shift+P` → **Preferences: Open User Settings (JSON)**.

---

## 📖 Примеры использования

### 1. Создать шаблон из выделенного кода

1. Выдели фрагмент в `.ts` файле:
   ```typescript
   function foo(a, b) {
     return a + b;
   }
   ```
2. `Ctrl+Alt+N` → введи имя `add-func` → Enter
3. Откроется **QuickPick-визард** — тело уже заполнено из выделения
4. Проверь поля (описание, префиксы, категории) или **«Сохранить»** сразу
5. Шаблон доступен через `Ctrl+Alt+I` и через автодополнение

### 2. Вставить с динамическими параметрами

1. Создай шаблон `react-fc` с телом из примера выше
2. В `.tsx` файле набери `rfc` → в автодополнении появится `react-fc`
3. **Enter** → тело вставляется, курсор на `${1:Props}`
4. Напечатай `UserProps` → `Tab` → на `${2:Component}` → `Tab` → на `${0}`
5. Вставка засчитана в статистике автоматически

### 3. Живой предпросмотр

1. `Ctrl+Alt+I` (без выделения)
2. Выбери фильтр → второй QuickPick со списком
3. **Стрелки вверх/вниз** → тело шаблона временно вставляется в **редактор** (с подсветкой, с учётом indent'а текущей строки)
4. **Enter** — подтверждение, реальная вставка
5. **Esc** — откат, редактор возвращается к исходному состоянию

### 4. Организация через категории

1. При создании шаблона выбери **«Категории»** → «Создать новую» → введи `Frontend`
2. Создай ещё несколько шаблонов с категорией `Frontend`
3. `Ctrl+Alt+L` → в первом QuickPick появится **`📁 Frontend`**
4. Выбери — увидишь только шаблоны этой категории

### 5. Экспорт и Импорт

**Экспорт:**
1. `Ctrl+Alt+E` → **«Все шаблоны»** или **«Выбрать вручную»**
2. Отметь нужные галочками (`$(check-all)` — выбрать все)
3. Выбери путь для `.json`

**Импорт у коллеги:**
1. `Ctrl+Alt+M` → выбери файл `.json`
2. Плагин покажет: **новых**, **идентичных**, **конфликтов**
3. Выбери стратегию для конфликтов: **«Перезаписать»** или **«Пропустить»**
4. Подтверди финально — показываются числа («заменит 5, всего станет 22»)

---

## 🏗️ Архитектура

### Точки вклада (`package.json`)

```json
"contributes": {
  "commands": [...],        // 8 команд
  "keybindings": [...],     // 8 горячих клавиш
  "configuration": {...}    // smartSnippet.snippets
}
```

### Структура проекта

```
my-first-extension/
├── src/
│   ├── extension.ts             # Активация, регистрация команд
│   ├── types.ts                 # Интерфейс Snippet
│   ├── storage.ts               # CRUD для settings.json
│   ├── snippetProvider.ts       # CompletionItemProvider
│   ├── templateEditor.ts        # QuickPick-визард
│   ├── validation.ts            # Валидация импорта
│   ├── commands/
│   │   ├── create.ts            # Мастер создания
│   │   ├── save.ts              # Сохранение из temp-документа
│   │   ├── insert.ts            # Живой предпросмотр + вставка
│   │   ├── list.ts              # Фильтрация, поиск, редактирование
│   │   ├── delete.ts            # Удаление с подтверждением
│   │   ├── import.ts            # импорт JSON
│   │   ├── stats.ts             # Статистика, сортировка, сброс
│   │   └── export.ts                # экспорт JSON
│   └── test/
├── package.json
├── tsconfig.json
└── README.md
```

### Модули и ответственности

| Модуль | Что делает |
|---|---|
| `storage.ts` | `getAllSnippets`, `saveSnippets`, `findSnippet`, `addOrUpdateSnippet`, `removeSnippet`, `toggleFavorite` |
| `snippetProvider.ts` | `CompletionItemProvider` для автодополнения по префиксу |
| `templateEditor.ts` | QuickPick-визард, `saveTemplate`, `openBodyEditor`, `pendingTemplates` |
| `validation.ts` | `validateSnippetArray`|
| `commands/*.ts` | Каждая команда — отдельный модуль |

### Используемые API VS Code

- **Команды и клавиши:** `commands.registerCommand`, `contributes.commands`, `contributes.keybindings`
- **Хранение:** `workspace.getConfiguration`, `config.update(..., ConfigurationTarget.Global)`
- **Редактор:** `window.activeTextEditor`, `editor.edit`, `editor.insertSnippet`, `SnippetString`
- **Диалоги:** `showInputBox`, `showQuickPick`, `createQuickPick`, `showSaveDialog`, `showOpenDialog`
- **Языки:** `languages.registerCompletionItemProvider`, `languages.getLanguages`
- **События:** `workspace.onDidChangeConfiguration`, `onDidChangeTextDocument`, `onDidCloseTextDocument`
- **Файлы:** `workspace.fs.readFile`, `workspace.fs.writeFile`, `workspace.openTextDocument`
- **Вкладки:** `window.tabGroups.close(tab, true)` — закрытие без диалога
- **Context keys:** `commands.executeCommand('setContext', ...)` — управление видимостью команд

---

## 🛠️ Разработка

### Требования
- **Node.js** ≥ 24.22.1
- **VS Code** ≥ 1.140

### Сборка

```bash
npm install
npm run compile     # одна сборка
npm run watch       # автосборка при изменениях
```

### Отладка

1. Открой проект в VS Code
2. **F5** → откроется **Extension Development Host** (второе окно)
3. В нём — все команды плагина
4. `Ctrl+Shift+I` в первом окне — Developer Tools с логами

---

## 📄 Лицензия

MIT License. Подробнее — в файле [LICENSE](./LICENSE)

---

## 👤 Автор

**Мясников Александр**, группа **М3108**
