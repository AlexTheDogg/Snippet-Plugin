// Интерфейс для описания шаблона
export interface Snippet {
  name: string; // уникальное имя (ключ в объекте сниппетов)
  description?: string; // описание (необязательно)
  language?: string[]; // массив языков (scope) для которых предназначен шаблон
  prefix?: string[]; // массив префиксов (триггеров) для вставки шаблона
  body: string[]; // тело шаблона
  usageCount?: number; // количество использований
  lastUsed?: number; // дата последнего использования
  favorite: boolean; // избранный шаблон (для фильтрации)
  categories?: string[]; // категории (для фильтрации)
}
