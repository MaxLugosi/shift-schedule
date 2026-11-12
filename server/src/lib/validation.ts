import { z } from 'zod';

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export const timeSchema = z.string().regex(TIME_RE, 'Время в формате ЧЧ:ММ');

export const dateSchema = z.iso.date('Дата в формате ГГГГ-ММ-ДД');

export const cellSchema = z.object({
  employeeId: z.number().int().positive(),
  date: dateSchema,
});

export const upsertSchema = cellSchema
  .extend({
    startTime: timeSchema,
    endTime: timeSchema,
    templateId: z.number().int().positive().nullable(),
  })
  .refine((v) => v.startTime !== v.endTime, {
    message: 'Время начала и окончания не должны совпадать',
    path: ['endTime'],
  });

const MAX_BATCH = 2000;

export const batchSchema = z
  .object({
    upserts: z.array(upsertSchema).max(MAX_BATCH).default([]),
    deletes: z.array(cellSchema).max(MAX_BATCH).default([]),
  })
  .superRefine((v, ctx) => {
    const seen = new Set<string>();
    for (const c of [...v.upserts, ...v.deletes]) {
      const key = `${c.employeeId}:${c.date}`;
      if (seen.has(key)) {
        ctx.addIssue({ code: 'custom', message: `Ячейка ${key} встречается в запросе дважды` });
        return;
      }
      seen.add(key);
    }
  });

const MAX_RANGE_DAYS = 62;

export const rangeSchema = z
  .object({ from: dateSchema, to: dateSchema })
  .refine((v) => v.from <= v.to, { message: '"from" должна быть не позже "to"', path: ['to'] })
  .refine((v) => daysBetween(v.from, v.to) <= MAX_RANGE_DAYS, {
    message: `Диапазон не больше ${MAX_RANGE_DAYS} дней`,
    path: ['to'],
  });

export const employeesQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
});

function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);
}

export type UpsertInput = z.infer<typeof upsertSchema>;
export type CellInput = z.infer<typeof cellSchema>;
export type BatchInput = z.infer<typeof batchSchema>;
