import type { ShiftTemplate } from '../../api/types';
import { durationMinutes, formatHours } from '../../lib/time';
import { startDragTracking } from '../../store/dnd';
import { useSchedule } from '../../store/schedule';
import { TimeRangeForm } from './TimeRangeForm';
import s from './SidePanel.module.css';

export function SidePanel() {
  const templates = useSchedule((st) => st.templates);

  const applyTemplate = (t: ShiftTemplate) => {
    const st = useSchedule.getState();
    const keys = Object.keys(st.selected);
    if (!keys.length) {
      st.showToast('Выделите ячейки в календаре или перетащите шаблон на ячейку');
      return;
    }
    st.assign(keys, { startTime: t.startTime, endTime: t.endTime, templateId: t.id });
  };

  const applyCustom = (startTime: string, endTime: string) => {
    const st = useSchedule.getState();
    const keys = Object.keys(st.selected);
    if (!keys.length) {
      st.showToast('Сначала выделите ячейки в календаре');
      return;
    }
    st.assign(keys, { startTime, endTime, templateId: null });
  };

  return (
    <aside className={s.panel} aria-label="Шаблоны и своя смена">
      <section className={s.section}>
        <h2 className={s.title}>Шаблоны смен</h2>
        <ul className={s.templates}>
          {templates.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                className={`${s.template} ${s[t.color]}`}
                onClick={() => applyTemplate(t)}
                onPointerDown={(e) => startDragTracking(e, { kind: 'template', templateId: t.id })}
                title={`Применить к выделенным${t.hotkey ? ` (клавиша ${t.hotkey})` : ''} или перетащите на ячейку`}
              >
                <span className={s.tplText}>
                  <span className={s.tplName}>{t.name}</span>
                  <span className={s.tplTime}>
                    {t.startTime} - {t.endTime}
                    <span className={s.tplHours}>
                      <span aria-hidden="true"> · </span>
                      {formatHours(durationMinutes(t.startTime, t.endTime))}
                    </span>
                  </span>
                </span>
                {t.hotkey !== null && (
                  <kbd className={s.key} aria-label={`Горячая клавиша ${t.hotkey}`}>
                    {t.hotkey}
                  </kbd>
                )}
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className={s.section}>
        <h2 className={s.title}>Своя смена</h2>
        <TimeRangeForm submitLabel="Поставить в выделенные" onSubmit={applyCustom} />
      </section>
    </aside>
  );
}
