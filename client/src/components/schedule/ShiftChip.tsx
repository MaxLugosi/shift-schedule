import type { ViewMode } from '../../lib/dates';
import { compactRange, durationMinutes, formatHours } from '../../lib/time';
import type { ShiftValue } from '../../store/schedule';
import type { ShiftTone } from './shiftStyle';
import s from './ShiftChip.module.css';

export function ShiftChip({
  value,
  tone,
  view,
  ghost = false,
  draft = false,
  unpublished = false,
  title,
}: {
  value: ShiftValue;
  tone: ShiftTone;
  view: ViewMode;
  ghost?: boolean;
  draft?: boolean;
  unpublished?: boolean;
  title?: string;
}) {
  const hours = formatHours(durationMinutes(value.startTime, value.endTime));
  return (
    <span
      className={`${s.chip} ${s[tone]} ${view === 'month' ? s.month : s.week} ${ghost ? s.ghost : ''} ${unpublished ? s.unpublished : ''}`}
      title={title}
    >
      {view === 'week' ? (
        <>
          <span className={s.time}>{compactRange(value.startTime, value.endTime)}</span>
          <span className={s.hours}>{hours}</span>
        </>
      ) : (
        <span className={s.monthHours}>{hours}</span>
      )}
      {draft && <span className={s.draftDot} aria-label="Не сохранено" />}
    </span>
  );
}
