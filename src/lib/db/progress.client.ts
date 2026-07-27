import { createClient } from '@/lib/supabase/client';
import type { ProgressUpdate } from '@/types';

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
