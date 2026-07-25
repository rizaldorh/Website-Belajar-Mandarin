import { useEffect, useState } from 'react';
import chapterData from '../data/chapter1.json';
import type { Chapter } from '../types';
import { useReaderStore } from '../store/readerStore';
import { findSentenceText, findToken } from '../lib/tokenId';
import WordToken from './WordToken';
import LookupPopup from './LookupPopup';
import ParagraphActions from './ParagraphActions';

const chapter = chapterData as Chapter;

export default function Reader() {
  const showChinese = useReaderStore((s) => s.showChinese);
  const showTranslation = useReaderStore((s) => s.showTranslation);
  const activeTokenId = useReaderStore((s) => s.activeTokenId);
  const setActiveTokenId = useReaderStore((s) => s.setActiveTokenId);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!activeTokenId) {
      setAnchorEl(null);
      return;
    }
    if (!showChinese) {
      setActiveTokenId(null);
      setAnchorEl(null);
      return;
    }
    setAnchorEl(document.querySelector<HTMLElement>(`[data-token-id="${activeTokenId}"]`));
  }, [activeTokenId, showChinese, setActiveTokenId]);

  if (!showChinese && !showTranslation) {
    return (
      <p className="p-4 text-center text-gray-400">
        Tidak ada tampilan aktif. Aktifkan teks Mandarin atau terjemahan dari toolbar.
      </p>
    );
  }

  const activeToken = activeTokenId ? findToken(chapter, activeTokenId) : undefined;
  const activeSentenceText = activeTokenId ? findSentenceText(chapter, activeTokenId) : undefined;

  return (
    <div className="p-4">
      <p className="text-sm text-gray-400">{chapter.chapterLabel}</p>
      <h1 className="mb-4 text-2xl font-bold">{chapter.title}</h1>
      {chapter.paragraphs.map((paragraph) => (
        <div key={paragraph.id} className="mb-6 leading-loose">
          {showChinese &&
            paragraph.sentences.map((sentence) => (
              <span key={sentence.id}>
                {sentence.tokens.map((token, index) => (
                  <WordToken key={`${sentence.id}-${index}`} token={token} tokenId={`${sentence.id}-${index}`} />
                ))}
              </span>
            ))}
          {showTranslation && <p className="mt-2 text-gray-700">{paragraph.translation_id}</p>}
          <ParagraphActions translation={paragraph.translation_id} />
        </div>
      ))}
      {activeToken && anchorEl && (
        <LookupPopup token={activeToken} anchorEl={anchorEl} sourceSentence={activeSentenceText ?? ''} />
      )}
    </div>
  );
}
