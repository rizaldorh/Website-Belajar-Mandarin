import { useEffect, useRef } from 'react';
import chapterData from '../data/chapter1.json';
import type { ChapterContent } from '../types';
import { useReaderStore } from '../store/readerStore';
import * as tts from '../lib/tts';

const chapter = chapterData as ChapterContent;

export default function Toolbar() {
  const showChinese = useReaderStore((s) => s.showChinese);
  const showPinyin = useReaderStore((s) => s.showPinyin);
  const showTranslation = useReaderStore((s) => s.showTranslation);
  const colorMode = useReaderStore((s) => s.colorMode);
  const toggleChinese = useReaderStore((s) => s.toggleChinese);
  const togglePinyin = useReaderStore((s) => s.togglePinyin);
  const toggleTranslation = useReaderStore((s) => s.toggleTranslation);
  const setColorMode = useReaderStore((s) => s.setColorMode);
  const playbackIdRef = useRef(0);

  useEffect(() => {
    return () => {
      playbackIdRef.current += 1;
    };
  }, []);

  function readChapterAloud() {
    const playbackId = ++playbackIdRef.current;
    const sentences = chapter.paragraphs.flatMap((p) => p.sentences);

    function playAt(index: number) {
      if (playbackId !== playbackIdRef.current || index >= sentences.length) return;
      const text = sentences[index].tokens.map((t) => t.hanzi).join('');
      tts.speak(text, 'zh-CN', () => playAt(index + 1));
    }

    playAt(0);
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
      {tts.isSpeechSupported() && (
        <button
          type="button"
          onClick={readChapterAloud}
          className="rounded bg-yellow-400 px-3 py-1 text-sm font-semibold"
        >
          ▶ Baca
        </button>
      )}
    </div>
  );
}
