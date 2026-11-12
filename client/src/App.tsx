import { useEffect, useState } from 'react';
import { PageHeader } from './components/PageHeader';
import { Sidebar } from './components/Sidebar';
import { Toast } from './components/Toast';
import { DragLayer } from './components/schedule/DragLayer';
import { Popovers } from './components/schedule/Popovers';
import { ScheduleGrid } from './components/schedule/ScheduleGrid';
import { SelectionBar } from './components/schedule/SelectionBar';
import { SidePanel } from './components/schedule/SidePanel';
import { Toolbar } from './components/schedule/Toolbar';
import { useHotkeys } from './hooks/useHotkeys';
import { useSchedule } from './store/schedule';
import s from './App.module.css';

const COLLAPSE_KEY = 'sidebar-collapsed';

export function App() {
  const init = useSchedule((st) => st.init);
  const loadError = useSchedule((st) => st.loadError);
  const hasSelection = useSchedule((st) => Object.keys(st.selected).length > 0);
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    void init();
  }, [init]);
  useHotkeys();

  const toggleCollapsed = () => {
    setCollapsed((c) => {
      try {
        localStorage.setItem(COLLAPSE_KEY, c ? '0' : '1');
      } catch {
        // ignore
      }
      return !c;
    });
  };

  return (
    <div className={s.page}>
      <Sidebar
        collapsed={collapsed}
        mobileOpen={menuOpen}
        onToggleCollapsed={toggleCollapsed}
        onCloseMobile={() => setMenuOpen(false)}
      />
      <main className={s.main}>
        <PageHeader onOpenMenu={() => setMenuOpen(true)} />
        {loadError ? (
          <div className={s.error} role="alert">
            <p>Не удалось загрузить данные: {loadError}</p>
            <button type="button" className={s.retry} onClick={() => void init()}>
              Повторить
            </button>
          </div>
        ) : (
          <div className={s.body}>
            <section className={`${s.card} ${hasSelection ? s.withSelection : ''}`} aria-label="Календарь смен">
              {hasSelection ? <SelectionBar /> : <Toolbar />}
              <ScheduleGrid />
            </section>
            <SidePanel />
          </div>
        )}
      </main>
      <Popovers />
      <DragLayer />
      <Toast />
    </div>
  );
}
