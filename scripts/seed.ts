import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY!;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function seed() {
  const chapterJson = JSON.parse(
    readFileSync(join(process.cwd(), 'src/data/chapter1.json'), 'utf-8'),
  );

  // Upsert book
  const { data: book, error: bookError } = await supabase
    .from('books')
    .upsert(
      {
        title: 'Cerita Rakyat Tiongkok',
        author: 'Anonim',
        cover_emoji: '🐇',
        license: 'Public Domain',
      },
      { onConflict: 'title' },
    )
    .select()
    .single();

  if (bookError) { console.error('Book upsert failed:', bookError.message); process.exit(1); }
  console.log('Book:', book.id, book.title);

  // Count tokens for word_count
  const wordCount = chapterJson.paragraphs
    .flatMap((p: { sentences: { tokens: { pos: string }[] }[] }) => p.sentences)
    .flatMap((s: { tokens: { pos: string }[] }) => s.tokens)
    .filter((t: { pos: string }) => t.pos !== 'punct').length;

  // Upsert chapter
  const { data: chapter, error: chapterError } = await supabase
    .from('chapters')
    .upsert(
      {
        book_id: book.id,
        order_index: 1,
        title: chapterJson.title,
        content_json: { paragraphs: chapterJson.paragraphs },
        word_count: wordCount,
      },
      { onConflict: 'book_id,order_index' },
    )
    .select()
    .single();

  if (chapterError) { console.error('Chapter upsert failed:', chapterError.message); process.exit(1); }
  console.log('Chapter:', chapter.id, chapter.title);
  console.log('Seed complete.');
}

seed().catch((err) => { console.error(err); process.exit(1); });
