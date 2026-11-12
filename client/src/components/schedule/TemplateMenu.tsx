import type { ReactNode } from 'react';
import type { ShiftTemplate } from '../../api/types';
import { durationMinutes, formatHours } from '../../lib/time';
import s from './TemplateMenu.module.css';

export function TemplateMenu({
  title,
  subtitle,
  templates,
  onPick,
  options,
  disabled = false,
  footer,
}: {
  title: string;
  subtitle?: string;
  templates: ShiftTemplate[];
  onPick: (t: ShiftTemplate) => void;
  options?: ReactNode;
  disabled?: boolean;
  footer?: ReactNode;
}) {
  return (
    <div className={s.menu}>
      <div className={s.head}>
        <div className={s.title}>{title}</div>
        {subtitle && <div className={s.subtitle}>{subtitle}</div>}
      </div>
      {options}
      <ul className={s.list} role="menu">
        {templates.map((t) => (
          <li key={t.id} role="none">
            <button type="button" role="menuitem" className={`${s.option} ${s[t.color]}`} onClick={() => onPick(t)} disabled={disabled}>
              <span className={s.name}>{t.name}</span>
              <span className={s.time}>
                {t.startTime} - {t.endTime} · {formatHours(durationMinutes(t.startTime, t.endTime))}
              </span>
              {t.hotkey !== null && <kbd className={s.key}>{t.hotkey}</kbd>}
            </button>
          </li>
        ))}
      </ul>
      {footer && <div className={s.footer}>{footer}</div>}
    </div>
  );
}

export function MenuAction({
  children,
  onClick,
  danger = false,
  disabled = false,
}: {
  children: ReactNode;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button type="button" className={`${s.action} ${danger ? s.danger : ''}`} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

export function MenuCheckbox({
  id,
  checked,
  onChange,
  children,
}: {
  id: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  children: ReactNode;
}) {
  return (
    <label className={s.check} htmlFor={id}>
      <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{children}</span>
    </label>
  );
}
