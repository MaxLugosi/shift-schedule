import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from './app.js';
import { createDb, type DbHandle } from './db/client.js';
import { shifts } from './db/schema.js';
import { seedIfEmpty } from './db/seed.js';

let handle: DbHandle;
let app: ReturnType<typeof createApp>;

beforeAll(async () => {
  handle = await createDb('pglite:memory');
  await handle.migrate();
  await seedIfEmpty(handle.db);
  app = createApp(handle.db);
});
afterAll(() => handle.close());
beforeEach(async () => {
  await handle.db.delete(shifts);
});

const json = (method: string, body: unknown) => ({
  method,
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body),
});

async function templates() {
  return (await (await app.request('/api/templates')).json()) as { id: number; name: string; startTime: string }[];
}

describe('GET /api/employees', () => {
  it('returns seeded employees in mockup order', async () => {
    const res = await app.request('/api/employees');
    expect(res.status).toBe(200);
    const list = (await res.json()) as { fullName: string }[];
    expect(list).toHaveLength(8);
    expect(list[0]!.fullName).toBe('Кузнецова Алина');
  });

  it('searches by any part of full name, case-insensitive', async () => {
    const res = await app.request(`/api/employees?search=${encodeURIComponent('тимур вол')}`);
    const list = (await res.json()) as { fullName: string }[];
    expect(list.map((e) => e.fullName)).toEqual(['Волков Тимур']);
  });

  it('treats LIKE wildcards literally', async () => {
    const res = await app.request(`/api/employees?search=${encodeURIComponent('%')}`);
    expect(await res.json()).toEqual([]);
  });
});

describe('GET /api/templates', () => {
  it('returns Утро/День/Вечер with HH:MM times', async () => {
    const list = await templates();
    expect(list.map((t) => [t.name, t.startTime])).toEqual([
      ['Утро', '07:00'],
      ['День', '10:00'],
      ['Вечер', '15:00'],
    ]);
  });
});

describe('shifts batch', () => {
  it('upserts shifts from a template and custom time, then lists them by range', async () => {
    const [morning] = await templates();
    const res = await app.request(
      '/api/shifts/batch',
      json('PUT', {
        upserts: [
          { employeeId: 1, date: '2026-07-02', startTime: '07:00', endTime: '15:00', templateId: morning!.id },
          { employeeId: 2, date: '2026-07-02', startTime: '10:00', endTime: '23:00', templateId: null },
        ],
      }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { upserted: unknown[] };
    expect(body.upserted).toHaveLength(2);

    const list = (await (await app.request('/api/shifts?from=2026-07-01&to=2026-07-07')).json()) as {
      employeeId: number;
      startTime: string;
      endTime: string;
      templateId: number | null;
    }[];
    expect(list).toHaveLength(2);
    expect(list.find((s) => s.employeeId === 2)).toMatchObject({ startTime: '10:00', endTime: '23:00', templateId: null });
  });

  it('keeps one shift per employee and day (second write replaces the first)', async () => {
    const put = (startTime: string, endTime: string) =>
      app.request(
        '/api/shifts/batch',
        json('PUT', { upserts: [{ employeeId: 1, date: '2026-07-03', startTime, endTime, templateId: null }] }),
      );
    await put('07:00', '15:00');
    await put('09:00', '17:00');
    const list = (await (await app.request('/api/shifts?from=2026-07-03&to=2026-07-03')).json()) as {
      startTime: string;
    }[];
    expect(list).toHaveLength(1);
    expect(list[0]!.startTime).toBe('09:00');
  });

  it('deletes shifts by cell', async () => {
    await app.request(
      '/api/shifts/batch',
      json('PUT', { upserts: [{ employeeId: 3, date: '2026-07-04', startTime: '07:00', endTime: '15:00', templateId: null }] }),
    );
    const res = await app.request('/api/shifts/batch', json('PUT', { deletes: [{ employeeId: 3, date: '2026-07-04' }] }));
    expect(((await res.json()) as { deleted: number }).deleted).toBe(1);
    expect(await (await app.request('/api/shifts?from=2026-07-04&to=2026-07-04')).json()).toEqual([]);
  });

  it('rejects invalid time, equal start/end and duplicate cells with 400', async () => {
    const bad = [
      { upserts: [{ employeeId: 1, date: '2026-07-01', startTime: '25:00', endTime: '15:00', templateId: null }] },
      { upserts: [{ employeeId: 1, date: '2026-07-01', startTime: '10:00', endTime: '10:00', templateId: null }] },
      { upserts: [{ employeeId: 1, date: '2026-02-30', startTime: '10:00', endTime: '12:00', templateId: null }] },
      {
        upserts: [{ employeeId: 1, date: '2026-07-01', startTime: '10:00', endTime: '12:00', templateId: null }],
        deletes: [{ employeeId: 1, date: '2026-07-01' }],
      },
    ];
    for (const body of bad) {
      const res = await app.request('/api/shifts/batch', json('PUT', body));
      expect(res.status).toBe(400);
      expect(((await res.json()) as { error: string }).error).toBe('validation_error');
    }
  });

  it('returns 404 for unknown employee or template and writes nothing', async () => {
    const res = await app.request(
      '/api/shifts/batch',
      json('PUT', {
        upserts: [
          { employeeId: 1, date: '2026-07-05', startTime: '07:00', endTime: '15:00', templateId: null },
          { employeeId: 999, date: '2026-07-05', startTime: '07:00', endTime: '15:00', templateId: null },
        ],
      }),
    );
    expect(res.status).toBe(404);
    expect(await (await app.request('/api/shifts?from=2026-07-05&to=2026-07-05')).json()).toEqual([]);
  });

  it('allows overnight custom shifts (end earlier than start)', async () => {
    const res = await app.request(
      '/api/shifts/batch',
      json('PUT', { upserts: [{ employeeId: 4, date: '2026-07-06', startTime: '22:00', endTime: '06:00', templateId: null }] }),
    );
    expect(res.status).toBe(200);
  });
});

describe('range validation and publishing', () => {
  it('rejects too long or reversed ranges', async () => {
    expect((await app.request('/api/shifts?from=2026-07-10&to=2026-07-01')).status).toBe(400);
    expect((await app.request('/api/shifts?from=2026-01-01&to=2026-12-31')).status).toBe(400);
  });

  it('publishes drafts in range; editing a published shift makes it a draft again', async () => {
    const upsert = (startTime: string) =>
      app.request(
        '/api/shifts/batch',
        json('PUT', { upserts: [{ employeeId: 5, date: '2026-07-07', startTime, endTime: '18:00', templateId: null }] }),
      );
    await upsert('10:00');
    const pub = await app.request('/api/schedule/publish', json('POST', { from: '2026-07-01', to: '2026-07-31' }));
    expect(((await pub.json()) as { published: number }).published).toBe(1);

    const get = async () =>
      ((await (await app.request('/api/shifts?from=2026-07-07&to=2026-07-07')).json()) as { publishedAt: string | null }[])[0]!;
    expect((await get()).publishedAt).not.toBeNull();
    await upsert('11:00');
    expect((await get()).publishedAt).toBeNull();
  });
});
