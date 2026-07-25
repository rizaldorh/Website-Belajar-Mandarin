import { useEffect, useRef } from 'react';
import chapterData from '../data/chapter1.json';
import type { Chapter } from '../types';
import { useReaderStore } from '../store/readerStore';
import * as tts from '../lib/tts';

const chapter = chapterData as Chapter;

export default function Toolbar() {
  const showChinese = useReaderStore((s) => s.showChinese);
  const showPinyin = useReaderStore((s) => s.showPinyin);
  const showTranslation = useReaderStore((s) => s.showTranslation);
  const colorMode = useReaderStore((s) => s.colorMode);
  const toggleChinese = useReaderStore((s) => s.toggleChinese);
  const togglePinyin = useReaderStore((s) => s.togglePinyin);
  const toggleTranslation = useReaderStore((s) => s.toggleTranslation);
  const setColorMode = useReaderStore((s) => s.setColorMode);
  const timeoutIdsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    return () => {
      timeoutIdsRef.current.forEach(clearTimeout);
    };
  }, []);

  function readChapterAloud() {
    timeoutIdsRef.current.forEach(clearTimeout);
    timeoutIdsRef.current = [];
    const sentences = chapter.paragraphs.flatMap((p) => p.sentences);
    sentences.forEach((sentence, index) => {
      const text = sentence.tokens.map((t) => t.hanzi).join('');
      const id = setTimeout(() => tts.speak(text), index * 3000);
      timeoutIdsRef.current.push(id);
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 p-2">
      <button
        type="button"
        aria-pressed={showChinese}
        onClick={toggleChinese}
        className="rounded px-3 py-1 text-sm font-semibold aria-pressed:bg-gray-900 aria-pressed:text-white"
      >
        汉
      </button>
      <button
        type="button"
        aria-pressed={showPinyin}
        onClick={togglePinyin}
        className="rounded px-3 py-1 text-sm font-semibold aria-pressed:bg-gray-900 aria-pressed:text-white"
      >
        拼音
      </button>
      <button
        type="button"
        aria-pressed={showTranslation}
        onClick={toggleTranslation}
        className="rounded px-3 py-1 text-sm font-semibold aria-pressed:bg-gray-900 aria-pressed:text-white"
      >
        Terjemahan
      </button>
      <button
        type="button"
        onClick={() => setColorMode(colorMode === 'pos' ? 'hsk' : 'pos')}
        className="rounded px-3 py-1 text-sm font-semibold"
      >
        Warna: {colorMode === 'pos' ? 'Jenis kata' : 'Level HSK'}
      </button>
      <button
        type="button"
        onClick={readChapterAloud}
        className="rounded bg-yellow-400 px-3 py-1 text-sm font-semibold"
      >
        ▶ Baca
      </button>
    </div>
  );
}
