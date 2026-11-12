import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
} from 'react';
import type { Employee, ShiftTemplate } from '../../api/types';
import { dayOfMonth, eachDay, getRange, longDayLabel, todayISO, weekdayShort, type ViewMode } from '../../lib/dates';
import { durationMinutes, formatHours } from '../../lib/time';
import { startDragTracking, useDnd } from '../../store/dnd';
import { cellKey, effectiveShift, useSchedule, type CellKey, type ShiftValue } from '../../store/schedule';
import { useUi } from '../../store/ui';
import { Icon } from '../icons';
import { rectOf } from '../ui/Popover';
import { ShiftChip } from './ShiftChip';
import { toneOf } from './shiftStyle';
import s from './ScheduleGrid.module.css';

export function ScheduleGrid() {
  const view = useSchedule((st) => st.view);
  const anchor = useSchedule((st) => st.anchor);
  const employees = useSchedule((st) => st.employees);
  const templates = useSchedule((st) => st.templates);
  const server = useSchedule((st) => st.server);
  const drafts = useSchedule((st) => st.drafts);
  const selected = useSchedule((st) => st.selected);
  const search = useSchedule((st) => st.search);
  const ready = useSchedule((st) => st.ready);
  const overKey = useDnd((st) => st.overKey);
  const dragItem = useDnd((st) => st.item);
  const openPopover = useUi((st) => st.open);

  const { from, to } = getRange(view, anchor);
  const days = useMemo(() => eachDay(from, to), [from, to]);
  const today = todayISO();

  const cells = useMemo(() => {
    const map = new Map<CellKey, ShiftValue>();
    const st = { server, drafts };
    for (const e of employees)
      for (const d of days) {
        const k = cellKey(e.id, d);
        const v = effectiveShift(st, k);
        if (v) map.set(k, v);
      }
    return map;
  }, [server, drafts, employees, days]);

  // покрытие считаем по всем сотрудникам, а не только по найденным
  const coverage = useMemo(() => {
    const counts = new Map<string, number>(days.map((d) => [d, 0]));
    const st = { server, drafts };
    const keys = new Set([...Object.keys(server), ...Object.keys(drafts)]);
    for (const k of keys) {
      const date = k.slice(k.indexOf('|') + 1);
      if (counts.has(date) && effectiveShift(st, k)) counts.set(date, counts.get(date)! + 1);
    }
    return counts;
  }, [server, drafts, days]);

  // выделение мышью - прямоугольником, как в excel
  const paint = useRef<{ mode: 'add' | 'remove'; anchor: CellKey; base: Record<CellKey, true> } | null>(null);
  const lastPointer = useRef<string>('mouse');
  const layout = useRef({ employees, days });
  layout.current = { employees, days };

  useEffect(() => {
    const stop = () => (paint.current = null);
    window.addEventListener('pointerup', stop);
    window.addEventListener('pointercancel', stop);
    return () => {
      window.removeEventListener('pointerup', stop);
      window.removeEventListener('pointercancel', stop);
    };
  }, []);

  const applyPaint = (key: CellKey) => {
    const p = paint.current;
    if (!p) return;
    const { employees: emps, days: ds } = layout.current;
    const pos = (k: CellKey) => {
      const [id, date] = k.split('|');
      return [emps.findIndex((x) => x.id === Number(id)), ds.indexOf(date!)] as const;
    };
    const [r1, c1] = pos(p.anchor);
    const [r2, c2] = pos(key);
    if (r1 < 0 || c1 < 0 || r2 < 0 || c2 < 0) return;
    const next = { ...p.base };
    for (let r = Math.min(r1, r2); r <= Math.max(r1, r2); r++)
      for (let c = Math.min(c1, c2); c <= Math.max(c1, c2); c++) {
        const k = cellKey(emps[r]!.id, ds[c]!);
        if (p.mode === 'add') next[k] = true;
        else delete next[k];
      }
    useSchedule.setState({ selected: next });
  };

  const onCellPointerDown = useCallback((e: PointerEvent<HTMLDivElement>, key: CellKey, hasShift: boolean) => {
    lastPointer.current = e.pointerType;
    const onChip = (e.target as HTMLElement).closest('[data-chip]');
    if (onChip && hasShift) {
      startDragTracking(e, { kind: 'shift', from: key });
      return;
    }
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    e.preventDefault();
    (e.currentTarget as HTMLElement).focus({ preventScroll: true });
    const { selected } = useSchedule.getState();
    paint.current = { mode: selected[key] ? 'remove' : 'add', anchor: key, base: selected };
    applyPaint(key);
  }, []);

  const onCellClick = useCallback((e: MouseEvent<HTMLDivElement>, key: CellKey) => {
    const onChip = (e.target as HTMLElement).closest('[data-chip]');
    // клик мышью уже обработан в pointerdown
    if (lastPointer.current === 'mouse' && !onChip) return;
    useSchedule.getState().select([key], 'toggle');
  }, []);

  const onCellEnter = useCallback((key: CellKey) => applyPaint(key), []);

  const openPicker = useCallback(
    (el: HTMLElement) => openPopover({ kind: 'picker', anchor: rectOf(el) }),
    [openPopover],
  );
  const openEdit = useCallback(
    (key: CellKey, el: HTMLElement) => {
      const sch = useSchedule.getState();
      if (!sch.selected[key]) sch.select([key], 'replace');
      openPopover({ kind: 'edit', anchor: rectOf(el) });
    },
    [openPopover],
  );

  const [focusKey, setFocusKey] = useState<CellKey | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const firstKey = employees[0] && days[0] ? cellKey(employees[0].id, days[0]) : null;
  const activeKey = focusKey && isVisible(focusKey, employees, days) ? focusKey : firstKey;

  const onGridKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const target = (e.target as HTMLElement).closest<HTMLElement>('[data-cell]');
    if (!target) return;
    const key = target.dataset.cell!;
    const [idStr, date] = key.split('|') as [string, string];
    const row = employees.findIndex((x) => x.id === Number(idStr));
    const col = days.indexOf(date);
    const moves: Record<string, [number, number]> = {
      ArrowUp: [-1, 0],
      ArrowDown: [1, 0],
      ArrowLeft: [0, -1],
      ArrowRight: [0, 1],
    };
    const mv = moves[e.key];
    if (mv) {
      e.preventDefault();
      const r = Math.max(0, Math.min(employees.length - 1, row + mv[0]));
      const c = Math.max(0, Math.min(days.length - 1, col + mv[1]));
      const next = cellKey(employees[r]!.id, days[c]!);
      setFocusKey(next);
      if (e.shiftKey) useSchedule.getState().select([next]);
      gridRef.current?.querySelector<HTMLElement>(`[data-cell="${next}"]`)?.focus();
    } else if (e.key === ' ') {
      e.preventDefault();
      useSchedule.getState().select([key], 'toggle');
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const sch = useSchedule.getState();
      if (!sch.selected[key]) sch.select([key]);
      if (cells.has(key)) openEdit(key, target);
      else openPicker(target);
    }
  };

  // в месяце сразу прокручиваем к сегодняшнему дню
  const scrollerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const idx = days.indexOf(today);
    el.scrollLeft = view === 'month' && idx > 3 ? (idx - 3) * 64 : 0;
  }, [view, from, ready]);

  if (!ready) return <div className={s.placeholder}>Загрузка...</div>;

  const cols = days.length;
  const style = {
    gridTemplateColumns: `var(--employee-w) repeat(${cols}, minmax(var(--cell-w), 1fr))`,
    '--cell-w': view === 'week' ? 'var(--cell-w-week)' : 'var(--cell-w-month)',
  } as CSSProperties;

  return (
    <div ref={scrollerRef} className={s.scroller} data-grid-scroller>
      <div
        ref={gridRef}
        className={`${s.grid} ${view === 'month' ? s.monthView : s.weekView}`}
        style={style}
        role="grid"
        aria-label="График смен"
        aria-rowcount={employees.length + 2}
        aria-colcount={cols + 1}
        aria-multiselectable="true"
        onKeyDown={onGridKeyDown}
        onFocus={(e) => {
          const k = (e.target as HTMLElement).dataset?.cell;
          if (k) setFocusKey(k);
        }}
      >
        <div role="row" className={s.row}>
          <div role="columnheader" className={`${s.corner} ${s.head}`}>
            Сотрудник
          </div>
          {days.map((d) => (
            <div role="columnheader" key={d} className={`${s.head} ${s.dateHead}`}>
              <button
                type="button"
                className={`${s.dateBtn} ${d === today ? s.today : ''}`}
                onClick={(e) => openPopover({ kind: 'quick', date: d, anchor: rectOf(e.currentTarget) })}
                aria-label={`Быстрое назначение на ${longDayLabel(d)}`}
                title="Быстрое назначение смены"
              >
                {view === 'week' ? (
                  `${weekdayShort(d)} ${dayOfMonth(d)}`
                ) : (
                  <>
                    <span className={s.wd}>{weekdayShort(d)}</span>
                    <span className={s.dn}>{dayOfMonth(d)}</span>
                  </>
                )}
              </button>
            </div>
          ))}
        </div>

        {employees.map((emp, i) => (
          <div role="row" key={emp.id} className={`${s.row} ${i % 2 ? s.odd : ''}`}>
            <EmployeeCell employee={emp} hours={sumHours(emp.id, days, cells)} />
            {days.map((d) => {
              const k = cellKey(emp.id, d);
              const v = cells.get(k) ?? null;
              return (
                <GridCell
                  key={k}
                  cell={k}
                  value={v}
                  templates={templates}
                  view={view}
                  selected={!!selected[k]}
                  isDraft={k in drafts}
                  unpublished={k in drafts || !server[k]?.publishedAt}
                  dropTarget={overKey === k && !!dragItem}
                  dragSource={dragItem?.kind === 'shift' && dragItem.from === k}
                  focusable={k === activeKey}
                  label={`${emp.fullName}, ${longDayLabel(d)}`}
                  onPointerDown={onCellPointerDown}
                  onPointerEnter={onCellEnter}
                  onClick={onCellClick}
                  onOpenPicker={openPicker}
                  onOpenEdit={openEdit}
                />
              );
            })}
          </div>
        ))}

        {employees.length === 0 && (
          <div className={s.empty} style={{ gridColumn: `1 / span ${cols + 1}` }}>
            {search ? `Никого не нашли по запросу «${search}»` : 'Нет сотрудников'}
          </div>
        )}

        <div role="row" className={s.row}>
          <div role="rowheader" className={`${s.footer} ${s.footerTitle}`}>
            Покрытие
          </div>
          {days.map((d) => {
            const n = coverage.get(d) ?? 0;
            return (
              <div
                role="gridcell"
                key={d}
                className={`${s.footer} ${s.coverage} ${n > 0 ? s.covered : s.uncovered}`}
                aria-label={`${longDayLabel(d)}: смен ${n}`}
              >
                {n}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function isVisible(key: CellKey, employees: Employee[], days: string[]) {
  const [id, date] = key.split('|');
  return days.includes(date!) && employees.some((e) => e.id === Number(id));
}

function sumHours(employeeId: number, days: string[], cells: Map<CellKey, ShiftValue>) {
  let min = 0;
  for (const d of days) {
    const v = cells.get(cellKey(employeeId, d));
    if (v) min += durationMinutes(v.startTime, v.endTime);
  }
  return formatHours(min);
}

const EmployeeCell = memo(function EmployeeCell({ employee, hours }: { employee: Employee; hours: string }) {
  const initials = employee.fullName
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('');
  return (
    <div role="rowheader" className={s.employee}>
      {employee.avatarUrl ? (
        <img className={s.avatar} src={employee.avatarUrl} alt="" width={40} height={40} />
      ) : (
        <span className={`${s.avatar} ${s.initials}`} aria-hidden="true">
          {initials}
        </span>
      )}
      <div className={s.who}>
        <div className={s.name} title={employee.fullName}>
          {employee.fullName}
        </div>
        <div className={s.meta}>
          <span>{employee.position}</span>
          <span>·</span>
          <span>{hours}</span>
        </div>
      </div>
    </div>
  );
});

interface CellProps {
  cell: CellKey;
  value: ShiftValue | null;
  templates: ShiftTemplate[];
  view: ViewMode;
  selected: boolean;
  isDraft: boolean;
  unpublished: boolean;
  dropTarget: boolean;
  dragSource: boolean;
  focusable: boolean;
  label: string;
  onPointerDown: (e: PointerEvent<HTMLDivElement>, key: CellKey, hasShift: boolean) => void;
  onPointerEnter: (key: CellKey) => void;
  onClick: (e: MouseEvent<HTMLDivElement>, key: CellKey) => void;
  onOpenPicker: (el: HTMLElement) => void;
  onOpenEdit: (key: CellKey, el: HTMLElement) => void;
}

const GridCell = memo(function GridCell({
  cell,
  value,
  templates,
  view,
  selected,
  isDraft,
  unpublished,
  dropTarget,
  dragSource,
  focusable,
  label,
  onPointerDown,
  onPointerEnter,
  onClick,
  onOpenPicker,
  onOpenEdit,
}: CellProps) {
  const tpl = value?.templateId != null ? templates.find((t) => t.id === value.templateId) : undefined;
  const fullLabel = value
    ? `${label}: ${tpl ? tpl.name + ', ' : ''}${value.startTime}–${value.endTime}`
    : `${label}: нет смены`;
  return (
    <div
      role="gridcell"
      aria-selected={selected}
      aria-label={fullLabel}
      tabIndex={focusable ? 0 : -1}
      data-cell={cell}
      className={`${s.cell} ${selected ? s.selected : ''} ${dropTarget ? s.drop : ''}`}
      onPointerDown={(e) => onPointerDown(e, cell, !!value)}
      onPointerEnter={() => onPointerEnter(cell)}
      onClick={(e) => onClick(e, cell)}
    >
      {value ? (
        <div
          className={`${s.chipWrap} ${dragSource ? s.dragging : ''}`}
          data-chip
          onDoubleClick={(e) => onOpenEdit(cell, e.currentTarget)}
        >
          <ShiftChip
            value={value}
            tone={toneOf(value, templates)}
            view={view}
            draft={isDraft}
            unpublished={unpublished}
            title={`${tpl ? tpl.name + ' · ' : 'Своя смена · '}${value.startTime} - ${value.endTime}${unpublished ? '\nне опубликована' : ''}\nдвойной клик - изменить, перетащить - перенести, с Ctrl - скопировать`}
          />
        </div>
      ) : selected ? (
        <button
          type="button"
          className={s.plus}
          aria-label="Выбрать шаблон смены"
          title="Выбрать шаблон смены"
          tabIndex={-1}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onOpenPicker(e.currentTarget.parentElement!);
          }}
        >
          <Icon name="plus" size={14} />
        </button>
      ) : (
        <span className={s.slot} />
      )}
    </div>
  );
});
