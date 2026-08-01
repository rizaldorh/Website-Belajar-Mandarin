export type Pos =
  | 'noun'
  | 'verb'
  | 'adj'
  | 'adv'
  | 'pron'
  | 'propn'
  | 'particle'
  | 'numeral'
  | 'function'
  | 'punct';

export interface Token {
  hanzi: string;
  pinyin: string;
  pos: Pos;
  hsk: 1 | 2 | 3 | 4 | 5 | 6 | null;
  gloss_id: string;
}

export interface Sentence {
  id: string;
  tokens: Token[];
}

export interface Paragraph {
  id: string;
  translation_id: string;
  sentences: Sentence[];
}

/** Content-level chapter structure (parsed JSON, not a DB row). */
export interface ChapterContent {
  title: string;
  chapterLabel: string;
  paragraphs: Paragraph[];
}

export type ColorMode = 'pos' | 'hsk';

// ---- DB row types ----

export interface Book {
  id: string;
  title: string;
  author: string | null;
  cover_emoji: string;
  license: string;
  source_url: string | null;
  created_at: string;
}

export interface Chapter {
  id: string;
  book_id: string;
  order_index: number;
  title: string | null;
  content_json: { paragraphs: Paragraph[] };
  word_count: number | null;
  audio_url: string | null;
  created_at: string;
}

export interface ChapterSummary {
  id: string;
  book_id: string;
  order_index: number;
  title: string | null;
  audio_url: string | null;
}

export interface UserProgress {
  user_id: string;
  chapter_id: string;
  scroll_position: number;
  completed: boolean;
  updated_at: string;
}

export interface VocabEntry {
  id: string;
  user_id: string;
  hanzi: string;
  pinyin: string | null;
  gloss: string | null;
  added_at: string;
}

export interface ImportJob {
  id: string;
  book_id: string | null;
  status: 'pending' | 'processing' | 'done' | 'error';
  log: string | null;
  created_at: string;
}

// ---- Upsert input types ----

export interface ProgressUpdate {
  scroll_position?: number;
  completed?: boolean;
}

export interface VocabInput {
  hanzi: string;
  pinyin?: string;
  gloss?: string;
}
