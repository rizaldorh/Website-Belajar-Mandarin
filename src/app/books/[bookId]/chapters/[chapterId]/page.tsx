import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createServerClient } from '@/lib/supabase/server';
import { getBook } from '@/lib/db/books';
import { getChapter, getChaptersByBook } from '@/lib/db/chapters';
import { getProgress } from '@/lib/db/progress';
import Toolbar from '@/components/reader/Toolbar';
import Reader from '@/components/reader/Reader';
import ColorLegend from '@/components/reader/ColorLegend';

interface Props {
  params: Promise<{ bookId: string; chapterId: string }>;
}

export default async function ChapterPage({ params }: Props) {
  const { bookId, chapterId } = await params;
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [book, chapter, allChapters] = await Promise.all([
    getBook(bookId),
    getChapter(chapterId),
    getChaptersByBook(bookId),
  ]);

  if (!book || !chapter) notFound();

  const progress = user ? await getProgress(user.id, chapterId) : null;

  const idx = allChapters.findIndex((c) => c.id === chapterId);
  const prevChapter = idx > 0 ? allChapters[idx - 1] : null;
  const nextChapter = idx < allChapters.length - 1 ? allChapters[idx + 1] : null;

  const chapterSummaries = allChapters.map(({ id, title, order_index }) => ({
    id,
    title,
    order_index,
  }));

  return (
    <div className="min-h-screen bg-gray-50">
      <Toolbar chapter={chapter} bookId={bookId} allChapters={chapterSummaries} />
      <ColorLegend />
      <Reader
        chapter={chapter}
        chapterId={chapterId}
        initialScrollPosition={progress?.scroll_position ?? 0}
      />
      <footer className="mx-auto max-w-[720px] border-t px-4 py-6 flex justify-between text-sm">
        {prevChapter ? (
          <Link href={`/books/${bookId}/chapters/${prevChapter.id}`} className="text-teal-600 hover:underline">
            ← {prevChapter.title ?? 'Bab sebelumnya'}
          </Link>
        ) : <span />}
        {nextChapter ? (
          <Link href={`/books/${bookId}/chapters/${nextChapter.id}`} className="text-teal-600 hover:underline">
            {nextChapter.title ?? 'Bab berikutnya'} →
          </Link>
        ) : <span />}
      </footer>
    </div>
  );
}
