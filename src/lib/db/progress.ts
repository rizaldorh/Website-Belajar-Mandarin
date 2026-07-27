import { createServerClient } from '@/lib/supabase/server';
import { createClient } from '@/lib/supabase/client';
import type { UserProgress, ProgressUpdate } from '@/types';

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
    .single();
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

// Client-side: called from browser on scroll / completion
export async function upsertProgressClient(
  chapterId: string,
  update: ProgressUpdate,
): Promise<void> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from('user_progress').upsert(
    {
      user_id: user.id,
      chapter_id: chapterId,
      ...update,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,chapter_id' },
  );
}
