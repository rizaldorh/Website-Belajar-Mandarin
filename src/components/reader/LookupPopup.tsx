'use client';

import { useState, useEffect } from 'react';
import {
  useFloating,
  autoUpdate,
  flip,
  shift,
  offset,
  useDismiss,
  useInteractions,
} from '@floating-ui/react';
import { useReaderStore } from '@/store/readerStore';
import { addVocabEntry, isVocabSaved } from '@/lib/db/vocab';
import * as tts from '@/lib/tts';
import type { Token } from '@/types';

interface Props {
  token: Token;
  anchorEl: HTMLElement;
  sourceSentence: string;
}

export default function LookupPopup({ token, anchorEl, sourceSentence }: Props) {
  const setActiveTokenId = useReaderStore((s) => s.setActiveTokenId);
  const [saved, setSaved] = useState(false);
  const [showCari, setShowCari] = useState(false);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    setSaved(false);
    setShowCari(false);
    isVocabSaved(token.hanzi).then(setSaved);
  }, [token.hanzi]);

  const { refs, floatingStyles, context } = useFloating({
    open,
    onOpenChange: (o) => {
      if (!o) {
        setOpen(false);
        setActiveTokenId(null);
      }
    },
    middleware: [offset(8), flip(), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
  });

  const dismiss = useDismiss(context);
  const { getFloatingProps } = useInteractions([dismiss]);

  useEffect(() => {
    refs.setReference(anchorEl);
  }, [anchorEl, refs]);

  if (!open) return null;

  async function handleSave() {
    await addVocabEntry({ hanzi: token.hanzi, pinyin: token.pinyin, gloss: token.gloss_id });
    setSaved(true);
  }

  return (
    <div
      ref={refs.setFloating}
      style={floatingStyles}
      {...getFloatingProps()}
      role="dialog"
      className="z-50 w-64 rounded-lg border bg-white shadow-lg"
    >
      <div className="p-3">
        <div className="flex items-start justify-between">
          <div>
            <span className="font-[var(--font-hanzi)] text-2xl">{token.hanzi}</span>
            <span className="ml-2 text-sm text-gray-500">{token.pinyin}</span>
          </div>
          {tts.isSpeechSupported() && (
            <button
              onClick={() => tts.speak(token.hanzi)}
              className="ml-2 text-lg"
              aria-label="Putar"
            >
              🔊
            </button>
          )}
        </div>
        <div className="mt-2 flex gap-2">
          <button
            onClick={handleSave}
            disabled={saved}
            className="flex-1 rounded bg-teal-600 py-1 text-xs font-medium text-white disabled:opacity-50"
          >
            {saved ? 'Sudah ditambahkan' : 'Tambahkan'}
          </button>
          <button
            onClick={() => setShowCari(!showCari)}
            className="rounded border px-2 py-1 text-xs"
          >
            Cari
          </button>
        </div>
        {showCari && (
          <div className="mt-2 rounded bg-gray-50 p-2 text-sm">
            <p className="font-medium">
              {token.hanzi} — {token.pinyin}
            </p>
            <p className="mt-1 text-gray-700">{token.gloss_id}</p>
            <p className="mt-1 text-xs text-gray-400">
              POS: {token.pos} · HSK: {token.hsk ?? '–'}
            </p>
            <p className="mt-1 text-xs text-gray-400 italic">{sourceSentence}</p>
          </div>
        )}
      </div>
    </div>
  );
}
