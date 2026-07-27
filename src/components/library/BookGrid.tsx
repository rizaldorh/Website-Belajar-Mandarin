import type { Book, UserProgress, Chapter } from '@/types';
import BookCard from './BookCard';

interface BookWithProgress {
  book: Book;
  chapters: Chapter[];
  progress: UserProgress[];
}

function getContinueHref(chapters: Chapter[], progress: UserProgress[]): string | null {
  if (progress.length === 0) return null;
  const lastStarted = [...progress]
    .filter((p) => p.scroll_position > 0 || p.completed)
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())[0];
  if (!lastStarted) return null;
  const chapter = chapters.find((c) => c.id === lastStarted.chapter_id);
  return chapter ? `/books/${chapter.book_id}/chapters/${chapter.id}` : null;
}

function getProgressPercent(chapters: Chapter[], progress: UserProgress[]): number {
  if (chapters.length === 0) return 0;
  const completed = progress.filter((p) => p.completed).length;
  return Math.round((completed / chapters.length) * 100);
}

interface Props {
  items: BookWithProgress[];
}

export default function BookGrid({ items }: Props) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {items.map(({ book, chapters, progress }) => (
        <BookCard
          key={book.id}
          book={book}
          progressPercent={getProgressPercent(chapters, progress)}
          continueHref={getContinueHref(chapters, progress)}
        />
      ))}
    </div>
  );
}
