import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Toolbar from './Toolbar';
import { useReaderStore } from '../store/readerStore';
import * as tts from '../lib/tts';

const initialState = useReaderStore.getState();

describe('Toolbar', () => {
  beforeEach(() => {
    useReaderStore.setState(initialState, true);
  });

  it('toggles Chinese visibility', () => {
    render(<Toolbar />);
    const button = screen.getByText('汉');
    expect(useReaderStore.getState().showChinese).toBe(true);
    fireEvent.click(button);
    expect(useReaderStore.getState().showChinese).toBe(false);
  });

  it('switches color mode label between Jenis kata and Level HSK', () => {
    render(<Toolbar />);
    fireEvent.click(screen.getByText('Warna: Jenis kata'));
    expect(screen.getByText('Warna: Level HSK')).toBeInTheDocument();
  });

  it('reads each sentence aloud in order on a delay', () => {
    vi.useFakeTimers();
    const speakSpy = vi.spyOn(tts, 'speak').mockImplementation(() => {});
    render(<Toolbar />);
    fireEvent.click(screen.getByText('▶ Baca'));

    expect(speakSpy).not.toHaveBeenCalled();
    vi.advanceTimersByTime(0);
    expect(speakSpy).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(3000);
    expect(speakSpy).toHaveBeenCalledTimes(2);

    vi.useRealTimers();
  });

  it('re-clicking Baca cancels leftover timers', () => {
    vi.useFakeTimers();
    const speakSpy = vi.spyOn(tts, 'speak').mockImplementation(() => {});
    render(<Toolbar />);
    fireEvent.click(screen.getByText('▶ Baca'));
    vi.advanceTimersByTime(3000);
    expect(speakSpy).toHaveBeenCalledTimes(2);
    fireEvent.click(screen.getByText('▶ Baca'));
    vi.advanceTimersByTime(12000);
    expect(speakSpy).toHaveBeenCalledTimes(7);

    vi.useRealTimers();
  });

  it('unmounting cancels pending timers', () => {
    vi.useFakeTimers();
    const speakSpy = vi.spyOn(tts, 'speak').mockImplementation(() => {});
    const { unmount } = render(<Toolbar />);
    fireEvent.click(screen.getByText('▶ Baca'));
    unmount();
    vi.advanceTimersByTime(15000);
    expect(speakSpy).not.toHaveBeenCalled();

    vi.useRealTimers();
  });
});
