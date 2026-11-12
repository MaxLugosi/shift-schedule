import { useEffect } from 'react';
import { useSchedule } from '../store/schedule';
import { Icon } from './icons';
import s from './Toast.module.css';

export function Toast() {
  const toast = useSchedule((st) => st.toast);
  const dismiss = useSchedule((st) => st.dismissToast);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(dismiss, toast.kind === 'error' ? 6000 : 3000);
    return () => window.clearTimeout(t);
  }, [toast, dismiss]);

  return (
    <div className={s.region} role="status" aria-live="polite">
      {toast && (
        <div key={toast.id} className={`${s.toast} ${s[toast.kind]}`}>
          <span>{toast.text}</span>
          <button type="button" className={s.close} onClick={dismiss} aria-label="Закрыть уведомление">
            <Icon name="close" size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
