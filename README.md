# График смен

Тестовое задание (Fullstack): страница составления графика смен сотрудников по макетам из Figma.

Стек: React + TypeScript (Vite, Zustand), Node.js + Hono, PostgreSQL (Drizzle ORM).

## Запуск

Нужен Node.js 20.19+.

```bash
npm install
npm run dev
```

Фронт: http://localhost:5173, API: http://localhost:8787.

Если `DATABASE_URL` не задан, сервер поднимает встроенный PostgreSQL (PGlite) в `server/.data`, так что для локального запуска ничего ставить не надо. Миграции и тестовые данные (сотрудники и шаблоны из макета) накатываются при старте.

С обычным Postgres через docker:

```bash
docker compose up -d db
```

и в `server/.env`:

```
DATABASE_URL=postgres://shifts:shifts@localhost:5433/shifts
```

Прод-сборка (API и фронт в одном процессе):

```bash
npm run build
npm start
```

Тесты и проверка типов:

```bash
npm test
npm run typecheck
```

## Что сделано

- календарь сотрудники × дни, режимы неделя / месяц, переключение периодов, поиск по ФИО;
- быстрое назначение: клик по дате в шапке открывает меню с шаблонами. Если в этом дне есть выделенные ячейки, смена ставится им, иначе всем сотрудникам из списка;
- назначение через ячейку: выделяем ячейки (клик или протянуть мышью), дальше «+» в ячейке, карточка шаблона справа, «Применить шаблон» в панели выделения или клавиши 1/2/3;
- своя смена: выделить ячейки, указать начало и конец, «Поставить в выделенные». Ночные смены (например 22:00-06:00) тоже работают;
- покрытие по дням: красное, если смен нет, голубое, если есть хотя бы одна;
- drag-and-drop: смену можно перетащить в другую ячейку (с Ctrl копируется), шаблон можно перетащить из панели на ячейку. Сделано на pointer events, поэтому работает и на телефоне;
- редактирование: «Изменить» или двойной клик по смене, «Очистить» / Delete, отмена Ctrl+Z;
- изменения копятся локально и сохраняются кнопкой «Сохранить» (или Ctrl+S) одним запросом, «Опубликовать» публикует смены текущего периода;
- адаптив: на ноутбуках меню сворачивается, на планшете панель шаблонов уходит наверх, на телефоне меню открывается по кнопке, а панель выделения прижата к низу.

## API

- `GET /api/employees?search=`: сотрудники
- `GET /api/templates`: шаблоны смен
- `GET /api/shifts?from=YYYY-MM-DD&to=YYYY-MM-DD`: смены за период
- `PUT /api/shifts/batch`: `{ upserts: [{ employeeId, date, startTime, endTime, templateId }], deletes: [{ employeeId, date }] }`
- `POST /api/schedule/publish`: `{ from, to }`

На одного сотрудника в день хранится одна смена. `templateId: null` означает свою смену.

## Деплой на alwaysdata

1. В панели создать базу PostgreSQL (Databases → PostgreSQL) и в Environment выбрать Node.js 22.
2. Зайти по ssh и собрать проект:
   ```bash
   ssh <account>@ssh-<account>.alwaysdata.net
   git clone https://github.com/<user>/<repo>.git shift-schedule
   cd shift-schedule
   npm ci
   npm run build
   ```
3. Web → Sites → добавить сайт типа Node.js:
   - command: `node server/dist/index.js`
   - working directory: `shift-schedule`
   - environment: `DATABASE_URL=postgresql://<user>:<password>@postgresql-<account>.alwaysdata.net:5432/<db>`
4. Перезапустить сайт. Порт alwaysdata передаёт сам, таблицы и данные создадутся при первом запуске.
