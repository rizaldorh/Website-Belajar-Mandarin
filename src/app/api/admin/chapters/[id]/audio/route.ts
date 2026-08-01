import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@/lib/supabase/server';
import { isAdminEmail } from '@/lib/auth/admin';

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

interface Props {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: Props): Promise<NextResponse> {
  const { id } = await params;

  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get('audio') as File | null;
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

  const admin = adminClient();

  const { data: chapter, error: chapterErr } = await admin
    .from('chapters')
    .select('id, book_id')
    .eq('id', id)
    .single();

  if (chapterErr || !chapter) {
    return NextResponse.json({ error: 'Chapter not found' }, { status: 404 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const storagePath = `${chapter.book_id}/${id}.mp3`;

  const { error: uploadErr } = await admin.storage
    .from('chapter-audio')
    .upload(storagePath, buffer, { contentType: 'audio/mpeg', upsert: true });

  if (uploadErr) {
    return NextResponse.json({ error: uploadErr.message }, { status: 500 });
  }

  const { data: { publicUrl } } = admin.storage
    .from('chapter-audio')
    .getPublicUrl(storagePath);

  const { error: updateErr } = await admin
    .from('chapters')
    .update({ audio_url: publicUrl })
    .eq('id', id);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  return NextResponse.json({ url: publicUrl });
}

export async function DELETE(request: Request, { params }: Props): Promise<NextResponse> {
  const { id } = await params;

  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const admin = adminClient();

  const { data: chapter } = await admin
    .from('chapters')
    .select('id, book_id')
    .eq('id', id)
    .single();

  if (chapter) {
    await admin.storage
      .from('chapter-audio')
      .remove([`${chapter.book_id}/${id}.mp3`]);
  }

  await admin.from('chapters').update({ audio_url: null }).eq('id', id);

  return NextResponse.json({ ok: true });
}
