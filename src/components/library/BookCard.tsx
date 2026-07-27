import Link from 'next/link';
import ProgressRing from './ProgressRing';
import type { Book } from '@/types';

interface Props {
  book: Book;
  progressPercent: number;
  continueHref: string | null;
}

export default function BookCard({ book, progressPercent, continueHref }: Props) {
  const href = continueHref ?? `/books/${book.id}`;

  return (
    <Link href={href} className="flex flex-col rounded-xl border bg-white p-4 shadow-sm hover:shadow transition-shadow">
      <div className="flex items-start justify-between">
        <span className="text-4xl">{book.cover_emoji}</span>
        <ProgressRing percent={progressPercent} />
      </div>
      <h2 className="mt-2 font-semibold leading-tight">{book.title}</h2>
      {book.author && (
        <p className="mt-1 text-xs text-gray-500">{book.author}</p>
      )}
      {continueHref && (
        <span className="mt-2 text-xs font-medium text-teal-600">Lanjutkan →</span>
      )}
    </Link>
  );
}
