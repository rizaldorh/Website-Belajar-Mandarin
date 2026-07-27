import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@/lib/supabase/server';
import { annotateChapter } from '@/lib/nlp/gemini-annotate';

const RequestSchema = z.object({
  bookTitle:    z.string().min(1),
  bookAuthor:   z.string().optional(),
  coverEmoji:   z.string().default('📖'),
  license:      z.string().default('Public Domain'),
  sourceUrl:    z.string().url().optional().or(z.literal('')),
  chapterTitle: z.string().optional(),
  chapterOrder: z.number().int().min(1),
  rawText:      z.string().min(10),
  existingBookId: z.string().uuid().optional(),
});

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

export async function POST(request: Request): Promise<NextResponse> {
  // Auth + admin check
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const adminEmails = (process.env.ADMIN_EMAILS ?? '').split(',').map((e) => e.trim());
  if (!user || !adminEmails.includes(user.email ?? '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body: unknown = await request.json();
  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  const admin = adminClient();
  const data = parsed.data;

  // Create import job
  const { data: job, error: jobErr } = await admin
    .from('import_jobs')
    .insert({ status: 'processing', log: null })
    .select()
    .single();
  if (jobErr) return NextResponse.json({ error: jobErr.message }, { status: 500 });

  // Upsert book
  let bookId = data.existingBookId;
  if (!bookId) {
    const { data: book, error: bookErr } = await admin
      .from('books')
      .upsert(
        {
          title: data.bookTitle,
          author: data.bookAuthor ?? null,
          cover_emoji: data.coverEmoji,
          license: data.license,
          source_url: data.sourceUrl || null,
        },
        { onConflict: 'title' },
      )
      .select()
      .single();
    if (bookErr) {
      await admin.from('import_jobs').update({ status: 'error', log: bookErr.message, book_id: null }).eq('id', job.id);
      return NextResponse.json({ error: bookErr.message }, { status: 500 });
    }
    bookId = book.id as string;
  }

  // Run NLP
  let content;
  try {
    content = await annotateChapter(data.rawText, process.env.GEMINI_API_KEY!);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await admin.from('import_jobs').update({ status: 'error', log: msg, book_id: bookId }).eq('id', job.id);
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  // Count non-punct tokens
  const wordCount = content.paragraphs
    .flatMap((p) => p.sentences)
    .flatMap((s) => s.tokens)
    .filter((t) => t.pos !== 'punct').length;

  // Insert chapter
  const { error: chapterErr } = await admin.from('chapters').insert({
    book_id: bookId,
    order_index: data.chapterOrder,
    title: data.chapterTitle ?? null,
    content_json: content,
    word_count: wordCount,
  });

  if (chapterErr) {
    await admin.from('import_jobs').update({ status: 'error', log: chapterErr.message, book_id: bookId }).eq('id', job.id);
    return NextResponse.json({ error: chapterErr.message }, { status: 500 });
  }

  await admin.from('import_jobs').update({ status: 'done', book_id: bookId }).eq('id', job.id);
  return NextResponse.json({ jobId: job.id });
}
