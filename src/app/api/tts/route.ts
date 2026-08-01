import { NextResponse } from 'next/server';

const HF_MODEL = 'facebook/mms-tts-zho';
const HF_URL = `https://api-inference.huggingface.co/models/${HF_MODEL}`;

export async function POST(request: Request): Promise<NextResponse> {
  const token = process.env.HF_TOKEN;
  if (!token) {
    return NextResponse.json({ error: 'HF_TOKEN not configured' }, { status: 501 });
  }

  const { text } = await request.json() as { text?: string };
  if (!text?.trim()) {
    return NextResponse.json({ error: 'No text' }, { status: 400 });
  }

  const res = await fetch(HF_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      // Wait for model to load instead of getting a 503
      'X-Wait-For-Model': 'true',
    },
    body: JSON.stringify({ inputs: text }),
  });

  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText);
    return NextResponse.json({ error: msg }, { status: res.status });
  }

  const audio = await res.arrayBuffer();
  return new NextResponse(audio, {
    headers: { 'Content-Type': res.headers.get('content-type') ?? 'audio/flac' },
  });
}
