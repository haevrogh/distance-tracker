# Трекер Дистанции — Инструкции для разработки

## Обзор

PWA для отслеживания пешеходной дистанции. Vanilla JS + Vite + Dexie (IndexedDB). Интерфейс на русском языке. Дизайн — iOS-стиль (Apple HIG).

## Команды

```bash
npm run dev       # Дев-сервер (Vite)
npm run build     # Билд → docs/ (GitHub Pages)
npm run preview   # Превью продакшн-билда
```

**КРИТИЧНО**: `docs/` — output directory для GitHub Pages. После КАЖДОГО изменения кода:
1. `npm run build` — пересобрать
2. Коммитить `docs/` вместе с исходниками

## Архитектура

### Структура проекта
```
src/
  main.js              — Точка входа, регистрация роутов
  router.js            — Hash-роутер (#/path?key=value)
  store.js             — Event emitter (subscribe/emit)
  db.js                — Dexie: entries, measurements, settings
  components/          — Переиспользуемые компоненты
    App.js             — Корневой компонент (screen-container + TabBar)
    TabBar.js          — Нижняя навигация (стили внутри компонента)
    WheelPicker.js     — 3D iOS wheel picker
    ProgressRing.js    — SVG-кольцо прогресса
    InstallPrompt.js   — PWA промпт установки
  screens/             — Экраны приложения
    Dashboard.js       — Главная с прогрессом недели
    AddEntry.js        — Добавление/редактирование записи
    History.js         — История записей
    Charts.js          — Графики (Chart.js)
    Settings.js        — Настройки и замеры тела
  styles/
    base.css           — Дизайн-токены (CSS переменные) и ресеты
    components.css     — Стили компонентов
    screens.css        — Стили экранов
    celebrations.css   — Анимации достижений
  utils/
    calculations.js    — Расчёт калорий, рекомендации
    celebrations.js    — Логика празднований
    date.js            — Утилиты дат (today, getWeekStart, etc.)
    export.js          — Экспорт данных
```

### Screen-паттерн
Каждый экран экспортирует:
- `render(params)` — возвращает HTML-строку
- `mount(container, params)` — навешивает обработчики, возвращает cleanup-функцию

```js
export function render(params) {
  return `<div class="screen">...</div>`;
}

export function mount(container, params) {
  // Привязать события
  return () => { /* cleanup */ };
}
```

### Store (события)
```js
import { subscribe, emit } from '../store.js';
// События: 'entries-changed', 'settings-changed', 'measurements-changed'
const unsub = subscribe('entries-changed', () => { /* обновить UI */ });
emit('entries-changed');
```

### База данных (Dexie)
```js
import { addEntry, getSetting, setSetting } from '../db.js';
// Таблицы: entries (id, date, distance, calories, note, createdAt)
//           measurements (id, date, weight, waist, hips)
//           settings (key, value)
```

### Роутер
```js
import { navigate } from '../router.js';
navigate('/add');          // Переход
navigate('/add?id=5');     // С параметрами
```

Роуты: `/` (Dashboard), `/add` (AddEntry), `/history` (History), `/charts` (Charts), `/settings` (Settings)

## Дизайн-система

### Цвета (CSS переменные из base.css)
| Переменная | Значение | Назначение |
|---|---|---|
| `--color-primary` | `#007AFF` | Основной акцент (iOS blue) |
| `--color-primary-light` | `#409CFF` | Светлый акцент |
| `--color-success` | `#34C759` | Успех |
| `--color-success-light` | `#A8E6CF` | Светлый успех |
| `--color-warning` | `#FF9500` | Предупреждение |
| `--color-danger` | `#FF3B30` | Опасность/удаление |
| `--color-gold` | `#FFD700` | Достижения |
| `--color-bg` | `#F2F2F7` | Фон приложения |
| `--color-card` | `#FFFFFF` | Фон карточек |
| `--color-text` | `#1C1C1E` | Основной текст |
| `--color-text-secondary` | `#8E8E93` | Вторичный текст |
| `--color-text-tertiary` | `#AEAEB2` | Третичный текст |
| `--color-separator` | `rgba(60, 60, 67, 0.12)` | Разделители (0.5px) |
| `--color-fill` | `rgba(120, 120, 128, 0.08)` | Заливка фона |

