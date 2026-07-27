import { createServerClient } from '@/lib/supabase/server';
import type { Chapter } from '@/types';

export async function getChaptersByBook(bookId: string): Promise<Chapter[]> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from('chapters')
    .select('*')
    .eq('book_id', bookId)
    .order('order_index', { ascending: true });
  if (error) throw new Error(error.message);
  return data as Chapter[];
}

export async function getChapter(id: string): Promise<Chapter | null> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from('chapters')
    .select('*')
    .eq('id', id)
    .single();
  if (error) return null;
  return data as Chapter;
}

export async function getAdjacentChapters(
  chapterId: string,
  bookId: string,
): Promise<{ prev: Chapter | null; next: Chapter | null }> {
  const chapters = await getChaptersByBook(bookId);
  const idx = chapters.findIndex((c) => c.id === chapterId);
  return {
    prev: idx > 0 ? chapters[idx - 1] : null,
    next: idx < chapters.length - 1 ? chapters[idx + 1] : null,
  };
}
