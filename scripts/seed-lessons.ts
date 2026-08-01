import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';
import { z } from 'zod';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_KEY!;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Inline schema so this script doesn't depend on Next.js module resolution
const TokenSchema = z.object({
  hanzi:    z.string(),
  pinyin:   z.string(),
  pos:      z.enum(['noun','verb','adj','adv','pron','propn','particle','numeral','function','punct']),
  hsk:      z.union([z.number().int().min(1).max(6), z.null()]),
  gloss_id: z.string(),
});
const SentenceSchema = z.object({
  id:     z.string(),
  tokens: z.array(TokenSchema),
});
const ParagraphSchema = z.object({
  id:             z.string(),
  translation_id: z.string(),
  sentences:      z.array(SentenceSchema),
});
const ChapterContentSchema = z.object({
  paragraphs: z.array(ParagraphSchema),
});

// Map non-schema POS tags → valid schema values before validation
const POS_MAP: Record<string, string> = {
  det:         'pron',     // demonstratives (這個, 那些, 下個)
  num:         'numeral',  // numeric expressions (一個半, 四個, 七十萬)
  measure:     'noun',     // measure / classifier words (件, 個, 塊)
  intj:        'particle', // interjections (哇, 喂, 啊)
  phrase:      'verb',     // fixed phrases labelled as phrase
  conjunction: 'function', // conjunctions
  conj:        'function',
  determiner:  'pron',
};

function normalizePOS(raw: unknown): unknown {
  if (Array.isArray(raw)) return raw.map(normalizePOS);
  if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      if (k === 'pos' && typeof v === 'string' && POS_MAP[v]) {
        out[k] = POS_MAP[v];
      } else {
        out[k] = normalizePOS(v);
      }
    }
    return out;
  }
  return raw;
}

const SCRATCHPAD = 'C:\\Users\\Aldo\\AppData\\Local\\Temp\\claude\\C--Users-Aldo-projects-Belajar-Mandarin\\09b328fe-c03b-44a3-85c4-2171ed44f1da\\scratchpad';

const LESSONS: { file: string; order: number; title: string }[] = [
  { file: 'lesson-01.json', order:  1, title: '歡迎你來臺灣！' },
  { file: 'lesson-02.json', order:  2, title: '我的家人' },
  { file: 'lesson-03.json', order:  3, title: '週末做什麼？' },
  { file: 'lesson-04.json', order:  4, title: '請問一共多少錢？' },
  { file: 'lesson-05.json', order:  5, title: '牛肉麵真好吃' },
  { file: 'lesson-06.json', order:  6, title: '他們學校在山上' },
  { file: 'lesson-07.json', order:  7, title: '早上九點去KTV' },
  { file: 'lesson-08.json', order:  8, title: '坐火車去臺南' },
  { file: 'lesson-09.json', order:  9, title: '放假去哪裡玩？' },
  { file: 'lesson-10.json', order: 10, title: '臺灣的水果很好吃' },
  { file: 'lesson-11.json', order: 11, title: '我要租房子' },
  { file: 'lesson-12.json', order: 12, title: '你在臺灣學多久的中文？' },
  { file: 'lesson-13.json', order: 13, title: '生日快樂' },
  { file: 'lesson-14.json', order: 14, title: '天氣這麼冷！' },
  { file: 'lesson-15.json', order: 15, title: '我很不舒服' },
];

async function seed() {
  // Upsert book
  const { data: book, error: bookError } = await supabase
    .from('books')
    .upsert(
      {
        title:       'Percakapan Mandarin Taiwan',
        author:      'Belajar Mandarin',
        cover_emoji: '🇹🇼',
        license:     'Educational Use',
        source_url:  null,
      },
      { onConflict: 'title' },
    )
    .select()
    .single();

  if (bookError) {
    console.error('Book upsert failed:', bookError.message);
    process.exit(1);
  }
  console.log(`✓ Book: ${book.id} — ${book.title}`);

  for (const lesson of LESSONS) {
    const filePath = join(SCRATCHPAD, lesson.file);
    let raw: unknown;
    try {
      raw = JSON.parse(readFileSync(filePath, 'utf-8'));
    } catch (e) {
      console.error(`  ✗ Could not read ${lesson.file}:`, e);
      continue;
    }

    const parsed = ChapterContentSchema.safeParse(normalizePOS(raw));
    if (!parsed.success) {
      console.error(`  ✗ Schema validation failed for ${lesson.file}:`, parsed.error.message);
      continue;
    }

    const content = parsed.data;
    const wordCount = content.paragraphs
      .flatMap((p) => p.sentences)
      .flatMap((s) => s.tokens)
      .filter((t) => t.pos !== 'punct').length;

    const { error: chapterError } = await supabase
      .from('chapters')
      .upsert(
        {
          book_id:     book.id,
          order_index: lesson.order,
          title:       lesson.title,
          content_json: content,
          word_count:   wordCount,
        },
        { onConflict: 'book_id,order_index' },
      );

    if (chapterError) {
      console.error(`  ✗ Chapter ${lesson.order} failed:`, chapterError.message);
    } else {
      console.log(`  ✓ Bab ${lesson.order}: ${lesson.title} (${wordCount} kata)`);
    }
  }

  console.log('\nSeed selesai!');
}

seed().catch((err) => { console.error(err); process.exit(1); });
