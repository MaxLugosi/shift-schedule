import { count } from 'drizzle-orm';
import type { Db } from './client.js';
import { employees, shiftTemplates } from './schema.js';
import { SEED_EMPLOYEES, SEED_TEMPLATES } from './seed-data.js';

export async function seedIfEmpty(db: Db): Promise<boolean> {
  const [row] = await db.select({ n: count() }).from(employees);
  if ((row?.n ?? 0) > 0) return false;
  await db.transaction(async (tx) => {
    await tx.insert(employees).values(SEED_EMPLOYEES.map((e, i) => ({ ...e, sortOrder: i })));
    await tx.insert(shiftTemplates).values(SEED_TEMPLATES.map((t, i) => ({ ...t, sortOrder: i })));
  });
  return true;
}

