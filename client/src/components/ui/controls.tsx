import { useEffect, useId, useRef, useState, type InputHTMLAttributes } from 'react';
import { Icon } from '../icons';
import s from './ui.module.css';

export function SearchInput({
  value,
  onChange,
  placeholder = 'Поиск по ФИО',
  debounceMs = 250,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  debounceMs?: number;
}) {
  const [text, setText] = useState(value);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => setText(value), [value]);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const update = (v: string, immediate = false) => {
    setText(v);
    window.clearTimeout(timer.current);
    if (immediate) onChange(v);
    else timer.current = window.setTimeout(() => onChange(v), debounceMs);
  };

  return (
    <label className={s.search}>
      <Icon name="search" />
      <span className="visually-hidden">{placeholder}</span>
      <input
        type="search"
        className={s.searchInput}
        value={text}
        placeholder={placeholder}
        onChange={(e) => update(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape' && text) {
            e.stopPropagation();
            update('', true);
          }
        }}
      />
      {text && (
        <button type="button" className={s.clearBtn} onClick={() => update('', true)} aria-label="Очистить поиск">
          <Icon name="close" />
        </button>
      )}
    </label>
  );
}

export function Tabs<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div className={s.tabs} role="tablist" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={o.value === value}
          className={`${s.tab} ${o.value === value ? s.tabActive : ''}`}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function DateNav({
  label,
  onPrev,
  onNext,
  onToday,
}: {
  label: string;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
}) {
  return (
    <div className={s.dateNav}>
      <button type="button" className={s.navBtn} onClick={onPrev} aria-label="Предыдущий период">
        <Icon name="navPrev" />
      </button>
      <button type="button" className={s.navLabel} onClick={onToday} title="Перейти к текущей дате" aria-live="polite">
        {label}
      </button>
      <button type="button" className={s.navBtn} onClick={onNext} aria-label="Следующий период">
        <Icon name="navNext" />
      </button>
    </div>
  );
}

export function TextField({
  label,
  error,
  ...rest
}: { label: string; error?: string | null } & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <div className={s.field}>
      <label className={s.fieldLabel} htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        className={`${s.input} ${error ? s.inputError : ''}`}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-err` : undefined}
        {...rest}
      />
      {error && (
        <span id={`${id}-err`} className={s.fieldError}>
          {error}
        </span>
      )}
    </div>
  );
}
