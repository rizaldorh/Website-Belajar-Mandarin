import { createServerClient } from '@/lib/supabase/server';
import { getBooks } from '@/lib/db/books';
import { getChaptersByBook } from '@/lib/db/chapters';
import BookGrid from '@/components/library/BookGrid';

export default async function LibraryPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  const books = await getBooks();

  const items = await Promise.all(
    books.map(async (book) => {
      const chapters = await getChaptersByBook(book.id);
      const progress = user
        ? ((await supabase
            .from('user_progress')
            .select('*')
            .eq('user_id', user.id)
            .in('chapter_id', chapters.map((c) => c.id))
          ).data ?? [])
        : [];
      return { book, chapters, progress };
    }),
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">Perpustakaan</h1>
      {items.length === 0 ? (
        <p className="text-gray-500">Belum ada buku. Minta admin untuk menambahkan buku.</p>
      ) : (
        <BookGrid items={items} />
      )}
    </div>
  );
}
