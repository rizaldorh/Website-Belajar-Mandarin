import { create } from 'zustand';
import type { ColorMode } from '../types';

type Palette = 'default' | 'colorblind' | 'off';
type Rate = 0.5 | 0.75 | 1.0;

export interface ReaderState {
  showChinese: boolean;
  showPinyin: boolean;
  showTranslation: boolean;
  colorMode: ColorMode;
  activeTokenId: string | null;
  activeWordIndex: string | null;
  playbackRate: Rate;
  colorPalette: Palette;
  toggleChinese: () => void;
  togglePinyin: () => void;
  toggleTranslation: () => void;
  setColorMode: (mode: ColorMode) => void;
  setActiveTokenId: (id: string | null) => void;
  setActiveWordIndex: (id: string | null) => void;
  setPlaybackRate: (rate: Rate) => void;
  setColorPalette: (palette: Palette) => void;
}

export const useReaderStore = create<ReaderState>((set) => ({
  showChinese: true,
  showPinyin: true,
  showTranslation: false,
  colorMode: 'pos',
  activeTokenId: null,
  activeWordIndex: null,
  playbackRate: 1.0,
  colorPalette: 'default',
  toggleChinese: () => set((s) => ({ showChinese: !s.showChinese })),
  togglePinyin: () => set((s) => ({ showPinyin: !s.showPinyin })),
  toggleTranslation: () => set((s) => ({ showTranslation: !s.showTranslation })),
  setColorMode: (mode) => set({ colorMode: mode }),
  setActiveTokenId: (id) => set({ activeTokenId: id }),
  setActiveWordIndex: (id) => set({ activeWordIndex: id }),
  setPlaybackRate: (rate) => set({ playbackRate: rate }),
  setColorPalette: (palette) => set({ colorPalette: palette }),
}));
