'use client';

import Link from 'next/link';
import type { Chapter, UserProgress } from '@/types';

interface Props {
  bookId: string;
  chapters: Chapter[];
  progress: UserProgress[];
}

export default function ChapterList({ bookId, chapters, progress }: Props) {
  function getChapterProgress(chapterId: string): UserProgress | undefined {
    return progress.find((p) => p.chapter_id === chapterId);
  }

  return (
    <ol className="space-y-2">
      {chapters.map((chapter, i) => {
        const p = getChapterProgress(chapter.id);
        const scrollPct =
          p && typeof window !== 'undefined'
            ? Math.min(
                100,
                Math.round(
                  (p.scroll_position /
                    Math.max(document.documentElement.scrollHeight - window.innerHeight, 1)) *
                    100,
                ),
              )
            : 0;

        return (
          <li key={chapter.id}>
            <Link
              href={`/books/${bookId}/chapters/${chapter.id}`}
              className="flex items-center justify-between rounded-lg border bg-white px-4 py-3 hover:bg-gray-50"
            >
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-400">{i + 1}</span>
                <span className="font-medium">{chapter.title ?? `Bab ${i + 1}`}</span>
              </div>
              <div className="flex items-center gap-2">
                {p?.completed && <span className="text-teal-600">✓</span>}
                {!p?.completed && p && (
                  <div className="h-1.5 w-16 rounded-full bg-gray-200">
                    <div
                      className="h-full rounded-full bg-teal-500"
                      style={{ width: `${scrollPct}%` }}
                    />
                  </div>
                )}
              </div>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
