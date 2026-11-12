import { useMemo } from 'react';
import { cellsWord, employeesWord } from '../../lib/plural';
import { effectiveShift, parseKey, useSchedule } from '../../store/schedule';
import { useUi } from '../../store/ui';
import { Icon } from '../icons';
import { rectOf } from '../ui/Popover';
import s from './SelectionBar.module.css';

export function SelectionBar() {
  const selected = useSchedule((st) => st.selected);
  const server = useSchedule((st) => st.server);
  const drafts = useSchedule((st) => st.drafts);
  const clear = useSchedule((st) => st.clear);
  const clearSelection = useSchedule((st) => st.clearSelection);
  const open = useUi((st) => st.open);

  const keys = useMemo(() => Object.keys(selected), [selected]);
  const stats = useMemo(() => {
    const emp = new Set<number>();
    const days = new Set<string>();
    let withShift = 0;
    for (const k of keys) {
      const c = parseKey(k);
      emp.add(c.employeeId);
      days.add(c.date);
      if (effectiveShift({ server, drafts }, k)) withShift++;
    }
    return { employees: emp.size, days: days.size, withShift };
  }, [keys, server, drafts]);

  return (
    <div className={s.bar} role="toolbar" aria-label="Действия с выделенными ячейками">
      <div className={s.info}>
        <span className={s.label}>Выделено:</span>
        <span className={s.counter}>{cellsWord(keys.length)}</span>
        <span className={s.label}>
          {employeesWord(stats.employees)} · {stats.days} дн.
        </span>
      </div>
      <div className={s.actions}>
        <button type="button" className={s.action} onClick={(e) => open({ kind: 'picker', anchor: rectOf(e.currentTarget) })}>
          <Icon name="template" size={16} />
          <span>Применить шаблон</span>
        </button>
        {stats.withShift > 0 && (
          <button type="button" className={s.action} onClick={(e) => open({ kind: 'edit', anchor: rectOf(e.currentTarget) })}>
            <Icon name="edit" size={16} />
            <span>Изменить</span>
          </button>
        )}
        <button type="button" className={s.action} onClick={() => clear(keys)} disabled={stats.withShift === 0}>
          <Icon name="trash" size={16} />
          <span>Очистить</span>
        </button>
        <button type="button" className={s.action} onClick={clearSelection}>
          <Icon name="close" size={16} />
          <span>Снять</span>
        </button>
      </div>
    </div>
  );
}
