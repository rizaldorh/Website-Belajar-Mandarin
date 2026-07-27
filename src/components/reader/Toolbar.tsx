'use client';

import { useRef } from 'react';
import { useReaderStore } from '@/store/readerStore';
import * as tts from '@/lib/tts';
import type { Chapter } from '@/types';

interface Props {
  chapter: Chapter;
}

export default function Toolbar({ chapter }: Props) {
  const showChinese = useReaderStore((s) => s.showChinese);
  const showPinyin = useReaderStore((s) => s.showPinyin);
  const colorMode = useReaderStore((s) => s.colorMode);
  const playbackRate = useReaderStore((s) => s.playbackRate);
  const toggleChinese = useReaderStore((s) => s.toggleChinese);
  const togglePinyin = useReaderStore((s) => s.togglePinyin);
  const setColorMode = useReaderStore((s) => s.setColorMode);
  const setPlaybackRate = useReaderStore((s) => s.setPlaybackRate);
  const setActiveWordIndex = useReaderStore((s) => s.setActiveWordIndex);

  const playbackIdRef = useRef(0);

  function readChapterAloud() {
    const playbackId = ++playbackIdRef.current;
    const sentences = chapter.content_json.paragraphs.flatMap((p) => p.sentences);

    function playAt(index: number) {
      if (playbackId !== playbackIdRef.current || index >= sentences.length) {
        setActiveWordIndex(null);
        return;
      }
      const sentence = sentences[index];
      const tokens = sentence.tokens;
      const text = tokens.map((t) => t.hanzi).join('');
      const charOffsets = tts.buildCharOffsets(tokens);

      tts.speakWithHighlight(
        text,
        charOffsets,
        (tokenIdx) => {
          if (tokenIdx === -1) {
            // iOS fallback: no per-word highlight
            setActiveWordIndex(null);
          } else {
            setActiveWordIndex(`${sentence.id}-${tokenIdx}`);
          }
        },
        () => playAt(index + 1),
        playbackRate,
      );
    }

    playAt(0);
  }

  const rates: Array<0.5 | 0.75 | 1.0> = [0.5, 0.75, 1.0];

  return (
    <nav className="sticky top-1 z-40 border-b bg-white px-4 py-2">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <button
          onClick={toggleChinese}
          className={`rounded px-2 py-1 ${showChinese ? 'bg-gray-800 text-white' : 'bg-gray-100'}`}
        >
          汉字
        </button>
        <button
          onClick={togglePinyin}
          className={`rounded px-2 py-1 ${showPinyin ? 'bg-gray-800 text-white' : 'bg-gray-100'}`}
        >
          Pinyin
        </button>
        <select
          value={colorMode}
          onChange={(e) => setColorMode(e.target.value as 'pos' | 'hsk')}
          className="rounded border px-2 py-1 text-sm"
        >
          <option value="pos">Warna: Jenis kata</option>
          <option value="hsk">Warna: HSK</option>
        </select>
        {tts.isSpeechSupported() && (
          <>
            <button onClick={readChapterAloud} className="rounded bg-teal-600 px-2 py-1 text-white">
              ▶ Baca
            </button>
            <div className="flex gap-1">
              {rates.map((r) => (
                <button
                  key={r}
                  onClick={() => setPlaybackRate(r)}
                  className={`rounded px-1.5 py-0.5 text-xs ${
                    playbackRate === r ? 'bg-gray-800 text-white' : 'bg-gray-100'
                  }`}
                >
                  {r}×
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </nav>
  );
}
