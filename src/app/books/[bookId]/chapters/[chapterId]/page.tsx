import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { createServerClient } from '@/lib/supabase/server';
import { getBook } from '@/lib/db/books';
import { getChapter, getAdjacentChapters } from '@/lib/db/chapters';
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
  if (!user) redirect('/auth/login');

  const [book, chapter, adjacent] = await Promise.all([
    getBook(bookId),
    getChapter(chapterId),
    getAdjacentChapters(chapterId, bookId),
  ]);

  if (!book || !chapter) notFound();

  const progress = await getProgress(user.id, chapterId);

  return (
    <div className="min-h-screen bg-gray-50">
      <Toolbar chapter={chapter} />
      <ColorLegend />
      <div className="mx-auto max-w-[720px] px-4 pt-2 pb-2">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Link href="/" className="hover:underline">Perpustakaan</Link>
          <span>›</span>
          <Link href={`/books/${bookId}`} className="hover:underline">{book.title}</Link>
          <span>›</span>
          <span>{chapter.title ?? `Bab ${chapter.order_index}`}</span>
        </div>
      </div>
      <Reader
        chapter={chapter}
        chapterId={chapterId}
        initialScrollPosition={progress?.scroll_position ?? 0}
      />
      <footer className="mx-auto max-w-[720px] border-t px-4 py-6 flex justify-between text-sm">
        {adjacent.prev ? (
          <Link href={`/books/${bookId}/chapters/${adjacent.prev.id}`} className="text-teal-600 hover:underline">
            ← {adjacent.prev.title ?? 'Bab sebelumnya'}
          </Link>
        ) : <span />}
        {adjacent.next ? (
          <Link href={`/books/${bookId}/chapters/${adjacent.next.id}`} className="text-teal-600 hover:underline">
            {adjacent.next.title ?? 'Bab berikutnya'} →
          </Link>
        ) : <span />}
      </footer>
    </div>
  );
}
