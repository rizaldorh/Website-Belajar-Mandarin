import { act } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useReaderStore } from './readerStore';

const initialState = useReaderStore.getState();

describe('useReaderStore', () => {
  beforeEach(() => {
    useReaderStore.setState(initialState, true);
  });

  it('defaults to Chinese and pinyin visible, translation hidden, pos color mode', () => {
    const state = useReaderStore.getState();
    expect(state.showChinese).toBe(true);
    expect(state.showPinyin).toBe(true);
    expect(state.showTranslation).toBe(false);
    expect(state.colorMode).toBe('pos');
    expect(state.activeTokenId).toBeNull();
  });

  it('toggles visibility flags independently', () => {
    useReaderStore.getState().toggleChinese();
    expect(useReaderStore.getState().showChinese).toBe(false);
    expect(useReaderStore.getState().showPinyin).toBe(true);
  });

  it('switches color mode', () => {
    useReaderStore.getState().setColorMode('hsk');
    expect(useReaderStore.getState().colorMode).toBe('hsk');
  });

  it('sets and clears the active token id', () => {
    useReaderStore.getState().setActiveTokenId('p1s1-2');
    expect(useReaderStore.getState().activeTokenId).toBe('p1s1-2');
    useReaderStore.getState().setActiveTokenId(null);
    expect(useReaderStore.getState().activeTokenId).toBeNull();
  });
});

describe('readerStore additions', () => {
  beforeEach(() => {
    useReaderStore.setState({
      activeWordIndex: null,
      playbackRate: 1.0,
      colorPalette: 'default',
    });
  });

  it('setActiveWordIndex updates activeWordIndex', () => {
    act(() => useReaderStore.getState().setActiveWordIndex('p1s1-2'));
    expect(useReaderStore.getState().activeWordIndex).toBe('p1s1-2');
  });

  it('setPlaybackRate persists rate', () => {
    act(() => useReaderStore.getState().setPlaybackRate(0.5));
    expect(useReaderStore.getState().playbackRate).toBe(0.5);
  });

  it('setColorPalette updates palette', () => {
    act(() => useReaderStore.getState().setColorPalette('colorblind'));
    expect(useReaderStore.getState().colorPalette).toBe('colorblind');
  });
});
