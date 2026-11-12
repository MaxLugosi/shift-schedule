import { and, asc, between, eq, ilike, inArray, isNull, or, sql } from 'drizzle-orm';
import type { Db } from '../db/client.js';
import { employees, shiftTemplates, shifts } from '../db/schema.js';
import type { BatchInput } from '../lib/validation.js';

export class NotFoundError extends Error {}

// postgres отдаёт time как HH:MM:SS
const hhmm = (t: string) => t.slice(0, 5);

export interface ShiftDto {
  id: number;
  employeeId: number;
  date: string;
  startTime: string;
  endTime: string;
  templateId: number | null;
  publishedAt: string | null;
}

function toShiftDto(r: typeof shifts.$inferSelect): ShiftDto {
  return {
    id: r.id,
    employeeId: r.employeeId,
    date: r.date,
    startTime: hhmm(r.startTime),
    endTime: hhmm(r.endTime),
    templateId: r.templateId,
    publishedAt: r.publishedAt,
  };
}

export async function listEmployees(db: Db, search?: string) {
  const words = (search ?? '').split(/\s+/).filter(Boolean);
  const rows = await db
    .select()
    .from(employees)
    .where(words.length ? and(...words.map((w) => ilike(employees.fullName, `%${escapeLike(w)}%`))) : undefined)
    .orderBy(asc(employees.sortOrder), asc(employees.id));
  return rows.map(({ sortOrder: _s, ...e }) => e);
}

export async function listTemplates(db: Db) {
  const rows = await db.select().from(shiftTemplates).orderBy(asc(shiftTemplates.sortOrder), asc(shiftTemplates.id));
  return rows.map(({ sortOrder: _s, ...t }) => ({ ...t, startTime: hhmm(t.startTime), endTime: hhmm(t.endTime) }));
}

export async function listShifts(db: Db, from: string, to: string): Promise<ShiftDto[]> {
  const rows = await db
    .select()
    .from(shifts)
    .where(between(shifts.date, from, to))
    .orderBy(asc(shifts.date), asc(shifts.employeeId));
  return rows.map(toShiftDto);
}

// после изменения смена снова становится неопубликованной
export async function applyBatch(db: Db, input: BatchInput): Promise<{ upserted: ShiftDto[]; deleted: number }> {
  return db.transaction(async (tx) => {
    const employeeIds = unique([...input.upserts, ...input.deletes].map((c) => c.employeeId));
    if (employeeIds.length) {
      const found = await tx.select({ id: employees.id }).from(employees).where(inArray(employees.id, employeeIds));
      const missing = employeeIds.filter((id) => !found.some((f) => f.id === id));
      if (missing.length) throw new NotFoundError(`Сотрудник не найден: ${missing.join(', ')}`);
    }
    const templateIds = unique(input.upserts.map((u) => u.templateId).filter((v): v is number => v !== null));
    if (templateIds.length) {
      const found = await tx
        .select({ id: shiftTemplates.id })
        .from(shiftTemplates)
        .where(inArray(shiftTemplates.id, templateIds));
      const missing = templateIds.filter((id) => !found.some((f) => f.id === id));
      if (missing.length) throw new NotFoundError(`Шаблон не найден: ${missing.join(', ')}`);
    }

    let deleted = 0;
    if (input.deletes.length) {
      const res = await tx
        .delete(shifts)
        .where(or(...input.deletes.map((c) => and(eq(shifts.employeeId, c.employeeId), eq(shifts.date, c.date)))))
        .returning({ id: shifts.id });
      deleted = res.length;
    }

    let upserted: ShiftDto[] = [];
    if (input.upserts.length) {
      const rows = await tx
        .insert(shifts)
        .values(input.upserts.map((u) => ({ ...u, publishedAt: null })))
        .onConflictDoUpdate({
          target: [shifts.employeeId, shifts.date],
          set: {
            startTime: sql`excluded.start_time`,
            endTime: sql`excluded.end_time`,
            templateId: sql`excluded.template_id`,
            publishedAt: null,
            updatedAt: sql`now()`,
          },
        })
        .returning();
      upserted = rows.map(toShiftDto);
    }
    return { upserted, deleted };
  });
}

export async function publishRange(db: Db, from: string, to: string): Promise<{ published: number; publishedAt: string }> {
  const now = new Date().toISOString();
  const res = await db
    .update(shifts)
    .set({ publishedAt: now })
    .where(and(between(shifts.date, from, to), isNull(shifts.publishedAt)))
    .returning({ id: shifts.id });
  return { published: res.length, publishedAt: now };
}

function unique<T>(arr: T[]): T[] {
  return [...new Set(arr)];
}

function escapeLike(s: string): string {
  return s.replace(/[\\%_]/g, (m) => `\\${m}`);
}
