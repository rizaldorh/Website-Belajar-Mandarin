'use client';

import { useState, useEffect } from 'react';
import type { ImportJob } from '@/types';

export default function AdminForm() {
  const [bookTitle, setBookTitle] = useState('');
  const [bookAuthor, setBookAuthor] = useState('');
  const [coverEmoji, setCoverEmoji] = useState('📖');
  const [license, setLicense] = useState('Public Domain');
  const [sourceUrl, setSourceUrl] = useState('');
  const [chapterTitle, setChapterTitle] = useState('');
  const [chapterOrder, setChapterOrder] = useState(1);
  const [rawText, setRawText] = useState('');
  const [jobId, setJobId] = useState<string | null>(null);
  const [job, setJob] = useState<ImportJob | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setJob(null);

    const res = await fetch('/api/admin/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bookTitle, bookAuthor, coverEmoji, license, sourceUrl,
        chapterTitle, chapterOrder, rawText,
      }),
    });

    const data = await res.json() as { jobId?: string; error?: string };
    if (!res.ok) { setError(data.error ?? 'Unknown error'); setSubmitting(false); return; }
    setJobId(data.jobId ?? null);
    setSubmitting(false);
  }

  // Poll job status
  useEffect(() => {
    if (!jobId) return;
    const interval = setInterval(async () => {
      const res = await fetch(`/api/admin/jobs/${jobId}`);
      const data = await res.json() as ImportJob;
      setJob(data);
      if (data.status === 'done' || data.status === 'error') {
        clearInterval(interval);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [jobId]);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <fieldset className="space-y-3 rounded-lg border p-4">
        <legend className="px-1 font-semibold">Buku</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            placeholder="Judul buku *"
            value={bookTitle}
            onChange={(e) => setBookTitle(e.target.value)}
            required
            className="rounded border px-3 py-2 text-sm"
          />
          <input
            placeholder="Penulis"
            value={bookAuthor}
            onChange={(e) => setBookAuthor(e.target.value)}
            className="rounded border px-3 py-2 text-sm"
          />
          <input
            placeholder="Emoji sampul (mis. 📖)"
            value={coverEmoji}
            onChange={(e) => setCoverEmoji(e.target.value)}
            className="rounded border px-3 py-2 text-sm"
          />
          <input
            placeholder="Lisensi (Public Domain)"
            value={license}
            onChange={(e) => setLicense(e.target.value)}
            className="rounded border px-3 py-2 text-sm"
          />
          <input
            placeholder="URL sumber (opsional)"
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            type="url"
            className="rounded border px-3 py-2 text-sm sm:col-span-2"
          />
        </div>
      </fieldset>

      <fieldset className="space-y-3 rounded-lg border p-4">
        <legend className="px-1 font-semibold">Bab</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            type="number"
            min={1}
            placeholder="Nomor bab *"
            value={chapterOrder}
            onChange={(e) => setChapterOrder(Number(e.target.value))}
            required
            className="rounded border px-3 py-2 text-sm"
          />
          <input
            placeholder="Judul bab"
            value={chapterTitle}
            onChange={(e) => setChapterTitle(e.target.value)}
            className="rounded border px-3 py-2 text-sm"
          />
        </div>
        <textarea
          placeholder="Tempel teks Mandarin di sini…"
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          required
          rows={10}
          className="w-full rounded border px-3 py-2 text-sm font-[var(--font-hanzi)]"
        />
      </fieldset>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {job && (
        <div className={`rounded p-3 text-sm ${
          job.status === 'done' ? 'bg-green-50 text-green-800'
          : job.status === 'error' ? 'bg-red-50 text-red-800'
          : 'bg-gray-50 text-gray-700'
        }`}>
          Status: <strong>{job.status}</strong>
          {job.log && <pre className="mt-1 whitespace-pre-wrap text-xs">{job.log}</pre>}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="rounded bg-teal-600 px-6 py-2 font-medium text-white disabled:opacity-50"
      >
        {submitting ? 'Memproses…' : 'Import bab'}
      </button>
    </form>
  );
}
