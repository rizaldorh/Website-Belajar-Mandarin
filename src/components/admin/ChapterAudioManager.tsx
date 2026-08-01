'use client';

import { useRef, useState } from 'react';
import type { ChapterSummary } from '@/types';

interface BookGroup {
  bookId: string;
  bookTitle: string;
  chapters: ChapterSummary[];
}

interface Props {
  groups: BookGroup[];
}

export default function ChapterAudioManager({ groups }: Props) {
  const [audioUrls, setAudioUrls] = useState<Record<string, string | null>>(
    Object.fromEntries(
      groups.flatMap((g) => g.chapters.map((c) => [c.id, c.audio_url])),
    ),
  );
  const [uploading, setUploading] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingIdRef = useRef<string | null>(null);

  function triggerUpload(chapterId: string) {
    pendingIdRef.current = chapterId;
    setError(null);
    fileInputRef.current?.click();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    const chapterId = pendingIdRef.current;
    if (!file || !chapterId) return;

    setUploading(chapterId);
    setError(null);

    const formData = new FormData();
    formData.append('audio', file);

    try {
      const res = await fetch(`/api/admin/chapters/${chapterId}/audio`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json() as { url?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Upload gagal');
      setAudioUrls((prev) => ({ ...prev, [chapterId]: data.url! }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload gagal');
    } finally {
      setUploading(null);
      pendingIdRef.current = null;
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleRemove(chapterId: string) {
    setRemoving(chapterId);
    setError(null);
    try {
      const res = await fetch(`/api/admin/chapters/${chapterId}/audio`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        throw new Error(data.error ?? 'Gagal menghapus');
      }
      setAudioUrls((prev) => ({ ...prev, [chapterId]: null }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menghapus');
    } finally {
      setRemoving(null);
    }
  }

  return (
    <div className="space-y-6">
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/mpeg,audio/mp3,audio/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {error && (
        <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      {groups.map((group) => (
        <div key={group.bookId}>
          <h3 className="mb-2 text-sm font-semibold text-gray-600">{group.bookTitle}</h3>
          <div className="divide-y rounded-lg border">
            {group.chapters.map((chapter) => {
              const url = audioUrls[chapter.id];
              const isUploading = uploading === chapter.id;
              const isRemoving = removing === chapter.id;
              return (
                <div key={chapter.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                  <span className="flex-1 truncate text-gray-700">
                    Bab {chapter.order_index}
                    {chapter.title ? ` — ${chapter.title}` : ''}
                  </span>
                  {url ? (
                    <>
                      <span className="shrink-0 text-xs text-teal-600">🎧 Ada audio</span>
                      <button
                        onClick={() => triggerUpload(chapter.id)}
                        disabled={isUploading}
                        className="shrink-0 rounded bg-gray-100 px-2 py-1 text-xs hover:bg-gray-200 disabled:opacity-50"
                      >
                        {isUploading ? 'Mengunggah…' : 'Ganti'}
                      </button>
                      <button
                        onClick={() => handleRemove(chapter.id)}
                        disabled={isRemoving}
                        className="shrink-0 rounded bg-red-50 px-2 py-1 text-xs text-red-600 hover:bg-red-100 disabled:opacity-50"
                      >
                        {isRemoving ? '…' : 'Hapus'}
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="shrink-0 text-xs text-gray-400">Belum ada audio</span>
                      <button
                        onClick={() => triggerUpload(chapter.id)}
                        disabled={isUploading}
                        className="shrink-0 rounded bg-teal-600 px-2 py-1 text-xs text-white hover:bg-teal-700 disabled:opacity-50"
                      >
                        {isUploading ? 'Mengunggah…' : 'Upload'}
                      </button>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
