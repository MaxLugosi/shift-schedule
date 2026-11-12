import { create } from 'zustand';
import { api } from '../api/client';
import type { CellRef, Employee, Shift, ShiftTemplate, ShiftUpsert } from '../api/types';
import { addDays, addMonths, getRange, todayISO, type ViewMode } from '../lib/dates';

// ключ ячейки: employeeId|date
export type CellKey = string;
export const cellKey = (employeeId: number, date: string): CellKey => `${employeeId}|${date}`;
export const parseKey = (key: CellKey): CellRef => {
  const [id, date] = key.split('|');
  return { employeeId: Number(id), date: date! };
};

export interface ShiftValue {
  startTime: string;
  endTime: string;
  templateId: number | null;
}

type Drafts = Record<CellKey, ShiftValue | null>;

interface Toast {
  id: number;
  text: string;
  kind: 'info' | 'error' | 'success';
}

interface ScheduleState {
  view: ViewMode;
  anchor: string;
  search: string;

  employees: Employee[];
  templates: ShiftTemplate[];
  server: Record<CellKey, Shift>;
  // несохранённые изменения поверх server, null = удалено
  drafts: Drafts;
  history: Drafts[];
  selected: Record<CellKey, true>;

  ready: boolean;
  loadingShifts: boolean;
  saving: boolean;
  publishing: boolean;
  loadError: string | null;
  toast: Toast | null;

  init: () => Promise<void>;
  setView: (view: ViewMode) => void;
  navigate: (dir: -1 | 1) => void;
  goTo: (anchor: string) => void;
  setSearch: (search: string) => void;
  loadEmployees: () => Promise<void>;
  loadShifts: () => Promise<void>;

  assign: (keys: CellKey[], value: ShiftValue) => void;
  assignEach: (values: Record<CellKey, ShiftValue>) => void;
  clear: (keys: CellKey[]) => void;
  move: (from: CellKey, to: CellKey, copy?: boolean) => void;
  undo: () => void;

  select: (keys: CellKey[], mode?: 'add' | 'toggle' | 'replace') => void;
  deselect: (keys: CellKey[]) => void;
  clearSelection: () => void;

  save: () => Promise<boolean>;
  publish: () => Promise<void>;
  showToast: (text: string, kind?: Toast['kind']) => void;
  dismissToast: () => void;
}

const MAX_HISTORY = 50;
let toastSeq = 0;
let shiftsRequestSeq = 0;
let employeesRequestSeq = 0;

export const sameValue = (a: ShiftValue | null | undefined, b: ShiftValue | null | undefined) =>
  (!a && !b) || (!!a && !!b && a.startTime === b.startTime && a.endTime === b.endTime && a.templateId === b.templateId);

export function effectiveShift(state: Pick<ScheduleState, 'server' | 'drafts'>, key: CellKey): ShiftValue | null {
  if (key in state.drafts) return state.drafts[key] ?? null;
  const s = state.server[key];
  return s ? { startTime: s.startTime, endTime: s.endTime, templateId: s.templateId } : null;
}

export function pendingChanges(state: Pick<ScheduleState, 'server' | 'drafts'>): { upserts: ShiftUpsert[]; deletes: CellRef[] } {
  const upserts: ShiftUpsert[] = [];
  const deletes: CellRef[] = [];
  for (const [key, value] of Object.entries(state.drafts)) {
    const srv = state.server[key];
    const srvValue = srv ? { startTime: srv.startTime, endTime: srv.endTime, templateId: srv.templateId } : null;
    if (sameValue(value, srvValue)) continue;
    if (value) upserts.push({ ...parseKey(key), ...value });
    else if (srv) deletes.push(parseKey(key));
  }
  return { upserts, deletes };
}

