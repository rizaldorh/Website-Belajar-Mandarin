import type { Token } from '@/types';

export function isSpeechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export function speak(text: string, lang = 'zh-CN', onEnd?: () => void): void {
  if (!isSpeechSupported()) {
    onEnd?.();
    return;
  }
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  if (onEnd) {
    utterance.onend = onEnd;
  }
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

export function buildCharOffsets(tokens: Token[]): number[] {
  const offsets: number[] = [];
  let total = 0;
  for (const t of tokens) {
    offsets.push(total);
    total += t.hanzi.length;
  }
  return offsets;
}

export function speakWithHighlight(
  text: string,
  charOffsets: number[],
  onWordChange: (tokenIndex: number) => void,
  onEnd: () => void,
  rate: 0.5 | 0.75 | 1.0 = 1.0,
): void {
  if (!isSpeechSupported()) {
    onEnd();
    return;
  }

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'zh-CN';
  utterance.rate = rate;

  let boundaryFired = false;
  const fallback = setTimeout(() => {
    if (!boundaryFired) onWordChange(-1); // iOS: highlight whole sentence
  }, 500);

  utterance.onboundary = (event: SpeechSynthesisEvent) => {
    if (event.name !== 'word') return;
    boundaryFired = true;
    clearTimeout(fallback);
    const charIndex = event.charIndex;
    let idx = charOffsets.length - 1;
    for (let i = 0; i < charOffsets.length; i++) {
      if (charOffsets[i] > charIndex) {
        idx = i - 1;
        break;
      }
    }
    onWordChange(Math.max(0, idx));
  };

  utterance.onend = () => {
    clearTimeout(fallback);
    onEnd();
  };

  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}
