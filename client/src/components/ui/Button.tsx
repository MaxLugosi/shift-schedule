import type { ButtonHTMLAttributes, ReactNode } from 'react';
import s from './ui.module.css';

type Variant = 'primary' | 'secondary' | 'neutral';

export function Button({
  variant = 'primary',
  icon,
  children,
  className = '',
  ...rest
}: { variant?: Variant; icon?: ReactNode } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" className={`${s.button} ${s[variant]} ${className}`} {...rest}>
      {icon}
      {children}
    </button>
  );
}

export function Badge({ children, dark = false }: { children: ReactNode; dark?: boolean }) {
  return <span className={`${s.badge} ${dark ? s.badgeDark : ''}`}>{children}</span>;
}
