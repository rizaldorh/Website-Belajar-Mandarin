import { NextResponse } from 'next/server';

export const maxDuration = 60;

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

  // 55s timeout — leaves 5s headroom inside Vercel's 60s Pro limit.
  // On Hobby (10s limit) this will abort quickly and the client falls back
  // to Web Speech API.
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 55000);

  let res: Response;
  try {
    res = await fetch(HF_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        // Tell HF to block until the model is warm (up to 60s) instead of
        // returning 503 immediately. Requires HF PRO for reliable results.
        'X-Wait-For-Model': 'true',
      },
      body: JSON.stringify({ inputs: text }),
      signal: ac.signal,
    });
  } catch {
    clearTimeout(timer);
    return NextResponse.json({ retry: true, wait: 5 }, { status: 503 });
  }
  clearTimeout(timer);

  if (res.status === 503) {
    const body = await res.json().catch(() => ({})) as { estimated_time?: number; error?: string };
    return NextResponse.json(
      { retry: true, wait: body.estimated_time ?? 15, hf_error: body.error },
      { status: 503 },
    );
  }

  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText);
    return NextResponse.json({ error: msg, status: res.status }, { status: res.status });
  }

  const audio = await res.arrayBuffer();
  return new NextResponse(audio, {
    headers: { 'Content-Type': res.headers.get('content-type') ?? 'audio/flac' },
  });
}
