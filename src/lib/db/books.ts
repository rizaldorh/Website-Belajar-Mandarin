import { createServerClient } from '@/lib/supabase/server';
import type { Book } from '@/types';

export async function getBooks(): Promise<Book[]> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from('books')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return data as Book[];
}

export async function getBook(id: string): Promise<Book | null> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from('books')
    .select('*')
    .eq('id', id)
    .single();
  if (error) return null;
  return data as Book;
}
