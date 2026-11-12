import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { createApp } from './app.js';
import { createDb } from './db/client.js';
import { seedIfEmpty } from './db/seed.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const CLIENT_DIST = path.resolve(process.env.CLIENT_DIST ?? path.join(here, '../../client/dist'));

const handle = await createDb();
await handle.migrate();
if (process.env.SEED_ON_EMPTY !== 'false' && (await seedIfEmpty(handle.db))) {
  console.log('Empty database: demo employees and templates inserted');
}

const app = createApp(handle.db, { log: process.env.NODE_ENV !== 'test' });

// в проде отдаём собранный фронт этим же процессом
if (fs.existsSync(path.join(CLIENT_DIST, 'index.html'))) {
  const root = path.relative(process.cwd(), CLIENT_DIST) || '.';
  app.use('/*', serveStatic({ root }));
  const indexHtml = fs.readFileSync(path.join(CLIENT_DIST, 'index.html'), 'utf8');
  app.get('*', (c) => c.html(indexHtml)); // SPA fallback
}

const port = Number(process.env.PORT ?? 8787);
const hostname = process.env.IP ?? process.env.HOST ?? '0.0.0.0';
const server = serve({ fetch: app.fetch, port, hostname }, (info) => {
  console.log(`Server: http://localhost:${info.port} (db: ${handle.kind})`);
});

const shutdown = async () => {
  server.close();
  await handle.close();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
