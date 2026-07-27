'use client';

import { useEffect, useState, useRef } from 'react';
import type { Chapter, ChapterContent } from '@/types';
import { useReaderStore } from '@/store/readerStore';
import { findSentenceText, findToken } from '@/lib/tokenId';
import { upsertProgressClient } from '@/lib/db/progress';
import WordToken from './WordToken';
import LookupPopup from './LookupPopup';
import ParagraphActions from './ParagraphActions';
import ProgressBar from './ProgressBar';

interface Props {
  chapter: Chapter;
  chapterId: string;
  initialScrollPosition?: number;
}

export default function Reader({ chapter, chapterId, initialScrollPosition = 0 }: Props) {
  const showChinese = useReaderStore((s) => s.showChinese);
  const activeTokenId = useReaderStore((s) => s.activeTokenId);
  const setActiveTokenId = useReaderStore((s) => s.setActiveTokenId);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const paragraphs = chapter.content_json.paragraphs;

  // Restore scroll position on mount
  useEffect(() => {
    if (initialScrollPosition > 0) {
      setTimeout(() => window.scrollTo({ top: initialScrollPosition, behavior: 'instant' }), 100);
    }
  }, [initialScrollPosition]);

  // Save scroll position (debounced 2s)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    function onScroll() {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        void upsertProgressClient(chapterId, { scroll_position: Math.round(window.scrollY) });
      }, 2000);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [chapterId]);

  // Mark completed when near bottom
  useEffect(() => {
    function checkCompletion() {
      const remaining = document.documentElement.scrollHeight - window.innerHeight - window.scrollY;
      if (remaining < 200) {
        void upsertProgressClient(chapterId, { completed: true });
      }
    }
    window.addEventListener('scroll', checkCompletion, { passive: true });
    return () => window.removeEventListener('scroll', checkCompletion);
  }, [chapterId]);

  // Popup anchor lookup
  useEffect(() => {
    if (!activeTokenId) { setAnchorEl(null); return; }
    if (!showChinese) { setActiveTokenId(null); setAnchorEl(null); return; }
    setAnchorEl(document.querySelector<HTMLElement>(`[data-token-id="${activeTokenId}"]`));
  }, [activeTokenId, showChinese, setActiveTokenId]);

  // Build a ChapterContent-compatible object to pass to tokenId helpers
  const chapterContent = { paragraphs } as unknown as ChapterContent;
  const activeToken = activeTokenId ? findToken(chapterContent, activeTokenId) : undefined;
  const activeSentenceText = activeTokenId ? findSentenceText(chapterContent, activeTokenId) : undefined;

  return (
    <>
      <ProgressBar />
      <main className="mx-auto max-w-[720px] px-6 pb-24 pt-6">
        <div className="space-y-8">
          {paragraphs.map((paragraph) => (
            <div key={paragraph.id}>
              {showChinese && (
                <div className="flex flex-wrap items-end gap-y-2 leading-loose">
                  {paragraph.sentences.map((sentence) =>
                    sentence.tokens.map((token, index) => (
                      <WordToken
                        key={`${sentence.id}-${index}`}
                        token={token}
                        tokenId={`${sentence.id}-${index}`}
                      />
                    )),
                  )}
                </div>
              )}
              <ParagraphActions
                translation={paragraph.translation_id}
                sentences={paragraph.sentences}
              />
            </div>
          ))}
        </div>
      </main>
      {activeToken && anchorEl && (
        <LookupPopup
          token={activeToken}
          anchorEl={anchorEl}
          sourceSentence={activeSentenceText ?? ''}
        />
      )}
    </>
  );
}
