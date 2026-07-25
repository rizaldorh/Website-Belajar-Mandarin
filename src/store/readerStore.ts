import { create } from 'zustand';
import type { ColorMode } from '../types';

export interface ReaderState {
  showChinese: boolean;
  showPinyin: boolean;
  showTranslation: boolean;
  colorMode: ColorMode;
  activeTokenId: string | null;
  toggleChinese: () => void;
  togglePinyin: () => void;
  toggleTranslation: () => void;
  setColorMode: (mode: ColorMode) => void;
  setActiveTokenId: (id: string | null) => void;
}

export const useReaderStore = create<ReaderState>((set) => ({
  showChinese: true,
  showPinyin: true,
  showTranslation: false,
  colorMode: 'pos',
  activeTokenId: null,
  toggleChinese: () => set((s) => ({ showChinese: !s.showChinese })),
  togglePinyin: () => set((s) => ({ showPinyin: !s.showPinyin })),
  toggleTranslation: () => set((s) => ({ showTranslation: !s.showTranslation })),
  setColorMode: (mode) => set({ colorMode: mode }),
  setActiveTokenId: (id) => set({ activeTokenId: id }),
}));
