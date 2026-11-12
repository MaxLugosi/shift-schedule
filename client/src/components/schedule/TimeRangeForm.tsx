import { useState, type FormEvent } from 'react';
import { normalizeTimeInput } from '../../lib/time';
import { Icon } from '../icons';
import { Button } from '../ui/Button';
import { TextField } from '../ui/controls';
import s from './TimeRangeForm.module.css';

const PLACEHOLDER_START = '09:00';
const PLACEHOLDER_END = '17:00';

// пустые поля = значения из плейсхолдеров
export function TimeRangeForm({
  initialStart = '',
  initialEnd = '',
  submitLabel,
  disabled,
  disabledHint,
  onSubmit,
  compact = false,
}: {
  initialStart?: string;
  initialEnd?: string;
  submitLabel: string;
  disabled?: boolean;
  disabledHint?: string;
  onSubmit: (start: string, end: string) => void;
  compact?: boolean;
}) {
  const [start, setStart] = useState(initialStart);
  const [end, setEnd] = useState(initialEnd);
  const [errors, setErrors] = useState<{ start?: string; end?: string }>({});

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const st = normalizeTimeInput(start || PLACEHOLDER_START);
    const en = normalizeTimeInput(end || PLACEHOLDER_END);
    const next: typeof errors = {};
    if (!st) next.start = 'Формат ЧЧ:ММ';
    if (!en) next.end = 'Формат ЧЧ:ММ';
    if (st && en && st === en) next.end = 'Совпадает с началом';
    setErrors(next);
    if (next.start || next.end || !st || !en) return;
    if (start) setStart(st);
    if (end) setEnd(en);
    onSubmit(st, en);
  };

  const blurNormalize = (v: string, set: (v: string) => void) => {
    const n = normalizeTimeInput(v);
    if (n) set(n);
  };

  return (
    <form className={`${s.form} ${compact ? s.compact : ''}`} onSubmit={submit} noValidate>
      <div className={s.fields}>
        <TextField
          label="Начало"
          inputMode="numeric"
          autoComplete="off"
          placeholder={PLACEHOLDER_START}
          maxLength={5}
          value={start}
          error={errors.start}
          onChange={(e) => {
            setStart(e.target.value);
            setErrors((x) => ({ ...x, start: undefined }));
          }}
          onBlur={(e) => blurNormalize(e.target.value, setStart)}
        />
        <TextField
          label="Конец"
          inputMode="numeric"
          autoComplete="off"
          placeholder={PLACEHOLDER_END}
          maxLength={5}
          value={end}
          error={errors.end}
          onChange={(e) => {
            setEnd(e.target.value);
            setErrors((x) => ({ ...x, end: undefined }));
          }}
          onBlur={(e) => blurNormalize(e.target.value, setEnd)}
        />
      </div>
      <Button
        type="submit"
        variant="secondary"
        className={s.submit}
        disabled={disabled}
        title={disabled ? disabledHint : undefined}
        icon={<Icon name="plus" size={20} />}
      >
        {submitLabel}
      </Button>
    </form>
  );
}
