import { useState } from 'react';

interface ParagraphActionsProps {
  translation: string;
}

export default function ParagraphActions({ translation }: ParagraphActionsProps) {
  const [showTranslation, setShowTranslation] = useState(false);

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setShowTranslation((v) => !v)}
        className="rounded-full bg-yellow-400 px-4 py-2 text-sm font-semibold"
      >
        Terjemahkan
      </button>
      {showTranslation && <p className="mt-2 text-gray-700">{translation}</p>}
    </div>
  );
}
