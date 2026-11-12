import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { logger } from 'hono/logger';
import { zValidator } from '@hono/zod-validator';
import type { ZodType } from 'zod';
import type { Db } from './db/client.js';
import { batchSchema, employeesQuerySchema, rangeSchema } from './lib/validation.js';
import {
  NotFoundError,
  applyBatch,
  listEmployees,
  listShifts,
  listTemplates,
  publishRange,
} from './services/schedule.js';

const validate = <T extends ZodType, Target extends 'json' | 'query'>(target: Target, schema: T) =>
  zValidator(target, schema, (result, c) => {
    if (!result.success) {
      return c.json(
        {
          error: 'validation_error',
          message: result.error.issues[0]?.message ?? 'Некорректные данные',
          issues: result.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
        },
        400,
      );
    }
  });

export function createApi(db: Db) {
  const api = new Hono()
    .get('/health', (c) => c.json({ ok: true }))

    .get('/employees', validate('query', employeesQuerySchema), async (c) => {
      const { search } = c.req.valid('query');
      return c.json(await listEmployees(db, search));
    })

    .get('/templates', async (c) => c.json(await listTemplates(db)))

    .get('/shifts', validate('query', rangeSchema), async (c) => {
      const { from, to } = c.req.valid('query');
      return c.json(await listShifts(db, from, to));
    })

    .put('/shifts/batch', validate('json', batchSchema), async (c) => {
      return c.json(await applyBatch(db, c.req.valid('json')));
    })

    .post('/schedule/publish', validate('json', rangeSchema), async (c) => {
      const { from, to } = c.req.valid('json');
      return c.json(await publishRange(db, from, to));
    });

  api.onError((err, c) => {
    if (err instanceof NotFoundError) return c.json({ error: 'not_found', message: err.message }, 404);
    if (err instanceof HTTPException) return c.json({ error: 'http_error', message: err.message }, err.status);
    console.error(err);
    return c.json({ error: 'internal_error', message: 'Внутренняя ошибка сервера' }, 500);
  });
  api.notFound((c) => c.json({ error: 'not_found', message: 'Маршрут не найден' }, 404));
  return api;
}

export function createApp(db: Db, opts: { log?: boolean } = {}) {
  const app = new Hono();
  if (opts.log) app.use('/api/*', logger());
  app.route('/api', createApi(db));
  return app;
}

export type Api = ReturnType<typeof createApi>;
