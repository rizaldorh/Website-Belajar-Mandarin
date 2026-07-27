-- Add unique constraint on books.title to support upsert on conflict
ALTER TABLE books ADD CONSTRAINT books_title_unique UNIQUE (title);
