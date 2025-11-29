# Календарный виджет

Универсальная система календарных виджетов с поддержкой множественных календарей и тем дизайна.

## Структура проекта

```
/
├── calendar-widget.js          # Основной универсальный скрипт
├── config/
│   ├── calendar-1.json         # Расписание календаря 1
│   ├── calendar-2.json         # Расписание календаря 2
│   └── ...
├── themes/
│   ├── theme-default.css       # Дефолтная тема (зелено-золотая)
│   ├── theme-minimal.css       # Минималистичная тема (светлая)
│   ├── theme-modern.css        # Современная тема (фиолетово-розовая)
│   ├── theme-glamour.css       # Роскошная тема (кораллово-голубая)
│   └── ...
└── README.md                   # Документация
```

## Быстрый старт

### Базовое использование

```html
<script src="calendar-widget.js" 
        data-calendar-id="calendar-1" 
        data-theme="theme-default">
</script>
```

### Использование с GitHub Pages

Если вы используете GitHub Pages, укажите базовый путь:

```html
<script src="https://yourusername.github.io/calendar-widget-axl/calendar-widget.js" 
        data-calendar-id="calendar-1" 
        data-theme="theme-default"
        data-base-path="https://yourusername.github.io/calendar-widget-axl">
</script>
```

## Параметры встраивания

### data-calendar-id
Идентификатор календаря (имя JSON файла без расширения). По умолчанию: `calendar-1`

```html
data-calendar-id="calendar-1"
```

### data-theme
Название темы (имя CSS файла без расширения). По умолчанию: `theme-default`

Доступные темы:
- `theme-default` - зелено-золотая тема (классическая)
- `theme-minimal` - минималистичная светлая тема
- `theme-modern` - современная фиолетово-розовая тема
- `theme-glamour` - роскошная тема (кораллово-голубая с эффектами свечения)

```html
data-theme="theme-minimal"
```

### data-base-path
Базовый путь к файлам конфигурации и тем. Используется для GitHub Pages или других CDN.

```html
data-base-path="https://yourusername.github.io/calendar-widget-axl"
```

## Формат конфигурации календаря

Каждый файл в папке `config/` должен быть в формате JSON:

```json
{
  "metadata": {
    "name": "Название календаря",
    "description": "Описание календаря (опционально)"
  },
  "scheduleDates": [
    {
      "date": "2025-11-24",
      "title": "Название события",
      "color": "#d4af37"
    },
    {
      "date": "2025-12-05",
      "title": "Другое событие",
      "color": "#c9a961"
    }
  ],
  "position": "top-right",
  "pulseSpeed": 2000,
  "maxEvents": 5
}
```

### Поля конфигурации

- **metadata** (опционально): метаданные календаря
  - `name`: название календаря
  - `description`: описание
- **scheduleDates**: массив событий
  - `date`: дата в формате `YYYY-MM-DD`
  - `title`: название события
  - `color`: цвет события в формате HEX (например, `#d4af37`)
- **position**: позиция кнопки виджета (`top-right` или `top-left`). По умолчанию: `top-right`
- **pulseSpeed**: скорость анимации пульсации в миллисекундах. По умолчанию: `2000`
- **maxEvents**: максимальное количество событий в общем списке (когда не выбрана конкретная дата). По умолчанию: `10`

## Создание нового календаря

1. Создайте новый JSON файл в папке `config/`, например `calendar-2.json`
2. Заполните его по формату выше
3. Используйте в HTML:

```html
<script src="calendar-widget.js" 
        data-calendar-id="calendar-2" 
        data-theme="theme-default">
</script>
```

## Создание новой темы

1. Создайте новый CSS файл в папке `themes/`, например `theme-custom.css`
2. Используйте CSS переменные для настройки цветов:

```css
:root {
    --calendar-primary-bg: linear-gradient(135deg, #color1 0%, #color2 100%);
    --calendar-primary-color: #color;
    --calendar-accent-color: #color;
    --calendar-accent-light: #color;
    --calendar-accent-dark: #color;
    --calendar-text-primary: #color;
    --calendar-text-secondary: #color;
    --calendar-text-muted: #color;
    --calendar-overlay-bg: rgba(0, 0, 0, 0.85);
    --calendar-modal-bg: linear-gradient(135deg, #color1 0%, #color2 100%);
    --calendar-border-color: rgba(255, 255, 255, 0.3);
    --calendar-shadow-primary: rgba(0, 0, 0, 0.5);
    --calendar-shadow-accent: rgba(255, 255, 255, 0.3);
}
```

3. Переопределите стили компонентов при необходимости
4. Используйте в HTML:

```html
<script src="calendar-widget.js" 
        data-calendar-id="calendar-1" 
        data-theme="theme-custom">
</script>
```

## Примеры использования

### Пример 1: Базовое использование
```html
<!DOCTYPE html>
<html>
<head>
    <title>Календарь</title>
</head>
<body>
    <h1>Моя страница</h1>
    
    <script src="calendar-widget.js" 
            data-calendar-id="calendar-1" 
            data-theme="theme-default">
    </script>
</body>
</html>
```

### Пример 2: Минималистичная тема
```html
<script src="calendar-widget.js" 
        data-calendar-id="calendar-1" 
        data-theme="theme-minimal">
</script>
```

### Пример 3: Современная тема с другим календарем
```html
<script src="calendar-widget.js" 
        data-calendar-id="calendar-2" 
        data-theme="theme-modern">
</script>
```

### Пример 4: Использование на GitHub Pages
```html
<script src="https://elenakreikpro.github.io/calendar-widget-axl/calendar-widget.js" 
        data-calendar-id="calendar-1" 
        data-theme="theme-default"
        data-base-path="https://elenakreikpro.github.io/calendar-widget-axl">
</script>
```

## Функциональность

- ✅ Календарь с навигацией по месяцам
- ✅ Подсветка дней с событиями
- ✅ Всплывающие подсказки при наведении на события
- ✅ Список предстоящих событий
- ✅ Адаптивный дизайн для мобильных устройств
- ✅ Закрытие по ESC или клику вне модального окна
- ✅ Поддержка множественных календарей
- ✅ Поддержка множественных тем дизайна

## Технические детали

- Чистый JavaScript (без зависимостей)
- Асинхронная загрузка конфигурации через Fetch API
- Динамическая загрузка CSS тем
- Использование CSS переменных для легкой кастомизации
- Поддержка всех современных браузеров

## Лицензия

Свободное использование.
