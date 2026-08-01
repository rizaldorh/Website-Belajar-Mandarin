-- Allow unauthenticated (anon) users to read public content
DROP POLICY IF EXISTS "books_select" ON books;
DROP POLICY IF EXISTS "chapters_select" ON chapters;

CREATE POLICY "books_select"    ON books    FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "chapters_select" ON chapters FOR SELECT TO anon, authenticated USING (true);
