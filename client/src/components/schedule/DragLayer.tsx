import { createPortal } from 'react-dom';
import { useDnd } from '../../store/dnd';
import { effectiveShift, useSchedule } from '../../store/schedule';
import { ShiftChip } from './ShiftChip';
import { toneOf } from './shiftStyle';
import s from './DragLayer.module.css';

export function DragLayer() {
  const { item, x, y, copy } = useDnd();
  const templates = useSchedule((st) => st.templates);
  const view = useSchedule((st) => st.view);
  const server = useSchedule((st) => st.server);
  const drafts = useSchedule((st) => st.drafts);
  const value = item?.kind === 'shift' ? effectiveShift({ server, drafts }, item.from) : null;
  if (!item) return null;

  let content = null;
  if (item.kind === 'shift' && value) {
    content = <ShiftChip value={value} tone={toneOf(value, templates)} view={view} ghost />;
  } else if (item.kind === 'template') {
    const t = templates.find((x) => x.id === item.templateId);
    if (t)
      content = (
        <ShiftChip
          value={{ startTime: t.startTime, endTime: t.endTime, templateId: t.id }}
          tone={t.color}
          view={view}
          ghost
        />
      );
  }
  if (!content) return null;

  return createPortal(
    <div className={s.layer} style={{ transform: `translate(${x}px, ${y}px)` }} aria-hidden="true">
      {content}
      {item.kind === 'shift' && copy && <span className={s.copy}>+</span>}
    </div>,
    document.body,
  );
}
