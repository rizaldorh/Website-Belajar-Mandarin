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

  it('reads each sentence in order, advancing only when the previous one finishes', () => {
    const speakSpy = vi.spyOn(tts, 'speak').mockImplementation((_text, _lang, onEnd) => {
      onEnd?.();
    });
    render(<Toolbar />);
    fireEvent.click(screen.getByText('▶ Baca'));
    expect(speakSpy).toHaveBeenCalledTimes(5); // chapter1.json has 5 sentences (p1s1-p1s5)
  });

  it('cancels the previous read-aloud chain when clicked again before it finishes', () => {
    const pendingOnEnds: Array<() => void> = [];
    const speakSpy = vi.spyOn(tts, 'speak').mockImplementation((_text, _lang, onEnd) => {
      if (onEnd) pendingOnEnds.push(onEnd);
    });
    render(<Toolbar />);
    fireEvent.click(screen.getByText('▶ Baca'));
    expect(speakSpy).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByText('▶ Baca'));
    expect(speakSpy).toHaveBeenCalledTimes(2);
    pendingOnEnds[0](); // the stale first chain's utterance "finishes" — should NOT advance
    expect(speakSpy).toHaveBeenCalledTimes(2);
    pendingOnEnds[1](); // the current chain's utterance finishes — SHOULD advance
    expect(speakSpy).toHaveBeenCalledTimes(3);
  });

  it('does not continue the read-aloud chain after unmount', () => {
    const pendingOnEnds: Array<() => void> = [];
    const speakSpy = vi.spyOn(tts, 'speak').mockImplementation((_text, _lang, onEnd) => {
      if (onEnd) pendingOnEnds.push(onEnd);
    });
    const { unmount } = render(<Toolbar />);
    fireEvent.click(screen.getByText('▶ Baca'));
    expect(speakSpy).toHaveBeenCalledTimes(1);
    unmount();
    pendingOnEnds[0]();
    expect(speakSpy).toHaveBeenCalledTimes(1);
  });
});