### Размеры
| Переменная | Значение |
|---|---|
| `--radius-sm` | `8px` |
| `--radius-md` | `12px` |
| `--radius-lg` | `16px` |
| `--radius-xl` | `20px` |
| `--radius-full` | `9999px` |
| `--shadow-sm` | `0 1px 3px rgba(0,0,0,0.06)` |
| `--shadow-md` | `0 2px 12px rgba(0,0,0,0.08)` |
| `--shadow-lg` | `0 8px 32px rgba(0,0,0,0.12)` |
| `--tab-bar-height` | `83px` |
| `--header-height` | `44px` |

### Типографика
- Шрифт: `-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', system-ui, sans-serif`
- Базовый размер: `17px`, line-height: `1.4`
- Всё как в iOS: заголовки 28px bold, подзаголовки 22px semibold, body 17px

### iOS-принципы дизайна
- **Touch targets**: минимум 44px (стандарт Apple HIG)
- **Separators**: `0.5px solid var(--color-separator)` (hairline)
- **Safe areas**: `env(safe-area-inset-*)` через CSS переменные
- **Backdrop blur**: `backdrop-filter: blur(20px)` на навигации
- **Haptic feedback**: `navigator.vibrate()` на интеракциях

## UI-компоненты

### Карточки
```html
<div class="card">
  <div class="list-group">
    <div class="list-item">
      <div class="list-item-label">Метка</div>
      <div class="list-item-value">Значение</div>
    </div>
  </div>
</div>
```

### Кнопки
```html
<button class="btn btn-primary btn-block">Основная</button>
<button class="btn btn-danger btn-block">Удалить</button>
```

### Input rows (для Settings)
```html
<div class="input-row input-row-tappable">
  <label>Метка</label>
  <span class="input-row-value">70.0 кг</span>
  <span class="input-row-chevron"></span>
</div>
```

### WheelPicker (3D-барабан)
```js
import { showPicker } from '../components/WheelPicker.js';
// Типы: 'distance', 'weight', 'waist', 'hips', 'goal'
showPicker('distance', currentValue, (newValue) => {
  // newValue: число с одним знаком после запятой
});
```
Реализация: CSS 3D transforms (`perspective: 1000px`, `transform-style: preserve-3d`, `rotateX()` + `translateZ()`) для нативного iOS UIPickerView эффекта.

### Bottom Sheet (Action Sheet)
```html
<div class="action-sheet-overlay">
  <div class="action-sheet">
    <div class="action-sheet-group">
      <div class="action-sheet-title">Заголовок</div>
      <button class="action-sheet-btn danger">Действие</button>
    </div>
    <div class="action-sheet-group">
      <button class="action-sheet-btn action-sheet-cancel">Отмена</button>
    </div>
  </div>
</div>
```

### Segment Control (для Charts)
```html
<div class="segment-control">
  <button class="segment-btn active">Неделя</button>
  <button class="segment-btn">Месяц</button>
  <button class="segment-btn">3 месяца</button>
</div>
```

## Правила кода

1. **Vanilla JS** — никаких фреймворков, никакого TypeScript
2. **ES modules** — `import/export`, `type: "module"` в package.json
3. **Функциональный подход** — нет классов, только функции
4. **DOM через createElement** — компоненты создают DOM императивно (не template literals для интерактивных элементов)
5. **Event delegation** — навешивать обработчик на родителя, искать через `e.target.closest()`
6. **Cleanup** — `mount()` возвращает функцию очистки, убирать все listeners
7. **Haptic feedback** — `navigator.vibrate(1)` light, `navigator.vibrate(3)` medium, `navigator.vibrate([1, 10, 1])` rigid
8. **Mobile-first** — touch events с `{ passive: false }`, `touch-action: none` для модалок
9. **Viewport lock** — при открытии модалок: `body.style.position = 'fixed'` + `top: -scrollY`
10. **Inline SVG иконки** — используем Feather-style SVG прямо в коде, не внешние файлы
