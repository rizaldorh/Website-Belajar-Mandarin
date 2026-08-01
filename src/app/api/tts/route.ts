import { NextResponse } from 'next/server';

export const maxDuration = 30;

// Best Taiwanese Mandarin neural voice; switch to zh-TW-YunJheNeural for male
const VOICE = 'zh-TW-HsiaoChenNeural';

function escapeXml(str: string) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function POST(request: Request): Promise<NextResponse> {
  const key = process.env.AZURE_SPEECH_KEY;
  const region = process.env.AZURE_SPEECH_REGION ?? 'eastasia';

  if (!key) {
    return NextResponse.json({ error: 'AZURE_SPEECH_KEY not configured' }, { status: 501 });
  }

  const { text } = await request.json() as { text?: string };
  if (!text?.trim()) {
    return NextResponse.json({ error: 'No text' }, { status: 400 });
  }

  const ssml = `<speak version='1.0' xml:lang='zh-TW'><voice name='${VOICE}'>${escapeXml(text)}</voice></speak>`;

  const res = await fetch(
    `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`,
    {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': key,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'audio-24khz-96kbitrate-mono-mp3',
        'User-Agent': 'BelajarMandarin',
      },
      body: ssml,
    },
  );

  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText);
    return NextResponse.json({ error: msg }, { status: res.status });
  }

  const audio = await res.arrayBuffer();
  return new NextResponse(audio, {
    headers: { 'Content-Type': 'audio/mpeg' },
  });
}
