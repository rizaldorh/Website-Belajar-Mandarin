'use client';

import { useState } from 'react';

interface Props {
  translation: string;
}

export default function ParagraphActions({ translation }: Props) {
  const [showTranslation, setShowTranslation] = useState(false);

  return (
    <div className="mt-2 space-y-1">
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
