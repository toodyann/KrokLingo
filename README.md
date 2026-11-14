# KrokLingo

Вебзастосунок на React + TypeScript, зібраний на Vite.

## Стек

- [React 19](https://react.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vite.dev/)
- [Oxlint](https://oxc.rs/docs/guide/usage/linter) — лінтер

## Вимоги

- Node.js 22.12+ (версія закріплена в `.nvmrc`)
- npm

З nvm:

```bash
nvm install 22.23.5
nvm use 22.23.5
```

## Початок роботи

```bash
npm install
npm run dev
```

Застосунок відкриється на http://localhost:5173.

## Скрипти

| Команда             | Що робить                               |
| ------------------- | --------------------------------------- |
| `npm run dev`       | Дев-сервер з гарячим перезавантаженням  |
| `npm run build`     | Перевірка типів і продакшн-збірка в `dist/` |
| `npm run preview`   | Локальний перегляд продакшн-збірки      |
| `npm run lint`      | Перевірка коду Oxlint                   |
| `npm run lint:fix`  | Автовиправлення того, що можна виправити |
| `npm run typecheck` | Лише перевірка типів TypeScript         |

## Структура

```
├── public/          статичні файли (копіюються як є)
├── src/
│   ├── App.tsx      кореневий компонент
│   ├── main.tsx     точка входу
│   └── index.css    глобальні стилі
├── index.html
└── vite.config.ts
```

## Редактор

Для VS Code рекомендовані розширення (запропонуються автоматично):

- **Oxc** — підсвічування помилок Oxlint
- **EditorConfig** — єдині відступи й закінчення рядків
