import { beforeEach, describe, expect, it } from 'vitest';
import type { Shift } from '../api/types';
import { dropOn } from './dnd';
import { cellKey, effectiveShift, pendingChanges, useSchedule } from './schedule';

const MORNING = { id: 1, name: 'Утро', startTime: '07:00', endTime: '15:00', color: 'cornflower' as const, hotkey: 1 };
const k1 = cellKey(1, '2026-07-01');
const k2 = cellKey(2, '2026-07-01');
const k3 = cellKey(3, '2026-07-02');

const serverShift: Shift = {
  id: 10,
  employeeId: 3,
  date: '2026-07-02',
  startTime: '10:00',
  endTime: '18:00',
  templateId: null,
  publishedAt: null,
};

beforeEach(() => {
  useSchedule.setState({
    templates: [MORNING],
    server: { [k3]: serverShift },
    drafts: {},
    history: [],
    selected: {},
    autosave: false,
  });
});

const st = () => useSchedule.getState();
const morning = { startTime: '07:00', endTime: '15:00', templateId: 1 };

describe('schedule store', () => {
  it('assigns a template to several cells; coverage data reflects it immediately', () => {
    st().assign([k1, k2], morning);
    expect(effectiveShift(st(), k1)).toEqual(morning);
    expect(effectiveShift(st(), k2)).toEqual(morning);
    expect(pendingChanges(st()).upserts).toHaveLength(2);
  });

  it('clears shifts and reports deletions only for server shifts', () => {
    st().assign([k1], morning);
    st().clear([k1, k3]);
    expect(effectiveShift(st(), k1)).toBeNull();
    expect(effectiveShift(st(), k3)).toBeNull();
    expect(pendingChanges(st())).toEqual({ upserts: [], deletes: [{ employeeId: 3, date: '2026-07-02' }] });
  });

  it('drops drafts that are equal to the server state', () => {
    st().assign([k3], { startTime: '07:00', endTime: '15:00', templateId: null });
    st().assign([k3], { startTime: '10:00', endTime: '18:00', templateId: null });
    expect(st().drafts).toEqual({});
  });

  it('moves and copies shifts between cells', () => {
    st().move(k3, k1);
    expect(effectiveShift(st(), k3)).toBeNull();
    expect(effectiveShift(st(), k1)).toMatchObject({ startTime: '10:00' });
    st().move(k1, k2, true);
    expect(effectiveShift(st(), k1)).not.toBeNull();
    expect(effectiveShift(st(), k2)).not.toBeNull();
  });

  it('moving onto an occupied cell swaps the shifts', () => {
    st().assign([k1], morning);
    st().move(k1, k3);
    expect(effectiveShift(st(), k3)).toEqual(morning);
    expect(effectiveShift(st(), k1)).toMatchObject({ startTime: '10:00', endTime: '18:00' });
  });

  it('undo still works after the changes were saved', () => {
    st().assign([k1], morning);
    // как будто автосохранение уже записало смену на сервер
    useSchedule.setState({
      server: { ...st().server, [k1]: { ...serverShift, id: 11, employeeId: 1, date: '2026-07-01', ...morning } },
      drafts: {},
    });
    st().undo();
    expect(effectiveShift(st(), k1)).toBeNull();
    expect(pendingChanges(st()).deletes).toEqual([{ employeeId: 1, date: '2026-07-01' }]);
  });

  it('undoes the last change', () => {
    st().assign([k1], morning);
    st().clear([k3]);
    st().undo();
    expect(effectiveShift(st(), k3)).not.toBeNull();
    expect(effectiveShift(st(), k1)).toEqual(morning);
    st().undo();
    expect(effectiveShift(st(), k1)).toBeNull();
  });

  it('dropping a template on a selected cell fills the whole selection', () => {
    st().select([k1, k2]);
    dropOn({ kind: 'template', templateId: 1 }, k1, false);
    expect(effectiveShift(st(), k2)).toEqual(morning);
  });

  it('selection toggle / replace', () => {
    st().select([k1, k2]);
    st().select([k1], 'toggle');
    expect(Object.keys(st().selected)).toEqual([k2]);
    st().select([k3], 'replace');
    expect(Object.keys(st().selected)).toEqual([k3]);
  });
});
