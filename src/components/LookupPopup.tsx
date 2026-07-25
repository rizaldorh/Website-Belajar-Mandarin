import { useEffect, useState } from 'react';
import { autoUpdate, flip, offset, shift, useDismiss, useFloating, useInteractions } from '@floating-ui/react';
import type { Token } from '../types';
import { isSpeechSupported, speak } from '../lib/tts';
import { addVocabEntry, isSaved } from '../lib/vocab';
import { useReaderStore } from '../store/readerStore';

interface LookupPopupProps {
  token: Token;
  anchorEl: HTMLElement;
  sourceSentence: string;
}

export default function LookupPopup({ token, anchorEl, sourceSentence }: LookupPopupProps) {
  const setActiveTokenId = useReaderStore((s) => s.setActiveTokenId);

  const { refs, floatingStyles, context } = useFloating({
    open: true,
    onOpenChange: (open) => {
      if (!open) setActiveTokenId(null);
    },
    placement: 'top',
    middleware: [offset(8), flip(), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
  });

  const dismiss = useDismiss(context);
  const { getFloatingProps } = useInteractions([dismiss]);

  useEffect(() => {
    refs.setReference(anchorEl);
  }, [anchorEl, refs]);

  const [alreadySaved, setAlreadySaved] = useState(() => isSaved(token.hanzi));

  useEffect(() => {
    setAlreadySaved(isSaved(token.hanzi));
  }, [token.hanzi]);

  return (
    <div
      ref={refs.setFloating}
      style={floatingStyles}
      {...getFloatingProps()}
      role="dialog"
      className="z-50 w-72 rounded-xl bg-white p-4 shadow-lg"
    >
      <p className="text-2xl font-semibold">{token.hanzi}</p>
      <p className="text-gray-500">{token.pinyin}</p>
      <p className="mt-2">{token.gloss_id}</p>
      <div className="mt-4 flex gap-2">
        {isSpeechSupported() && (
          <button
            type="button"
            onClick={() => speak(token.hanzi)}
            className="rounded-full bg-yellow-400 px-4 py-2 text-sm font-semibold"
          >
            Putar
          </button>
        )}
        <button
          type="button"
          disabled={alreadySaved}
          onClick={() => {
            addVocabEntry({
              hanzi: token.hanzi,
              pinyin: token.pinyin,
              gloss: token.gloss_id,
              sourceSentence,
            });
            setAlreadySaved(true);
          }}
          className="rounded-full bg-gray-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {alreadySaved ? 'Sudah ditambahkan' : 'Tambahkan'}
        </button>
      </div>
    </div>
  );
}
