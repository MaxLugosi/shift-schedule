import { useCallback } from 'react';
import type { ShiftTemplate } from '../../api/types';
import { longDayLabel } from '../../lib/dates';
import { cellsWord, employeesWord } from '../../lib/plural';
import { cellKey, effectiveShift, parseKey, useSchedule, type ShiftValue } from '../../store/schedule';
import { useUi } from '../../store/ui';
import { Popover } from '../ui/Popover';
import { MenuAction, TemplateMenu } from './TemplateMenu';
import { TimeRangeForm } from './TimeRangeForm';
import s from './Popovers.module.css';

export function Popovers() {
  const popover = useUi((st) => st.popover);
  const close = useUi((st) => st.close);
  const onClose = useCallback(() => close(), [close]);
  if (!popover) return null;

  if (popover.kind === 'quick')
    return (
      <Popover anchor={popover.anchor} onClose={onClose} label="Быстрое назначение смены">
        <QuickAssign date={popover.date} onDone={onClose} />
      </Popover>
    );
  if (popover.kind === 'picker')
    return (
      <Popover anchor={popover.anchor} onClose={onClose} label="Выбор шаблона смены">
        <CellPicker onDone={onClose} />
      </Popover>
    );
  return (
    <Popover anchor={popover.anchor} onClose={onClose} label="Изменить время смены" width={320}>
      <EditShift onDone={onClose} />
    </Popover>
  );
}

const tplValue = (t: ShiftTemplate) => ({ startTime: t.startTime, endTime: t.endTime, templateId: t.id });

// клик по дате: если в этом дне что-то выделено - ставим только туда, иначе всем
function QuickAssign({ date, onDone }: { date: string; onDone: () => void }) {
  const templates = useSchedule((st) => st.templates);
  const employees = useSchedule((st) => st.employees);
  const selected = useSchedule((st) => st.selected);
  const server = useSchedule((st) => st.server);
  const drafts = useSchedule((st) => st.drafts);

  const selectedInDay = Object.keys(selected).filter((k) => parseKey(k).date === date);
  const targets = selectedInDay.length ? selectedInDay : employees.map((e) => cellKey(e.id, date));
  const dayKeys = employees.map((e) => cellKey(e.id, date));
  const dayHasShifts = dayKeys.some((k) => effectiveShift({ server, drafts }, k));

  const st = useSchedule.getState;
  return (
    <TemplateMenu
      title={longDayLabel(date)}
      subtitle={
        selectedInDay.length
          ? `Назначить: ${cellsWord(selectedInDay.length)} этого дня`
          : `Назначить всем: ${employeesWord(targets.length)}`
      }
      templates={templates}
      onPick={(t) => {
        st().assign(targets, tplValue(t));
        onDone();
      }}
      footer={
        <>
          <MenuAction
            onClick={() => {
              st().select(dayKeys, 'replace');
              onDone();
            }}
            disabled={!dayKeys.length}
          >
            Выделить весь день
          </MenuAction>
          <MenuAction
            danger
            disabled={!dayHasShifts}
            onClick={() => {
              st().clear(selectedInDay.length ? selectedInDay : dayKeys);
              onDone();
            }}
          >
            {selectedInDay.length ? 'Очистить выделенные ячейки дня' : 'Очистить день'}
          </MenuAction>
        </>
      }
    />
  );
}

function CellPicker({ onDone }: { onDone: () => void }) {
  const templates = useSchedule((st) => st.templates);
  const selected = useSchedule((st) => st.selected);
  const server = useSchedule((st) => st.server);
  const drafts = useSchedule((st) => st.drafts);
  const keys = Object.keys(selected);
  const anyShift = keys.some((k) => effectiveShift({ server, drafts }, k));
  const st = useSchedule.getState;

  return (
    <TemplateMenu
      title="Шаблон смены"
      subtitle={`Для: ${cellsWord(keys.length)}`}
      templates={templates}
      onPick={(t) => {
        st().assign(keys, tplValue(t));
        onDone();
      }}
      footer={
        anyShift ? (
          <MenuAction
            danger
            onClick={() => {
              st().clear(keys);
              onDone();
            }}
          >
            Удалить смены
          </MenuAction>
        ) : undefined
      }
    />
  );
}

function EditShift({ onDone }: { onDone: () => void }) {
  const selected = useSchedule((st) => st.selected);
  const keys = Object.keys(selected);
  const st = useSchedule.getState();
  const first = keys.map((k) => effectiveShift(st, k)).find(Boolean) ?? null;
  const withShift = keys.filter((k) => effectiveShift(st, k));

  return (
    <div className={s.edit}>
      <div className={s.head}>
        <div className={s.title}>Изменить время</div>
        <div className={s.subtitle}>Смен: {withShift.length}</div>
      </div>
      <TimeRangeForm
        compact
        initialStart={first?.startTime}
        initialEnd={first?.endTime}
        submitLabel="Применить"
        onSubmit={(startTime, endTime) => {
          const sch = useSchedule.getState();
          const values: Record<string, ShiftValue> = {};
          // если время не поменяли - оставляем привязку к шаблону
          for (const k of withShift) {
            const cur = effectiveShift(sch, k);
            const keepTpl = cur && cur.templateId !== null && cur.startTime === startTime && cur.endTime === endTime;
            values[k] = { startTime, endTime, templateId: keepTpl ? cur.templateId : null };
          }
          sch.assignEach(values);
          onDone();
        }}
      />
    </div>
  );
}
