import { useEffect } from 'react';
import { pendingChanges, useSchedule } from '../store/schedule';
import { useUi } from '../store/ui';

const isTyping = (el: EventTarget | null) =>
  el instanceof HTMLElement && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));

// 1/2/3 - шаблон на выделенное, Delete - очистить, Esc - снять выделение, Ctrl+Z, Ctrl+S
export function useHotkeys() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const st = useSchedule.getState();
      const mod = e.ctrlKey || e.metaKey;

      if (mod && e.code === 'KeyS') {
        e.preventDefault();
        void st.save();
        return;
      }
      if (isTyping(e.target) || useUi.getState().popover) return;

      if (mod && e.code === 'KeyZ' && !e.shiftKey) {
        e.preventDefault();
        st.undo();
        return;
      }
      if (mod || e.altKey) return;

      const keys = Object.keys(st.selected);
      if (e.key === 'Escape') {
        st.clearSelection();
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && keys.length) {
        e.preventDefault();
        st.clear(keys);
      } else if (/^[1-9]$/.test(e.key) && keys.length) {
        const tpl = st.templates.find((t) => t.hotkey === Number(e.key));
        if (tpl) {
          e.preventDefault();
          st.assign(keys, { startTime: tpl.startTime, endTime: tpl.endTime, templateId: tpl.id });
        }
      }
    };

    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      const changes = pendingChanges(useSchedule.getState());
      if (changes.upserts.length || changes.deletes.length) {
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', onKey);
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  }, []);
}
