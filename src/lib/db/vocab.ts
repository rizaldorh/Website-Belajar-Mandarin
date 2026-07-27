import { createClient } from '@/lib/supabase/client';
import type { VocabEntry, VocabInput } from '@/types';

export async function getVocab(): Promise<VocabEntry[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('vocab_entries')
    .select('*')
    .order('added_at', { ascending: false });
  if (error) return [];
  return data as VocabEntry[];
}

export async function addVocabEntry(entry: VocabInput): Promise<void> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from('vocab_entries').upsert(
    { user_id: user.id, ...entry },
    { onConflict: 'user_id,hanzi' },
  );
}

export async function removeVocabEntry(hanzi: string): Promise<void> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from('vocab_entries')
    .delete()
    .eq('user_id', user.id)
    .eq('hanzi', hanzi);
}

export async function isVocabSaved(hanzi: string): Promise<boolean> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase
    .from('vocab_entries')
    .select('id')
    .eq('user_id', user.id)
    .eq('hanzi', hanzi)
    .single();
  return data !== null;
}
