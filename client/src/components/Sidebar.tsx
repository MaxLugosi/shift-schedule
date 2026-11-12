import { Icon, type IconName } from './icons';
import s from './Sidebar.module.css';

interface Props {
  collapsed: boolean;
  mobileOpen: boolean;
  onToggleCollapsed: () => void;
  onCloseMobile: () => void;
}

const ITEMS: { label: string; icon: IconName; href: string; active?: boolean }[] = [
  { label: 'Главная', icon: 'home', href: '#' },
  { label: 'Смены', icon: 'calendar', href: '#', active: true },
];

export function Sidebar({ collapsed, mobileOpen, onToggleCollapsed, onCloseMobile }: Props) {
  return (
    <>
      <div className={`${s.backdrop} ${mobileOpen ? s.backdropVisible : ''}`} onClick={onCloseMobile} aria-hidden="true" />
      <aside
        className={`${s.sidebar} ${collapsed ? s.collapsed : ''} ${mobileOpen ? s.mobileOpen : ''}`}
        aria-label="Главное меню"
      >
        <div className={s.top}>
          <div className={s.brandRow}>
            <span className={s.brand}>CRM</span>
            <button type="button" className={s.iconButton} aria-label="Уведомления" title="Уведомления">
              <Icon name="bell" />
            </button>
          </div>
          <nav className={s.menu}>
            {ITEMS.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className={`${s.item} ${item.active ? s.itemActive : ''}`}
                aria-current={item.active ? 'page' : undefined}
                title={collapsed ? item.label : undefined}
                onClick={(e) => {
                  e.preventDefault();
                  onCloseMobile();
                }}
              >
                <Icon name={item.icon} />
                <span className={s.label}>{item.label}</span>
              </a>
            ))}
          </nav>
        </div>
        <button type="button" className={`${s.item} ${s.collapseBtn}`} onClick={onToggleCollapsed}>
          <Icon name="sidebar" />
          <span className={s.label}>{collapsed ? 'Развернуть меню' : 'Свернуть меню'}</span>
        </button>
      </aside>
    </>
  );
}
