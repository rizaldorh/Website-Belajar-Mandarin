-- Books (content, readable by all authenticated users)
CREATE TABLE books (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text NOT NULL,
  author      text,
  cover_emoji text NOT NULL DEFAULT '📖',
  license     text NOT NULL DEFAULT 'Public Domain',
  source_url  text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Chapters (content, readable by all authenticated users)
CREATE TABLE chapters (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id      uuid NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  order_index  int NOT NULL,
  title        text,
  content_json jsonb NOT NULL,
  word_count   int,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (book_id, order_index)
);

-- Per-user reading progress
CREATE TABLE user_progress (
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chapter_id      uuid NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  scroll_position int NOT NULL DEFAULT 0,
  completed       boolean NOT NULL DEFAULT false,
  updated_at      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, chapter_id)
);

-- Per-user saved vocabulary
CREATE TABLE vocab_entries (
  id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hanzi    text NOT NULL,
  pinyin   text,
  gloss    text,
  added_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, hanzi)
);

-- Admin import jobs
CREATE TABLE import_jobs (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id    uuid REFERENCES books(id),
  status     text NOT NULL CHECK (status IN ('pending','processing','done','error')),
  log        text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE books ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE vocab_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_jobs ENABLE ROW LEVEL SECURITY;

-- Books: authenticated users can read; no direct write (service key only)
CREATE POLICY "books_select" ON books FOR SELECT TO authenticated USING (true);

-- Chapters: authenticated users can read; no direct write
CREATE POLICY "chapters_select" ON chapters FOR SELECT TO authenticated USING (true);

-- User progress: users own their rows
CREATE POLICY "progress_select" ON user_progress FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "progress_insert" ON user_progress FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "progress_update" ON user_progress FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "progress_delete" ON user_progress FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Vocab entries: users own their rows
CREATE POLICY "vocab_select" ON vocab_entries FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "vocab_insert" ON vocab_entries FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "vocab_update" ON vocab_entries FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "vocab_delete" ON vocab_entries FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Import jobs: service key only (no RLS policies for authenticated role)
