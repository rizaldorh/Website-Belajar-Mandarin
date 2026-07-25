import { afterEach, describe, expect, it, vi } from 'vitest';
import { isSpeechSupported, speak } from './tts';

describe('tts', () => {
  const originalSpeechSynthesis = (window as unknown as { speechSynthesis?: unknown }).speechSynthesis;
  const originalUtterance = (window as unknown as { SpeechSynthesisUtterance?: unknown }).SpeechSynthesisUtterance;

  afterEach(() => {
    (window as unknown as { speechSynthesis?: unknown }).speechSynthesis = originalSpeechSynthesis;
    (window as unknown as { SpeechSynthesisUtterance?: unknown }).SpeechSynthesisUtterance = originalUtterance;
  });

  it('reports unsupported when speechSynthesis is absent', () => {
    delete (window as unknown as { speechSynthesis?: unknown }).speechSynthesis;
    expect(isSpeechSupported()).toBe(false);
  });

  it('speaks the given text in Mandarin by default when supported', () => {
    const speakFn = vi.fn();
    const cancelFn = vi.fn();
    (window as unknown as { speechSynthesis: unknown }).speechSynthesis = { speak: speakFn, cancel: cancelFn };
    (window as unknown as { SpeechSynthesisUtterance: unknown }).SpeechSynthesisUtterance = vi
      .fn()
      .mockImplementation((text: string) => ({ text, lang: '' }));

    speak('兔子');

    expect(cancelFn).toHaveBeenCalled();
    expect(speakFn).toHaveBeenCalledTimes(1);
    const utterance = speakFn.mock.calls[0][0] as { text: string; lang: string };
    expect(utterance.text).toBe('兔子');
    expect(utterance.lang).toBe('zh-CN');
  });

  it('does nothing when speech is unsupported', () => {
    delete (window as unknown as { speechSynthesis?: unknown }).speechSynthesis;
    expect(() => speak('兔子')).not.toThrow();
  });

  it('sets utterance.onend to the passed onEnd callback', () => {
    const speakFn = vi.fn();
    const cancelFn = vi.fn();
    (window as unknown as { speechSynthesis: unknown }).speechSynthesis = { speak: speakFn, cancel: cancelFn };
    let constructedUtterance: { text: string; lang: string; onend: unknown } | undefined;
    (window as unknown as { SpeechSynthesisUtterance: unknown }).SpeechSynthesisUtterance = vi
      .fn()
      .mockImplementation((text: string) => {
        constructedUtterance = { text, lang: '', onend: null };
        return constructedUtterance;
      });

    const onEnd = vi.fn();
    speak('兔子', 'zh-CN', onEnd);

    expect(constructedUtterance?.onend).toBe(onEnd);
  });

  it('calls onEnd once when speech is unsupported so a chained sequence still advances', () => {
    delete (window as unknown as { speechSynthesis?: unknown }).speechSynthesis;
    const onEnd = vi.fn();
    speak('兔子', 'zh-CN', onEnd);
    expect(onEnd).toHaveBeenCalledTimes(1);
  });
});
