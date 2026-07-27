'use client';

import { useState } from 'react';
import type { Sentence } from '@/types';

interface Props {
  translation: string;
  sentences: Sentence[];
}

export default function ParagraphActions({ translation, sentences }: Props) {
  const [showTranslation, setShowTranslation] = useState(false);
  const [jelaskanMap, setJelaskanMap] = useState<Record<string, string | 'loading'>>({});

  async function handleJelaskan(sentence: Sentence): Promise<void> {
    const sentenceText = sentence.tokens.map((t) => t.hanzi).join('');
    if (jelaskanMap[sentence.id]) {
      setJelaskanMap((m) => {
        const n = { ...m };
        delete n[sentence.id];
        return n;
      });
      return;
    }
    setJelaskanMap((m) => ({ ...m, [sentence.id]: 'loading' }));
    const res = await fetch('/api/jelaskan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hanzi: sentenceText }),
    });
    const { explanation } = (await res.json()) as { explanation: string };
    setJelaskanMap((m) => ({ ...m, [sentence.id]: explanation }));
  }

  return (
    <div className="mt-2 space-y-1">
      {sentences.map((sentence) => (
        <div key={sentence.id} className="flex flex-col gap-1">
          <div className="flex justify-end">
            <button
              onClick={() => void handleJelaskan(sentence)}
              className="text-xs text-blue-500 underline"
            >
              Jelaskan
            </button>
          </div>
          {jelaskanMap[sentence.id] && (
            <div className="rounded bg-blue-50 p-2 text-sm text-blue-900">
              {jelaskanMap[sentence.id] === 'loading'
                ? 'Memuat…'
                : jelaskanMap[sentence.id]}
            </div>
          )}
        </div>
      ))}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowTranslation(!showTranslation)}
          className="text-xs text-teal-600 underline"
        >
          {showTranslation ? 'Sembunyikan terjemahan' : 'Terjemahkan'}
        </button>
      </div>
      {showTranslation && (
        <p className="mt-1 text-sm text-gray-600 italic">{translation}</p>
      )}
    </div>
  );
}
