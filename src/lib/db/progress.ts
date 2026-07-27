import { createServerClient } from '@/lib/supabase/server';
import type { UserProgress } from '@/types';

export async function getProgress(
  userId: string,
  chapterId: string,
): Promise<UserProgress | null> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from('user_progress')
    .select('*')
    .eq('user_id', userId)
    .eq('chapter_id', chapterId)
    .maybeSingle();
  if (error) return null;
  return data as UserProgress;
}

export async function getBookProgress(
  userId: string,
  bookId: string,
): Promise<UserProgress[]> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from('user_progress')
    .select('*, chapters!inner(book_id)')
    .eq('user_id', userId)
    .eq('chapters.book_id', bookId);
  if (error) return [];
  return data as UserProgress[];
}
