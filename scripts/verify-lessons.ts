import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  { auth: { persistSession: false } },
);

const { data: books } = await sb.from('books').select('id, title').order('title');
console.log('=== Books ===');
books?.forEach((b: { id: string; title: string }) => console.log(`  ${b.id}  ${b.title}`));

const bookId = books?.[0]?.id;
const { data: chapters } = await sb
  .from('chapters')
  .select('order_index, title, word_count')
  .eq('book_id', bookId)
  .order('order_index');

console.log('\n=== Chapters ===');
chapters?.forEach((c: { order_index: number; title: string; word_count: number }) =>
  console.log(`  Bab ${c.order_index}: ${c.title} (${c.word_count} kata)`),
);
console.log(`\nTotal: ${chapters?.length ?? 0} bab`);
