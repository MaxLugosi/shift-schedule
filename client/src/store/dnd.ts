import type { PointerEvent as ReactPointerEvent } from 'react';
import { create } from 'zustand';
import { useSchedule, type CellKey } from './schedule';

export type DragItem = { kind: 'shift'; from: CellKey } | { kind: 'template'; templateId: number };

interface DndState {
  item: DragItem | null;
  x: number;
  y: number;
  overKey: CellKey | null;
  copy: boolean;
}

export const useDnd = create<DndState>()(() => ({ item: null, x: 0, y: 0, overKey: null, copy: false }));

const DRAG_THRESHOLD = 5;

function cellAt(x: number, y: number): CellKey | null {
  const el = document.elementFromPoint(x, y);
  const cell = el?.closest<HTMLElement>('[data-cell]');
  return cell?.dataset.cell ?? null;
}

export function dropOn(item: DragItem, target: CellKey, copy: boolean) {
  const sch = useSchedule.getState();
  if (item.kind === 'shift') {
    sch.move(item.from, target, copy);
    return;
  }
  const tpl = sch.templates.find((t) => t.id === item.templateId);
  if (!tpl) return;
  // бросили шаблон на выделенную ячейку - заполняем всё выделение
  const keys = sch.selected[target] ? Object.keys(sch.selected) : [target];
  sch.assign(keys, { startTime: tpl.startTime, endTime: tpl.endTime, templateId: tpl.id });
}

// html5 dnd не работает на тач-экранах, поэтому на pointer events
export function startDragTracking(e: ReactPointerEvent, item: DragItem) {
  if (e.button !== 0) return;
  const startX = e.clientX;
  const startY = e.clientY;
  const pointerId = e.pointerId;
  let started = false;

  const onMove = (ev: PointerEvent) => {
    if (ev.pointerId !== pointerId) return;
    if (!started) {
      if (Math.hypot(ev.clientX - startX, ev.clientY - startY) < DRAG_THRESHOLD) return;
      started = true;
      document.body.classList.add('is-dragging');
    }
    ev.preventDefault();
    autoScroll(ev.clientX, ev.clientY);
    useDnd.setState({
      item,
      x: ev.clientX,
      y: ev.clientY,
      overKey: cellAt(ev.clientX, ev.clientY),
      copy: ev.altKey || ev.ctrlKey || ev.metaKey,
    });
  };

  const finish = (ev: PointerEvent, cancelled: boolean) => {
    if (ev.pointerId !== pointerId) return;
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('pointercancel', onCancel);
    if (!started) return;
    document.body.classList.remove('is-dragging');
    const target = cellAt(ev.clientX, ev.clientY);
    useDnd.setState({ item: null, overKey: null });
    const swallow = (ce: MouseEvent) => {
      ce.stopPropagation();
      ce.preventDefault();
    };
    window.addEventListener('click', swallow, { capture: true, once: true });
    window.setTimeout(() => window.removeEventListener('click', swallow, { capture: true }), 0);
    if (!cancelled && target) dropOn(item, target, ev.altKey || ev.ctrlKey || ev.metaKey);
  };
  const onUp = (ev: PointerEvent) => finish(ev, false);
  const onCancel = (ev: PointerEvent) => finish(ev, true);

  window.addEventListener('pointermove', onMove, { passive: false });
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onCancel);
}

function autoScroll(x: number, y: number) {
  const scroller = document.querySelector<HTMLElement>('[data-grid-scroller]');
  if (!scroller) return;
  const r = scroller.getBoundingClientRect();
  const EDGE = 40;
  const SPEED = 12;
  if (x > r.right - EDGE && x < r.right + EDGE) scroller.scrollLeft += SPEED;
  else if (x < r.left + EDGE && x > r.left - EDGE) scroller.scrollLeft -= SPEED;
  if (y > r.bottom - EDGE && y < r.bottom + EDGE) scroller.scrollTop += SPEED;
  else if (y < r.top + EDGE && y > r.top - EDGE) scroller.scrollTop -= SPEED;
}
