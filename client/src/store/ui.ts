import { create } from 'zustand';
import type { AnchorRect } from '../components/ui/Popover';

export type PopoverState =
  | { kind: 'quick'; date: string; anchor: AnchorRect }
  | { kind: 'picker'; anchor: AnchorRect }
  | { kind: 'edit'; anchor: AnchorRect };

interface UiState {
  popover: PopoverState | null;
  open: (p: PopoverState) => void;
  close: () => void;
}

export const useUi = create<UiState>()((set) => ({
  popover: null,
  open: (popover) => set({ popover }),
  close: () => set({ popover: null }),
}));
