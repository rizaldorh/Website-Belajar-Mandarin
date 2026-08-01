'use client';

import { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useReaderStore } from '@/store/readerStore';
import * as tts from '@/lib/tts';
import type { Chapter, Sentence } from '@/types';

type PlayState = 'idle' | 'playing' | 'paused';

interface ChapterSummary {
  id: string;
  title: string | null;
  order_index: number;
}

interface Props {
  chapter: Chapter;
  bookId: string;
  allChapters: ChapterSummary[];
}

export default function Toolbar({ chapter, bookId, allChapters }: Props) {
  const showChinese = useReaderStore((s) => s.showChinese);
  const showPinyin = useReaderStore((s) => s.showPinyin);
  const colorMode = useReaderStore((s) => s.colorMode);
  const playbackRate = useReaderStore((s) => s.playbackRate);
  const toggleChinese = useReaderStore((s) => s.toggleChinese);
  const togglePinyin = useReaderStore((s) => s.togglePinyin);
  const setColorMode = useReaderStore((s) => s.setColorMode);
  const setPlaybackRate = useReaderStore((s) => s.setPlaybackRate);
  const setActiveWordIndex = useReaderStore((s) => s.setActiveWordIndex);

  const [playState, setPlayState] = useState<PlayState>('idle');

  // --- Native audio (real recording) ---
  const nativeAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Clean up audio element when navigating away
    return () => {
      if (nativeAudioRef.current) {
        nativeAudioRef.current.pause();
        nativeAudioRef.current.src = '';
        nativeAudioRef.current = null;
      }
    };
  }, []);

  // --- TTS fallback ---
  const playbackIdRef = useRef(0);
  const sentencesRef = useRef<Sentence[]>([]);
  const currentSentenceRef = useRef(0);
  const playbackRateRef = useRef(playbackRate);
  useEffect(() => { playbackRateRef.current = playbackRate; }, [playbackRate]);

  const router = useRouter();

  const hasAudio = Boolean(chapter.audio_url);

  // ---- Playback actions ----

  function readChapterAloud() {
    if (hasAudio) {
      if (!nativeAudioRef.current) {
        const audio = new Audio(chapter.audio_url!);
        audio.onended = () => { setPlayState('idle'); };
        nativeAudioRef.current = audio;
      }
      nativeAudioRef.current.currentTime = 0;
      void nativeAudioRef.current.play();
      setPlayState('playing');
    } else {
      sentencesRef.current = chapter.content_json.paragraphs.flatMap((p) => p.sentences);
      ttsPlayFrom(0);
    }
  }

  function handlePause() {
    if (hasAudio && nativeAudioRef.current) {
      nativeAudioRef.current.pause();
    } else {
      playbackIdRef.current++;
      window.speechSynthesis.cancel();
    }
    setPlayState('paused');
  }

  function handleResume() {
    if (hasAudio && nativeAudioRef.current) {
      void nativeAudioRef.current.play();
      setPlayState('playing');
    } else {
      ttsPlayFrom(currentSentenceRef.current);
    }
  }

  function stopPlayback() {
    if (hasAudio && nativeAudioRef.current) {
      nativeAudioRef.current.pause();
      nativeAudioRef.current.currentTime = 0;
    } else {
      playbackIdRef.current++;
      window.speechSynthesis.cancel();
      setActiveWordIndex(null);
    }
    setPlayState('idle');
  }

  // ---- TTS helpers ----

  function ttsPlayFrom(fromIndex: number) {
    const playbackId = ++playbackIdRef.current;
    setPlayState('playing');

    function playAt(index: number) {
      currentSentenceRef.current = index;
      if (playbackId !== playbackIdRef.current || index >= sentencesRef.current.length) {
        if (playbackId === playbackIdRef.current) {
          setActiveWordIndex(null);
          setPlayState('idle');
        }
        return;
      }
      const sentence = sentencesRef.current[index];
      const text = sentence.tokens.map((t) => t.hanzi).join('');
      const charOffsets = tts.buildCharOffsets(sentence.tokens);
      tts.speakWithHighlight(
        text,
        charOffsets,
        (tokenIdx) => setActiveWordIndex(tokenIdx === -1 ? null : `${sentence.id}-${tokenIdx}`),
        () => playAt(index + 1),
        playbackRateRef.current,
      );
    }

    playAt(fromIndex);
  }

  const rates: Array<0.5 | 0.75 | 1.0> = [0.5, 0.75, 1.0];

  return (
    <nav className="sticky top-1 z-40 border-b bg-white shadow-sm">
      {/* Navigation row */}
      <div className="flex items-center gap-2 border-b px-4 py-1.5 text-sm">
        <Link href="/" className="shrink-0 text-gray-500 hover:text-gray-800">
          ← Beranda
        </Link>
        <span className="text-gray-300">|</span>
        <select
          value={chapter.id}
          onChange={(e) => {
            if (playState !== 'idle') stopPlayback();
            router.push(`/books/${bookId}/chapters/${e.target.value}`);
          }}
          className="min-w-0 flex-1 truncate rounded border-0 bg-transparent py-0.5 text-sm font-medium text-gray-700 focus:outline-none focus:ring-1 focus:ring-teal-500"
        >
          {allChapters.map((c) => (
            <option key={c.id} value={c.id}>
              Bab {c.order_index}: {c.title ?? `Bab ${c.order_index}`}
            </option>
          ))}
        </select>
      </div>

      {/* Controls row */}
      <div className="flex flex-wrap items-center gap-3 px-4 py-2 text-sm">
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

        {(hasAudio || tts.isSpeechSupported()) && (
          <>
            {playState === 'idle' && (
              <button
                onClick={readChapterAloud}
                className="rounded bg-teal-600 px-2 py-1 text-white"
              >
                ▶ Baca{hasAudio ? ' 🎧' : ''}
              </button>
            )}
            {playState === 'playing' && (
              <>
                <button onClick={handlePause} className="rounded bg-amber-500 px-2 py-1 text-white">
                  ⏸ Jeda
                </button>
                <button onClick={stopPlayback} className="rounded bg-gray-200 px-2 py-1 text-gray-700" aria-label="Stop">
                  ⏹
                </button>
              </>
            )}
            {playState === 'paused' && (
              <>
                <button onClick={handleResume} className="rounded bg-teal-600 px-2 py-1 text-white">
                  ▶ Lanjut
                </button>
                <button onClick={stopPlayback} className="rounded bg-gray-200 px-2 py-1 text-gray-700" aria-label="Stop">
                  ⏹
                </button>
              </>
            )}
            {/* Speed buttons only relevant for TTS */}
            {!hasAudio && (
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
            )}
          </>
        )}
      </div>
    </nav>
  );
}
