# График смен

Тестовое задание: страница составления графика смен сотрудников по макету.

React + TypeScript, Node.js (Hono), PostgreSQL (Drizzle).

## Запуск

```bash
npm install
npm run dev
```

http://localhost:5173

Если `DATABASE_URL` не задан, используется встроенный Postgres (PGlite), так что ставить ничего не нужно. Таблицы и тестовые данные создаются при старте.

Или в Docker вместе с PostgreSQL:

```bash
docker compose up --build
```

http://localhost:8787

## Тесты

```bash
npm test
```

## Что умеет

- неделя / месяц, переключение периодов, поиск по ФИО;
- быстрое назначение по клику на дату (в свободные ячейки дня или в выделенные);
- назначение через ячейку: выделить, затем шаблон из панели, «+» в ячейке или клавиши 1/2/3;
- своя смена с произвольным временем, в том числе ночная;
- покрытие по дням;
- перетаскивание смен между ячейками и шаблонов на ячейки, работает и на телефоне;
- автосохранение, отмена Ctrl+Z, публикация смен периода.

## API

- `GET /api/employees?search=`
- `GET /api/templates`
- `GET /api/shifts?from=YYYY-MM-DD&to=YYYY-MM-DD`
- `PUT /api/shifts/batch`: `{ upserts: [...], deletes: [...] }`
- `POST /api/schedule/publish`: `{ from, to }`
