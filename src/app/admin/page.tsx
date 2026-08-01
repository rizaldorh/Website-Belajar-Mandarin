import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import { isAdminEmail } from '@/lib/auth/admin';
import { getBooks } from '@/lib/db/books';
import { getChapterSummaries } from '@/lib/db/chapters';
import AdminForm from '@/components/admin/AdminForm';
import ChapterAudioManager from '@/components/admin/ChapterAudioManager';

export default async function AdminPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !isAdminEmail(user.email)) {
    redirect('/');
  }

  const books = await getBooks();
  const groups = await Promise.all(
    books.map(async (book) => ({
      bookId: book.id,
      bookTitle: book.title,
      chapters: await getChapterSummaries(book.id),
    })),
  );

  return (
    <div className="mx-auto max-w-2xl space-y-12 px-4 py-8">
      <section>
        <h1 className="mb-6 text-2xl font-bold">Admin — Import Bab</h1>
        <AdminForm />
      </section>

      <section>
        <h2 className="mb-4 text-xl font-bold">Audio Rekaman</h2>
        <p className="mb-4 text-sm text-gray-500">
          Upload file MP3 untuk setiap bab. Jika ada audio, tombol ▶ Baca akan memutar rekaman asli instead of TTS.
        </p>
        <ChapterAudioManager groups={groups} />
      </section>
    </div>
  );
}