export const useSchedule = create<ScheduleState>()((set, get) => {
  const commit = (mutate: (drafts: Drafts) => void) => {
    const prev = get().drafts;
    const next = { ...prev };
    mutate(next);
    // если вернули как было на сервере - это уже не изменение
    for (const key of Object.keys(next)) {
      const srv = get().server[key];
      const srvValue = srv ? { startTime: srv.startTime, endTime: srv.endTime, templateId: srv.templateId } : null;
      if (sameValue(next[key], srvValue)) delete next[key];
    }
    set({ drafts: next, history: [...get().history, prev].slice(-MAX_HISTORY) });
  };

  return {
    view: 'week',
    anchor: todayISO(),
    search: '',

    employees: [],
    templates: [],
    server: {},
    drafts: {},
    history: [],
    selected: {},

    ready: false,
    loadingShifts: false,
    saving: false,
    publishing: false,
    loadError: null,
    toast: null,

    async init() {
      try {
        const [employees, templates] = await Promise.all([api.employees(), api.templates()]);
        set({ employees, templates, loadError: null });
        await get().loadShifts();
        set({ ready: true });
      } catch (e) {
        set({ loadError: (e as Error).message, ready: true });
      }
    },

    setView(view) {
      if (view === get().view) return;
      set({ view });
      void get().loadShifts();
    },
    navigate(dir) {
      const { view, anchor } = get();
      set({ anchor: view === 'week' ? addDays(anchor, dir * 7) : addMonths(anchor, dir) });
      void get().loadShifts();
    },
    goTo(anchor) {
      set({ anchor });
      void get().loadShifts();
    },
    setSearch(search) {
      set({ search });
      void get().loadEmployees();
    },

    async loadEmployees() {
      const seq = ++employeesRequestSeq;
      try {
        const employees = await api.employees(get().search.trim() || undefined);
        if (seq === employeesRequestSeq) set({ employees });
      } catch (e) {
        get().showToast((e as Error).message, 'error');
      }
    },

    async loadShifts() {
      const seq = ++shiftsRequestSeq;
      const { from, to } = getRange(get().view, get().anchor);
      set({ loadingShifts: true });
      try {
        const list = await api.shifts(from, to);
        if (seq !== shiftsRequestSeq) return;
        const server = { ...get().server };
        for (const key of Object.keys(server)) {
          const d = parseKey(key).date;
          if (d >= from && d <= to) delete server[key];
        }
        for (const s of list) server[cellKey(s.employeeId, s.date)] = s;
        set({ server, loadingShifts: false });
      } catch (e) {
        if (seq === shiftsRequestSeq) set({ loadingShifts: false });
        get().showToast((e as Error).message, 'error');
      }
    },

    assign(keys, value) {
      if (!keys.length) return;
      commit((d) => {
        for (const k of keys) d[k] = { ...value };
      });
    },
    assignEach(values) {
      if (!Object.keys(values).length) return;
      commit((d) => {
        for (const [k, v] of Object.entries(values)) d[k] = { ...v };
      });
    },
    clear(keys) {
      const st = get();
      const withShift = keys.filter((k) => effectiveShift(st, k));
      if (!withShift.length) return;
      commit((d) => {
        for (const k of withShift) d[k] = null;
      });
    },
    move(from, to, copy = false) {
      if (from === to) return;
      const value = effectiveShift(get(), from);
      if (!value) return;
      commit((d) => {
        d[to] = { ...value };
        if (!copy) d[from] = null;
      });
      if (get().selected[from] && !copy) {
        const selected = { ...get().selected };
        delete selected[from];
        selected[to] = true;
        set({ selected });
      }
    },
    undo() {
      const history = get().history;
      if (!history.length) return;
      set({ drafts: history[history.length - 1]!, history: history.slice(0, -1) });
    },

    select(keys, mode = 'add') {
      const selected: Record<CellKey, true> = mode === 'replace' ? {} : { ...get().selected };
      for (const k of keys) {
        if (mode === 'toggle' && selected[k]) delete selected[k];
        else selected[k] = true;
      }
      set({ selected });
    },
    deselect(keys) {
      const selected = { ...get().selected };
      for (const k of keys) delete selected[k];
      set({ selected });
    },
    clearSelection() {
      if (Object.keys(get().selected).length) set({ selected: {} });
    },

    async save() {
      const changes = pendingChanges(get());
      if (!changes.upserts.length && !changes.deletes.length) return true;
      set({ saving: true });
      try {
        const res = await api.saveBatch(changes);
        const server = { ...get().server };
        for (const c of changes.deletes) delete server[cellKey(c.employeeId, c.date)];
        for (const s of res.upserted) server[cellKey(s.employeeId, s.date)] = s;
        set({ server, drafts: {}, history: [], saving: false });
        get().showToast('Изменения сохранены', 'success');
        return true;
      } catch (e) {
        set({ saving: false });
        get().showToast((e as Error).message, 'error');
        return false;
      }
    },

    async publish() {
      if (!(await get().save())) return;
      const { from, to } = getRange(get().view, get().anchor);
      set({ publishing: true });
      try {
        const res = await api.publish(from, to);
        await get().loadShifts();
        set({ publishing: false });
        get().showToast(
          res.published ? `Опубликовано смен: ${res.published}` : 'Все смены периода уже опубликованы',
          'success',
        );
      } catch (e) {
        set({ publishing: false });
        get().showToast((e as Error).message, 'error');
      }
    },

    showToast(text, kind = 'info') {
      set({ toast: { id: ++toastSeq, text, kind } });
    },
    dismissToast() {
      set({ toast: null });
    },
  };
});
