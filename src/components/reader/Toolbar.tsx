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
  const [ttsLoading, setTtsLoading] = useState(false);

  // native recorded audio (chapter.audio_url)
  const nativeAudioRef = useRef<HTMLAudioElement | null>(null);

  // HF TTS: one Audio element per sentence
  const ttsSentenceAudioRef = useRef<HTMLAudioElement | null>(null);

  // Web Speech fallback state
  const playbackIdRef = useRef(0);
  const sentencesRef = useRef<Sentence[]>([]);
  const currentSentenceRef = useRef(0);
  const playbackRateRef = useRef(playbackRate);
  useEffect(() => { playbackRateRef.current = playbackRate; }, [playbackRate]);

  const router = useRouter();
  const hasAudio = Boolean(chapter.audio_url);

  useEffect(() => {
    return () => {
      nativeAudioRef.current?.pause();
      nativeAudioRef.current = null;
      ttsSentenceAudioRef.current?.pause();
      ttsSentenceAudioRef.current = null;
    };
  }, []);

  // ── Playback entry points ──────────────────────────────────────────────

  function readChapterAloud() {
    if (hasAudio) {
      if (!nativeAudioRef.current) {
        const audio = new Audio(chapter.audio_url!);
        audio.onended = () => setPlayState('idle');
        nativeAudioRef.current = audio;
      }
      nativeAudioRef.current.currentTime = 0;
      void nativeAudioRef.current.play();
      setPlayState('playing');
    } else {
      sentencesRef.current = chapter.content_json.paragraphs.flatMap((p) => p.sentences);
      void hfTtsPlayFrom(0);
    }
  }

  function handlePause() {
    if (hasAudio && nativeAudioRef.current) {
      nativeAudioRef.current.pause();
    } else {
      ttsSentenceAudioRef.current?.pause(); // resolves the onpause promise below
      playbackIdRef.current++;
      window.speechSynthesis.cancel();
    }
    setPlayState('paused');
    setTtsLoading(false);
  }

  function handleResume() {
    if (hasAudio && nativeAudioRef.current) {
      void nativeAudioRef.current.play();
      setPlayState('playing');
    } else {
      void hfTtsPlayFrom(currentSentenceRef.current);
    }
  }

  function stopPlayback() {
    if (hasAudio && nativeAudioRef.current) {
      nativeAudioRef.current.pause();
      nativeAudioRef.current.currentTime = 0;
    } else {
      ttsSentenceAudioRef.current?.pause();
      ttsSentenceAudioRef.current = null;
      playbackIdRef.current++;
      window.speechSynthesis.cancel();
      setActiveWordIndex(null);
    }
    setPlayState('idle');
    setTtsLoading(false);
  }

  // ── HF TTS (sentence-by-sentence, Web Speech fallback on error) ────────

  async function hfTtsPlayFrom(fromIndex: number) {
    const playbackId = ++playbackIdRef.current;
    setPlayState('playing');

    async function playAt(index: number): Promise<void> {
      currentSentenceRef.current = index;
      if (playbackId !== playbackIdRef.current) return;
      if (index >= sentencesRef.current.length) {
        setActiveWordIndex(null);
        setPlayState('idle');
        setTtsLoading(false);
        return;
      }

      const sentence = sentencesRef.current[index];
      const text = sentence.tokens.map((t) => t.hanzi).join('');

      setTtsLoading(true);

      // Retry loop: server returns 503 {retry:true, wait:N} while model warms up
      let res: Response | null = null;
      for (let attempt = 0; attempt < 5; attempt++) {
        try {
          res = await fetch('/api/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text }),
          });
        } catch {
          break; // network error — fall through to Web Speech
        }

        if (playbackId !== playbackIdRef.current) return;

        if (res.status === 503) {
          const data = await res.json().catch(() => ({ wait: 10 })) as { retry?: boolean; wait?: number };
          if (data.retry) {
            const waitMs = Math.min((data.wait ?? 10) * 1000, 20000);
            await new Promise((r) => setTimeout(r, waitMs));
            if (playbackId !== playbackIdRef.current) return;
            continue;
          }
        }
        break;
      }

      if (playbackId !== playbackIdRef.current) return;

      // 501 = HF_TOKEN not configured; any non-ok → fall back to Web Speech
      if (!res?.ok) {
        setTtsLoading(false);
        webSpeechPlayFrom(index);
        return;
      }

      const blob = await res.blob();
      if (playbackId !== playbackIdRef.current) return;

      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      ttsSentenceAudioRef.current = audio;
      setTtsLoading(false);

      // Highlight first token of the sentence while audio plays
      if (sentence.tokens.length > 0) {
        setActiveWordIndex(`${sentence.id}-0`);
      }

      await new Promise<void>((resolve) => {
        audio.onended = () => { URL.revokeObjectURL(url); ttsSentenceAudioRef.current = null; resolve(); };
        audio.onerror = () => { URL.revokeObjectURL(url); ttsSentenceAudioRef.current = null; resolve(); };
        audio.onpause = () => resolve(); // fired when handlePause() calls .pause()
        void audio.play();
      });

      if (playbackId !== playbackIdRef.current) return;
      setActiveWordIndex(null);
      await playAt(index + 1);
    }

    await playAt(fromIndex);
  }

  // ── Web Speech API fallback ────────────────────────────────────────────

  function webSpeechPlayFrom(fromIndex: number) {
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
                {ttsLoading ? (
                  <span className="rounded bg-teal-50 px-2 py-1 text-teal-700">
                    ⏳ Memuat…
                  </span>
                ) : (
                  <button onClick={handlePause} className="rounded bg-amber-500 px-2 py-1 text-white">
                    ⏸ Jeda
                  </button>
                )}
                <button
                  onClick={stopPlayback}
                  className="rounded bg-gray-200 px-2 py-1 text-gray-700"
                  aria-label="Stop"
                >
                  ⏹
                </button>
              </>
            )}

            {playState === 'paused' && (
              <>
                <button onClick={handleResume} className="rounded bg-teal-600 px-2 py-1 text-white">
                  ▶ Lanjut
                </button>
                <button
                  onClick={stopPlayback}
                  className="rounded bg-gray-200 px-2 py-1 text-gray-700"
                  aria-label="Stop"
                >
                  ⏹
                </button>
              </>
            )}

            {/* Speed buttons only relevant for Web Speech fallback */}
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
