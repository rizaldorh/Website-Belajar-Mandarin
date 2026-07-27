import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/lib/supabase/server';

const RequestSchema = z.object({ hanzi: z.string().min(1).max(500) });

export async function POST(request: Request): Promise<NextResponse> {
  // Auth check
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body: unknown = await request.json();
  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const prompt = `Jelaskan kalimat Mandarin berikut dalam Bahasa Indonesia untuk pelajar pemula:
"${parsed.data.hanzi}"
Fokus pada: struktur kalimat, pola tata bahasa, kata-kata penting, dan ungkapan idiomatis.
Buat penjelasan singkat (3-5 kalimat).`;

  const result = await model.generateContent(prompt);
  const explanation = result.response.text();

  return NextResponse.json({ explanation });
}
