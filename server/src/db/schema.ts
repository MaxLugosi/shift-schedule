import { sql } from 'drizzle-orm';
import {
  check,
  date,
  index,
  integer,
  pgTable,
  serial,
  smallint,
  text,
  time,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

export const TEMPLATE_COLORS = ['cornflower', 'lavender', 'mint'] as const;
export type TemplateColor = (typeof TEMPLATE_COLORS)[number];

export const employees = pgTable('employees', {
  id: serial('id').primaryKey(),
  fullName: text('full_name').notNull(),
  position: text('position').notNull().default('агент'),
  avatarUrl: text('avatar_url'),
  sortOrder: integer('sort_order').notNull().default(0),
});

export const shiftTemplates = pgTable(
  'shift_templates',
  {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    startTime: time('start_time').notNull(),
    endTime: time('end_time').notNull(),
    color: text('color').$type<TemplateColor>().notNull(),
    hotkey: smallint('hotkey'),
    sortOrder: integer('sort_order').notNull().default(0),
  },
  (t) => [
    uniqueIndex('shift_templates_hotkey_uq').on(t.hotkey),
    check('shift_templates_color_chk', sql`${t.color} in ('cornflower', 'lavender', 'mint')`),
    check('shift_templates_time_chk', sql`${t.startTime} <> ${t.endTime}`),
  ],
);

// одна смена на сотрудника в день; templateId = null - своя смена
// end_time < start_time - ночная смена, заканчивается на следующий день
export const shifts = pgTable(
  'shifts',
  {
    id: serial('id').primaryKey(),
    employeeId: integer('employee_id')
      .notNull()
      .references(() => employees.id, { onDelete: 'cascade' }),
    date: date('date', { mode: 'string' }).notNull(),
    startTime: time('start_time').notNull(),
    endTime: time('end_time').notNull(),
    templateId: integer('template_id').references(() => shiftTemplates.id, { onDelete: 'set null' }),
    publishedAt: timestamp('published_at', { withTimezone: true, mode: 'string' }),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('shifts_employee_date_uq').on(t.employeeId, t.date),
    index('shifts_date_idx').on(t.date),
    check('shifts_time_chk', sql`${t.startTime} <> ${t.endTime}`),
  ],
);

export const schema = { employees, shiftTemplates, shifts };
