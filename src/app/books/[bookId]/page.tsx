import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { createServerClient } from '@/lib/supabase/server';
import { getBook } from '@/lib/db/books';
import { getChaptersByBook } from '@/lib/db/chapters';
import ChapterList from '@/components/library/ChapterList';

interface Props {
  params: Promise<{ bookId: string }>;
}

export default async function BookPage({ params }: Props) {
  const { bookId } = await params;
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const [book, chapters] = await Promise.all([
    getBook(bookId),
    getChaptersByBook(bookId),
  ]);

  if (!book) notFound();

  const { data: progress } = await supabase
    .from('user_progress')
    .select('*')
    .eq('user_id', user.id)
    .in('chapter_id', chapters.map((c) => c.id));

  const firstIncomplete = chapters.find(
    (c) => !(progress ?? []).find((p) => p.chapter_id === c.id && p.completed),
  );

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link href="/" className="text-sm text-gray-500 hover:underline">← Perpustakaan</Link>
      <div className="mt-4 flex items-center gap-3">
        <span className="text-5xl">{book.cover_emoji}</span>
        <div>
          <h1 className="text-2xl font-bold">{book.title}</h1>
          {book.author && <p className="text-gray-500">{book.author}</p>}
          <p className="text-xs text-gray-400">{book.license}</p>
        </div>
      </div>
      {firstIncomplete && (
        <Link
          href={`/books/${bookId}/chapters/${firstIncomplete.id}`}
          className="mt-4 inline-block rounded bg-teal-600 px-4 py-2 text-sm font-medium text-white"
        >
          Lanjutkan membaca
        </Link>
      )}
      <div className="mt-6">
        <h2 className="mb-3 font-semibold">Daftar bab</h2>
        <ChapterList bookId={bookId} chapters={chapters} progress={progress ?? []} />
      </div>
    </div>
  );
}
