import { NextResponse } from 'next/server';

// Allow up to 60s on Vercel Pro; Hobby is still capped at 10s but the
// client-side retry loop below keeps each individual call well under that.
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

  // Use a hard timeout so we never exceed Vercel's function limit.
  // Do NOT use X-Wait-For-Model — let HF return 503 quickly when cold,
  // and the client retries after the estimated_time delay.
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 8000);

  let res: Response;
  try {
    res = await fetch(HF_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ inputs: text }),
      signal: ac.signal,
    });
  } catch {
    clearTimeout(timer);
    // Treat fetch timeout the same as a model-loading 503
    return NextResponse.json({ retry: true, wait: 10 }, { status: 503 });
  }
  clearTimeout(timer);

  // Model is loading — tell the client how long to wait before retrying
  if (res.status === 503) {
    const body = await res.json().catch(() => ({})) as { estimated_time?: number };
    return NextResponse.json({ retry: true, wait: body.estimated_time ?? 15 }, { status: 503 });
  }

  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText);
    return NextResponse.json({ error: msg }, { status: res.status });
  }

  const audio = await res.arrayBuffer();
  return new NextResponse(audio, {
    headers: { 'Content-Type': res.headers.get('content-type') ?? 'audio/flac' },
  });
}
