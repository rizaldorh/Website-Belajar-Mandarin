# Belajar Mandarin Foundation & Reader Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the existing static Vite/React Chinese reading app to Next.js 15 + Supabase (Auth + Postgres), overhaul the reader UI, and add a multi-user library with chapter navigation and a Gemini-powered admin paste-in importer.

**Architecture:** Next.js 15 App Router with `src/` source root. All existing React components, Zustand store, and utility libraries migrate with minimal changes. Supabase replaces localStorage for user data and replaces JSON-file chapters with a `chapters.content_json` column. Gemini API handles NLP at import time and Jelaskan explanations on demand. Pages are Server Components by default; reader interactivity stays client-side in Zustand.

**Tech Stack:** Next.js 15, TypeScript (strict), Tailwind CSS 3, Supabase JS v2 + SSR, Zustand, @floating-ui/react, pinyin-pro, @google/generative-ai, zod, Vitest + React Testing Library, tsx (for seed script)

## Global Constraints

- TypeScript `"strict": true` — no `any`, no untyped returns on exported functions
- Tailwind CSS **3** only — do NOT upgrade to v4 (breaking API changes)
- Next.js **15** App Router only — no Pages Router, no `getServerSideProps`
- Supabase JS **v2** (`@supabase/supabase-js@^2`, `@supabase/ssr@^0`)
- Gemini model: `gemini-1.5-flash` — not Pro (cost/speed tradeoff)
- All user-facing strings in **Bahasa Indonesia**
- `Pos` union: `noun | verb | adj | adv | pron | propn | particle | numeral | function | punct` — never add new values
- Token ID format: `${sentenceId}-${tokenIndex}` — always split on the **last** hyphen
- `localStorage` key prefix: `belajar-mandarin:` — keep for palette/speed/non-user-data persistence
- Vitest for all tests; `npm run test` must pass before each commit
- Mobile-first; minimum tap target **44 × 44 px**
- After Task 4, **never** import `src/data/chapter1.json` in app runtime code — data comes from Supabase
- Do NOT regress existing pinyin, POS tagging, or segmentation correctness

---

## File Map

### New files created by this plan
```
src/app/
  layout.tsx                        Root layout — Supabase session provider, Noto Serif SC
  page.tsx                          Library home (Server Component, book grid)
  auth/login/page.tsx               Email + Google OAuth login page
  auth/callback/route.ts            Supabase OAuth exchange
  books/[bookId]/page.tsx           Book detail + chapter ToC (Server Component)
  books/[bookId]/chapters/[chapterId]/page.tsx   Chapter reader page
  admin/page.tsx                    Admin paste-in form + import job log
  api/jelaskan/route.ts             POST — Gemini grammar explanation
  api/admin/import/route.ts         POST — create import job + run NLP pipeline
  api/admin/jobs/[id]/route.ts      GET — job status polling

src/lib/
  supabase/client.ts                Browser Supabase client
  supabase/server.ts                Server Supabase client (cookies)
  db/books.ts                       getBooks(), getBook(id)
  db/chapters.ts                    getChapter(id), getChaptersByBook(bookId), getAdjacentChapters(id)
  db/progress.ts                    getProgress(userId,chapterId), upsertProgress(...)
  db/vocab.ts                       getVocab(userId), addVocabEntry(...), removeVocabEntry(...)
  nlp/gemini-annotate.ts            annotateChapter(rawText, apiKey): Promise<ChapterContent>

src/components/
  reader/ColorLegend.tsx            New — collapsible POS/HSK color legend
  reader/ProgressBar.tsx            New — fixed-top reading progress bar
  library/BookCard.tsx              Book grid card
  library/BookGrid.tsx              Responsive grid wrapper
  library/ChapterList.tsx           Chapter rows with progress
  library/ProgressRing.tsx          SVG circular progress ring
  admin/AdminForm.tsx               Admin paste-in form + polling

supabase/migrations/0001_initial.sql   Full schema with RLS policies

scripts/seed.ts                     One-time seed of chapter1.json into Supabase

middleware.ts                       Route protection + admin email check
next.config.ts                      Next.js config
```

### Files modified by this plan
```
src/types.ts                        Add Book, Chapter, UserProgress, ImportJob DB types
src/store/readerStore.ts            Add activeWordIndex, playbackRate, colorPalette
src/lib/colors.ts                   Add COLORBLIND_PALETTE, palette param to getUnderlineClass
src/lib/tts.ts                      Add speakWithHighlight(), playbackRate param
src/lib/vocab.ts                    Switch to Supabase (keep localStorage API shape for tests)
src/components/reader/WordToken.tsx Punctuation fix, activeWordIndex highlight
src/components/reader/LookupPopup.tsx Cari sub-panel, Supabase vocab
src/components/reader/ParagraphActions.tsx  Terjemahkan per-paragraph + Jelaskan per-sentence
src/components/reader/Toolbar.tsx   Speed control, legend toggle, remove translation toggle
src/components/reader/Reader.tsx    Supabase data, progress bar, resume, chapter prop
tailwind.config.js                  Add colorblind palette color tokens
package.json                        Add/remove dependencies, update scripts
vitest.config.ts                    Update for Next.js compat
```

### Files deleted after migration
```
src/main.tsx          replaced by src/app/layout.tsx
src/App.tsx           replaced by src/app/page.tsx + chapter page
src/App.test.tsx      deleted (covered by new page tests)
index.html            Next.js handles HTML shell
vite.config.ts        replaced by next.config.ts
```

---

### Task 1: Next.js scaffold + dependency migration

**Files:**
- Modify: `package.json`
- Create: `next.config.ts`
- Modify: `tsconfig.json`
- Modify: `vitest.config.ts`
- Delete: `vite.config.ts`, `index.html`, `src/main.tsx`

**Interfaces:**
- Produces: working `npm run dev` (Next.js), `npm run test`, `npm run build`

- [ ] **Step 1: Install Next.js and Supabase packages, remove Vite**

```bash
npm remove vite @vitejs/plugin-react
npm install next@15 react@18 react-dom@18
npm install @supabase/supabase-js @supabase/ssr
npm install @google/generative-ai zod
npm install --save-dev @types/node tsx
```

- [ ] **Step 2: Create `next.config.ts`**

```typescript
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    typedRoutes: true,
  },
};

export default nextConfig;
```

- [ ] **Step 3: Update `tsconfig.json` for Next.js**

Replace the existing tsconfig with:

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 4: Update `vitest.config.ts` for Next.js**

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

- [ ] **Step 5: Update `package.json` scripts**

Replace the `scripts` block:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "test": "vitest run",
    "test:watch": "vitest",
    "generate:pinyin": "node scripts/generate-pinyin.mjs",
    "seed": "npx tsx scripts/seed.ts"
  }
}
```

- [ ] **Step 6: Create `src/app/` directory marker**

Create `src/app/.gitkeep` (empty file) so the directory exists:

```bash
mkdir -p src/app
```

- [ ] **Step 7: Delete Vite-specific files**

```bash
rm vite.config.ts index.html src/main.tsx
```

- [ ] **Step 8: Create minimal `src/app/layout.tsx` to satisfy Next.js**

```typescript
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 9: Create minimal `src/app/page.tsx`**

```typescript
export default function Home() {
  return <main><h1>Belajar Mandarin</h1></main>;
}
```

- [ ] **Step 10: Verify build passes**

```bash
npm run build
```

Expected: successful build with no TypeScript errors.

- [ ] **Step 11: Verify tests still pass**

```bash
npm run test
```

Expected: all existing tests pass (they don't depend on Vite-specific APIs).

- [ ] **Step 12: Commit**

```bash
git add -A
git commit -m "feat: migrate from Vite to Next.js 15"
```

---

### Task 2: Supabase schema + client helpers

**Files:**
- Create: `supabase/migrations/0001_initial.sql`
- Create: `src/lib/supabase/client.ts`
- Create: `src/lib/supabase/server.ts`

**Interfaces:**
- Produces: `createBrowserClient()` → Supabase browser client; `createServerClient()` → Supabase server client (cookies-based)

- [ ] **Step 1: Create the SQL migration file**

Create `supabase/migrations/0001_initial.sql`:

```sql
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
```

- [ ] **Step 2: Apply migration to local Supabase dev**

```bash
npx supabase db push
```

(Or run the SQL manually in Supabase Studio if using a remote project.)

- [ ] **Step 3: Create browser client helper**

Create `src/lib/supabase/client.ts`:

```typescript
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
```

- [ ] **Step 4: Create server client helper**

Create `src/lib/supabase/server.ts`:

```typescript
import { createServerClient as createSSRClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createServerClient() {
  const cookieStore = await cookies();
  return createSSRClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Ignored — read-only context (middleware already handled it)
          }
        },
      },
    },
  );
}
```

- [ ] **Step 5: Create `.env.local` template (do not commit)**

Create `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key
GEMINI_API_KEY=your-gemini-key
ADMIN_EMAILS=your@email.com
```

Add `.env.local` to `.gitignore` if not already present.

- [ ] **Step 6: Commit**

```bash
git add supabase/ src/lib/supabase/ .gitignore
git commit -m "feat: add Supabase schema and client helpers"
```

---

### Task 3: Type system + DB query helpers + middleware

**Files:**
- Modify: `src/types.ts`
- Create: `src/lib/db/books.ts`
- Create: `src/lib/db/chapters.ts`
- Create: `src/lib/db/progress.ts`
- Create: `src/lib/db/vocab.ts`
- Create: `middleware.ts`

**Interfaces:**
- Produces: `getBooks()`, `getBook(id)`, `getChapter(id)`, `getChaptersByBook(bookId)`, `getAdjacentChapters(chapterId)`, `getProgress(userId, chapterId)`, `upsertProgress(userId, chapterId, data)`, `getVocab(userId)`, `addVocabEntry(userId, entry)`, `removeVocabEntry(userId, hanzi)`
- Produces: `Book`, `Chapter`, `UserProgress`, `ImportJob` TypeScript types

- [ ] **Step 1: Extend `src/types.ts` with DB types**

Append to the existing `src/types.ts` (keep all existing types unchanged):

```typescript
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
  created_at: string;
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
```

- [ ] **Step 2: Create `src/lib/db/books.ts`**

```typescript
import { createServerClient } from '@/lib/supabase/server';
import type { Book } from '@/types';

export async function getBooks(): Promise<Book[]> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from('books')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return data as Book[];
}

export async function getBook(id: string): Promise<Book | null> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from('books')
    .select('*')
    .eq('id', id)
    .single();
  if (error) return null;
  return data as Book;
}
```

- [ ] **Step 3: Create `src/lib/db/chapters.ts`**

```typescript
import { createServerClient } from '@/lib/supabase/server';
import type { Chapter } from '@/types';

export async function getChaptersByBook(bookId: string): Promise<Chapter[]> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from('chapters')
    .select('*')
    .eq('book_id', bookId)
    .order('order_index', { ascending: true });
  if (error) throw new Error(error.message);
  return data as Chapter[];
}

export async function getChapter(id: string): Promise<Chapter | null> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from('chapters')
    .select('*')
    .eq('id', id)
    .single();
  if (error) return null;
  return data as Chapter;
}

export async function getAdjacentChapters(
  chapterId: string,
  bookId: string,
): Promise<{ prev: Chapter | null; next: Chapter | null }> {
  const chapters = await getChaptersByBook(bookId);
  const idx = chapters.findIndex((c) => c.id === chapterId);
  return {
    prev: idx > 0 ? chapters[idx - 1] : null,
    next: idx < chapters.length - 1 ? chapters[idx + 1] : null,
  };
}
```

- [ ] **Step 4: Create `src/lib/db/progress.ts`**

```typescript
import { createServerClient } from '@/lib/supabase/server';
import { createClient } from '@/lib/supabase/client';
import type { UserProgress, ProgressUpdate } from '@/types';

export async function getProgress(
  userId: string,
  chapterId: string,
): Promise<UserProgress | null> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from('user_progress')
    .select('*')
    .eq('user_id', userId)
    .eq('chapter_id', chapterId)
    .single();
  if (error) return null;
  return data as UserProgress;
}

export async function getBookProgress(
  userId: string,
  bookId: string,
): Promise<UserProgress[]> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from('user_progress')
    .select('*, chapters!inner(book_id)')
    .eq('user_id', userId)
    .eq('chapters.book_id', bookId);
  if (error) return [];
  return data as UserProgress[];
}

// Client-side: called from browser on scroll / completion
export async function upsertProgressClient(
  chapterId: string,
  update: ProgressUpdate,
): Promise<void> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from('user_progress').upsert(
    {
      user_id: user.id,
      chapter_id: chapterId,
      ...update,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,chapter_id' },
  );
}
```

- [ ] **Step 5: Create `src/lib/db/vocab.ts`**

```typescript
import { createClient } from '@/lib/supabase/client';
import type { VocabEntry, VocabInput } from '@/types';

export async function getVocab(): Promise<VocabEntry[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('vocab_entries')
    .select('*')
    .order('added_at', { ascending: false });
  if (error) return [];
  return data as VocabEntry[];
}

export async function addVocabEntry(entry: VocabInput): Promise<void> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from('vocab_entries').upsert(
    { user_id: user.id, ...entry },
    { onConflict: 'user_id,hanzi' },
  );
}

export async function removeVocabEntry(hanzi: string): Promise<void> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from('vocab_entries')
    .delete()
    .eq('user_id', user.id)
    .eq('hanzi', hanzi);
}

export async function isVocabSaved(hanzi: string): Promise<boolean> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase
    .from('vocab_entries')
    .select('id')
    .eq('user_id', user.id)
    .eq('hanzi', hanzi)
    .single();
  return data !== null;
}
```

- [ ] **Step 6: Create `middleware.ts`**

```typescript
import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;

  if (!user && (path.startsWith('/books') || path.startsWith('/admin'))) {
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  if (path.startsWith('/admin') && user) {
    const adminEmails = (process.env.ADMIN_EMAILS ?? '')
      .split(',')
      .map((e) => e.trim())
      .filter(Boolean);
    if (!adminEmails.includes(user.email ?? '')) {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ['/books/:path*', '/admin/:path*'],
};
```

- [ ] **Step 7: Run tests**

```bash
npm run test
```

Expected: all pass (no tests exist yet for these files; existing component tests still pass).

- [ ] **Step 8: Commit**

```bash
git add src/types.ts src/lib/db/ middleware.ts
git commit -m "feat: add DB query helpers, extended types, and auth middleware"
```

---

### Task 4: Auth pages + root layout + seed script

**Files:**
- Modify: `src/app/layout.tsx`
- Create: `src/app/auth/login/page.tsx`
- Create: `src/app/auth/callback/route.ts`
- Create: `scripts/seed.ts`

**Interfaces:**
- Produces: working login flow (email + Google OAuth); Supabase session cookies set in browser
- Produces: `npm run seed` populates `books` + `chapters` from `chapter1.json`

- [ ] **Step 1: Update root layout with Noto Serif SC and session check**

Replace `src/app/layout.tsx`:

```tsx
import type { Metadata } from 'next';
import { Noto_Serif_SC } from 'next/font/google';
import '../index.css';

const notoSerifSC = Noto_Serif_SC({
  subsets: ['chinese-simplified'],
  weight: ['400', '700'],
  variable: '--font-hanzi',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Belajar Mandarin',
  description: 'Baca teks Mandarin dengan anotasi bahasa Indonesia',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={notoSerifSC.variable}>
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Create login page**

Create `src/app/auth/login/page.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const supabase = createClient();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const fn = mode === 'login'
      ? supabase.auth.signInWithPassword({ email, password })
      : supabase.auth.signUp({ email, password });
    const { error: authError } = await fn;
    if (authError) { setError(authError.message); setLoading(false); return; }
    router.push('/');
    router.refresh();
  }

  async function handleGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}/auth/callback` },
    });
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <h1 className="text-center text-2xl font-bold">Belajar Mandarin</h1>
        <form onSubmit={handleEmail} className="space-y-3">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded border px-3 py-2 text-sm"
          />
          <input
            type="password"
            placeholder="Kata sandi"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full rounded border px-3 py-2 text-sm"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded bg-teal-600 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {loading ? 'Memproses…' : mode === 'login' ? 'Masuk' : 'Daftar'}
          </button>
        </form>
        <button
          onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
          className="w-full text-sm text-gray-500 underline"
        >
          {mode === 'login' ? 'Belum punya akun? Daftar' : 'Sudah punya akun? Masuk'}
        </button>
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center text-xs text-gray-400">
            <span className="bg-gray-50 px-2">atau</span>
          </div>
        </div>
        <button
          onClick={handleGoogle}
          className="w-full rounded border py-2 text-sm font-medium"
        >
          Masuk dengan Google
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create OAuth callback route**

Create `src/app/auth/callback/route.ts`:

```typescript
import { createServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  if (code) {
    const supabase = await createServerClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(new URL('/', origin));
}
```

- [ ] **Step 4: Write the seed script**

Create `scripts/seed.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY!;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function seed() {
  const chapterJson = JSON.parse(
    readFileSync(join(process.cwd(), 'src/data/chapter1.json'), 'utf-8'),
  );

  // Upsert book
  const { data: book, error: bookError } = await supabase
    .from('books')
    .upsert(
      {
        title: 'Cerita Rakyat Tiongkok',
        author: 'Anonim',
        cover_emoji: '🐇',
        license: 'Public Domain',
      },
      { onConflict: 'title' },
    )
    .select()
    .single();

  if (bookError) { console.error('Book upsert failed:', bookError.message); process.exit(1); }
  console.log('Book:', book.id, book.title);

  // Count tokens for word_count
  const wordCount = chapterJson.paragraphs
    .flatMap((p: { sentences: { tokens: { pos: string }[] }[] }) => p.sentences)
    .flatMap((s: { tokens: { pos: string }[] }) => s.tokens)
    .filter((t: { pos: string }) => t.pos !== 'punct').length;

  // Upsert chapter
  const { data: chapter, error: chapterError } = await supabase
    .from('chapters')
    .upsert(
      {
        book_id: book.id,
        order_index: 1,
        title: chapterJson.title,
        content_json: { paragraphs: chapterJson.paragraphs },
        word_count: wordCount,
      },
      { onConflict: 'book_id,order_index' },
    )
    .select()
    .single();

  if (chapterError) { console.error('Chapter upsert failed:', chapterError.message); process.exit(1); }
  console.log('Chapter:', chapter.id, chapter.title);
  console.log('Seed complete.');
}

seed().catch((err) => { console.error(err); process.exit(1); });
```

- [ ] **Step 5: Run the seed (requires `.env.local` populated)**

```bash
npm run seed
```

Expected: "Seed complete." — verify in Supabase Studio that the `books` and `chapters` tables have rows.

- [ ] **Step 6: Commit**

```bash
git add src/app/ scripts/seed.ts
git commit -m "feat: add auth pages, root layout, and seed script"
```

---

### Task 5: Zustand store + Tailwind colorblind palette + ColorLegend

**Files:**
- Modify: `src/store/readerStore.ts`
- Modify: `src/lib/colors.ts`
- Modify: `tailwind.config.js`
- Create: `src/components/reader/ColorLegend.tsx`

**Interfaces:**
- Produces: `useReaderStore` gains `activeWordIndex: string | null`, `playbackRate: 0.5 | 0.75 | 1.0`, `colorPalette: 'default' | 'colorblind' | 'off'`
- Produces: `getUnderlineClass(token, mode, palette): string`
- Produces: `<ColorLegend />` — collapsible panel showing POS→color swatches

- [ ] **Step 1: Write failing tests for new store state**

Add to `src/store/readerStore.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { useReaderStore } from './readerStore';
import { act } from '@testing-library/react';

describe('readerStore additions', () => {
  beforeEach(() => {
    useReaderStore.setState({
      activeWordIndex: null,
      playbackRate: 1.0,
      colorPalette: 'default',
    });
  });

  it('setActiveWordIndex updates activeWordIndex', () => {
    act(() => useReaderStore.getState().setActiveWordIndex('p1s1-2'));
    expect(useReaderStore.getState().activeWordIndex).toBe('p1s1-2');
  });

  it('setPlaybackRate persists rate', () => {
    act(() => useReaderStore.getState().setPlaybackRate(0.5));
    expect(useReaderStore.getState().playbackRate).toBe(0.5);
  });

  it('setColorPalette updates palette', () => {
    act(() => useReaderStore.getState().setColorPalette('colorblind'));
    expect(useReaderStore.getState().colorPalette).toBe('colorblind');
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npm run test -- readerStore
```

Expected: FAIL with "setActiveWordIndex is not a function"

- [ ] **Step 3: Update `src/store/readerStore.ts`**

```typescript
import { create } from 'zustand';
import type { ColorMode } from '@/types';

type Palette = 'default' | 'colorblind' | 'off';
type Rate = 0.5 | 0.75 | 1.0;

interface ReaderState {
  showChinese: boolean;
  showPinyin: boolean;
  colorMode: ColorMode;
  activeTokenId: string | null;
  activeWordIndex: string | null;
  playbackRate: Rate;
  colorPalette: Palette;
  toggleChinese: () => void;
  togglePinyin: () => void;
  setColorMode: (mode: ColorMode) => void;
  setActiveTokenId: (id: string | null) => void;
  setActiveWordIndex: (id: string | null) => void;
  setPlaybackRate: (rate: Rate) => void;
  setColorPalette: (palette: Palette) => void;
}

export const useReaderStore = create<ReaderState>((set) => ({
  showChinese: true,
  showPinyin: true,
  colorMode: 'pos',
  activeTokenId: null,
  activeWordIndex: null,
  playbackRate: 1.0,
  colorPalette: 'default',
  toggleChinese: () => set((s) => ({ showChinese: !s.showChinese })),
  togglePinyin: () => set((s) => ({ showPinyin: !s.showPinyin })),
  setColorMode: (mode) => set({ colorMode: mode }),
  setActiveTokenId: (id) => set({ activeTokenId: id }),
  setActiveWordIndex: (id) => set({ activeWordIndex: id }),
  setPlaybackRate: (rate) => set({ playbackRate: rate }),
  setColorPalette: (palette) => set({ colorPalette: palette }),
}));
```

- [ ] **Step 4: Run test — expect PASS**

```bash
npm run test -- readerStore
```

- [ ] **Step 5: Add colorblind palette tokens to `tailwind.config.js`**

Inside the `theme.extend.colors` block, add alongside the existing `pos.*` and `hsk.*` tokens:

```javascript
'pos-cb': {
  noun:     '#56B4E9',
  verb:     '#E69F00',
  adj:      '#009E73',
  adv:      '#F0E442',
  pron:     '#0072B2',
  propn:    '#CC79A7',
  particle: '#D55E00',
  numeral:  '#88CCEE',
  function: '#999999',
},
```

- [ ] **Step 6: Write failing tests for updated `getUnderlineClass`**

Add to `src/lib/colors.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { getUnderlineClass } from './colors';
import type { Token } from '@/types';

const noun: Token = { hanzi: '农夫', pinyin: 'nóng fū', pos: 'noun', hsk: 4, gloss_id: 'petani' };

describe('getUnderlineClass with palette', () => {
  it('returns border-transparent for "off" palette regardless of pos', () => {
    expect(getUnderlineClass(noun, 'pos', 'off')).toBe('border-transparent');
  });

  it('returns colorblind class for colorblind palette', () => {
    expect(getUnderlineClass(noun, 'pos', 'colorblind')).toBe('border-pos-cb-noun');
  });

  it('returns default class when palette is default', () => {
    expect(getUnderlineClass(noun, 'pos', 'default')).toBe('border-pos-noun');
  });
});
```

- [ ] **Step 7: Run test — expect FAIL**

```bash
npm run test -- colors
```

- [ ] **Step 8: Update `src/lib/colors.ts`**

```typescript
import type { ColorMode, Token } from '@/types';

type Palette = 'default' | 'colorblind' | 'off';

const POS_UNDERLINE_CLASSES: Record<Token['pos'], string> = {
  noun:     'border-pos-noun',
  verb:     'border-pos-verb',
  adj:      'border-pos-adj',
  adv:      'border-pos-adv',
  pron:     'border-pos-pron',
  propn:    'border-pos-propn',
  particle: 'border-pos-particle',
  numeral:  'border-pos-numeral',
  function: 'border-pos-function',
  punct:    'border-transparent',
};

const POS_CB_CLASSES: Record<Token['pos'], string> = {
  noun:     'border-pos-cb-noun',
  verb:     'border-pos-cb-verb',
  adj:      'border-pos-cb-adj',
  adv:      'border-pos-cb-adv',
  pron:     'border-pos-cb-pron',
  propn:    'border-pos-cb-propn',
  particle: 'border-pos-cb-particle',
  numeral:  'border-pos-cb-numeral',
  function: 'border-pos-cb-function',
  punct:    'border-transparent',
};

const HSK_UNDERLINE_CLASSES: Record<string, string> = {
  '1': 'border-hsk-1',
  '2': 'border-hsk-2',
  '3': 'border-hsk-3',
  '4': 'border-hsk-4',
  '5': 'border-hsk-5',
  '6': 'border-hsk-6',
  none: 'border-hsk-none',
};

export function getUnderlineClass(token: Token, mode: ColorMode, palette: Palette = 'default'): string {
  if (token.pos === 'punct' || palette === 'off') return 'border-transparent';
  if (mode === 'hsk') {
    return HSK_UNDERLINE_CLASSES[token.hsk === null ? 'none' : String(token.hsk)];
  }
  return palette === 'colorblind' ? POS_CB_CLASSES[token.pos] : POS_UNDERLINE_CLASSES[token.pos];
}

// POS labels in Indonesian for the legend
export const POS_LABELS: Record<Token['pos'], string> = {
  noun:     'Kata benda',
  verb:     'Kata kerja',
  adj:      'Kata sifat',
  adv:      'Kata keterangan',
  pron:     'Kata ganti',
  propn:    'Nama diri',
  particle: 'Partikel',
  numeral:  'Numeralia',
  function: 'Kata fungsi',
  punct:    'Tanda baca',
};
```

- [ ] **Step 9: Run test — expect PASS**

```bash
npm run test -- colors
```

- [ ] **Step 10: Create `src/components/reader/ColorLegend.tsx`**

```tsx
'use client';

import { useState } from 'react';
import { useReaderStore } from '@/store/readerStore';
import { POS_LABELS } from '@/lib/colors';
import type { Token } from '@/types';

const POS_SWATCH_CLASSES: Record<Token['pos'], { default: string; colorblind: string }> = {
  noun:     { default: 'bg-pos-noun',     colorblind: 'bg-pos-cb-noun' },
  verb:     { default: 'bg-pos-verb',     colorblind: 'bg-pos-cb-verb' },
  adj:      { default: 'bg-pos-adj',      colorblind: 'bg-pos-cb-adj' },
  adv:      { default: 'bg-pos-adv',      colorblind: 'bg-pos-cb-adv' },
  pron:     { default: 'bg-pos-pron',     colorblind: 'bg-pos-cb-pron' },
  propn:    { default: 'bg-pos-propn',    colorblind: 'bg-pos-cb-propn' },
  particle: { default: 'bg-pos-particle', colorblind: 'bg-pos-cb-particle' },
  numeral:  { default: 'bg-pos-numeral',  colorblind: 'bg-pos-cb-numeral' },
  function: { default: 'bg-pos-function', colorblind: 'bg-pos-cb-function' },
  punct:    { default: 'bg-transparent',  colorblind: 'bg-transparent' },
};

const POS_KEYS = Object.keys(POS_LABELS).filter((k) => k !== 'punct') as Token['pos'][];

export default function ColorLegend() {
  const [open, setOpen] = useState(false);
  const colorPalette = useReaderStore((s) => s.colorPalette);
  const setColorPalette = useReaderStore((s) => s.setColorPalette);

  return (
    <div className="border-b bg-white px-4 py-2 text-sm">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 font-medium text-gray-600"
        aria-expanded={open}
      >
        <span>Legenda warna</span>
        <span>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="mt-2 space-y-2">
          <div className="flex gap-2">
            {(['default', 'colorblind', 'off'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setColorPalette(p)}
                className={`rounded px-2 py-1 text-xs ${
                  colorPalette === p
                    ? 'bg-gray-800 text-white'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                {p === 'default' ? 'Standar' : p === 'colorblind' ? 'Buta warna' : 'Mati'}
              </button>
            ))}
          </div>
          {colorPalette !== 'off' && (
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3">
              {POS_KEYS.map((pos) => (
                <div key={pos} className="flex items-center gap-2">
                  <span
                    className={`inline-block h-3 w-3 rounded-sm border-2 ${POS_SWATCH_CLASSES[pos][colorPalette]}`}
                  />
                  <span className="text-gray-700">{POS_LABELS[pos]}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 11: Run all tests**

```bash
npm run test
```

Expected: all pass.

- [ ] **Step 12: Commit**

```bash
git add src/store/ src/lib/colors.ts tailwind.config.js src/components/reader/ColorLegend.tsx
git commit -m "feat: add colorblind palette, color legend component, and extended store"
```

---

### Task 6: WordToken punctuation fix + per-word highlight

**Files:**
- Modify: `src/components/reader/WordToken.tsx`
- Modify: `src/components/reader/WordToken.test.tsx`

**Interfaces:**
- Consumes: `useReaderStore` — `activeWordIndex`, `colorPalette`
- Produces: punctuation tokens render as plain `<span>` with `-0.1em` left margin; non-punct tokens get `outline-amber-400` ring when their `tokenId === activeWordIndex`

- [ ] **Step 1: Write failing tests**

Add to `src/components/reader/WordToken.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import WordToken from './WordToken';
import { useReaderStore } from '@/store/readerStore';

const punctToken = { hanzi: '，', pinyin: '', pos: 'punct' as const, hsk: null, gloss_id: '' };
const nounToken = { hanzi: '农夫', pinyin: 'nóng fū', pos: 'noun' as const, hsk: 4, gloss_id: 'petani' };

describe('WordToken punctuation', () => {
  it('renders punctuation without a pinyin slot', () => {
    const { container } = render(<WordToken token={punctToken} tokenId="p1s1-1" />);
    expect(container.querySelector('[data-token-id]')).toBeNull();
    expect(container.textContent).toBe('，');
  });

  it('punctuation has negative margin class', () => {
    const { container } = render(<WordToken token={punctToken} tokenId="p1s1-1" />);
    const span = container.querySelector('span');
    expect(span?.className).toContain('-ml');
  });
});

describe('WordToken word highlight', () => {
  it('applies highlight ring when activeWordIndex matches tokenId', () => {
    useReaderStore.setState({ activeWordIndex: 'p1s1-2' });
    const { container } = render(<WordToken token={nounToken} tokenId="p1s1-2" />);
    const btn = container.querySelector('[data-token-id="p1s1-2"]');
    expect(btn?.className).toContain('outline');
  });

  it('no highlight ring when tokenId does not match', () => {
    useReaderStore.setState({ activeWordIndex: 'p1s1-99' });
    const { container } = render(<WordToken token={nounToken} tokenId="p1s1-2" />);
    const btn = container.querySelector('[data-token-id="p1s1-2"]');
    expect(btn?.className).not.toContain('outline-amber');
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npm run test -- WordToken
```

- [ ] **Step 3: Rewrite `src/components/reader/WordToken.tsx`**

```tsx
'use client';

import { useReaderStore } from '@/store/readerStore';
import { getUnderlineClass } from '@/lib/colors';
import type { Token } from '@/types';

interface Props {
  token: Token;
  tokenId: string;
}

export default function WordToken({ token, tokenId }: Props) {
  const colorMode = useReaderStore((s) => s.colorMode);
  const colorPalette = useReaderStore((s) => s.colorPalette);
  const activeTokenId = useReaderStore((s) => s.activeTokenId);
  const activeWordIndex = useReaderStore((s) => s.activeWordIndex);
  const setActiveTokenId = useReaderStore((s) => s.setActiveTokenId);
  const showPinyin = useReaderStore((s) => s.showPinyin);

  // Punctuation: attach to preceding word, no pinyin slot, no tap target
  if (token.pos === 'punct') {
    return (
      <span className="-ml-[0.1em] font-[var(--font-hanzi)] text-2xl sm:text-3xl">
        {token.hanzi}
      </span>
    );
  }

  const isActive = activeTokenId === tokenId;
  const isHighlighted = activeWordIndex === tokenId;
  const underlineClass = getUnderlineClass(token, colorMode, colorPalette);

  function handleClick() {
    setActiveTokenId(isActive ? null : tokenId);
  }

  return (
    <span
      role="button"
      data-token-id={tokenId}
      onClick={handleClick}
      className={`
        inline-flex cursor-pointer flex-col items-center px-[0.15em]
        rounded transition-all min-w-[44px] min-h-[44px] justify-center
        ${isHighlighted ? 'outline outline-2 outline-amber-400' : ''}
      `}
    >
      {showPinyin && (
        <span className="text-[0.6em] text-gray-400 leading-none mb-0.5">
          {token.pinyin}
        </span>
      )}
      <span
        className={`
          font-[var(--font-hanzi)] text-2xl sm:text-3xl leading-tight
          border-b-2 ${underlineClass}
        `}
      >
        {token.hanzi}
      </span>
    </span>
  );
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
npm run test -- WordToken
```

- [ ] **Step 5: Commit**

```bash
git add src/components/reader/WordToken.tsx src/components/reader/WordToken.test.tsx
git commit -m "feat: fix punctuation rendering and add per-word highlight"
```

---

### Task 7: TTS with boundary events + speed control

**Files:**
- Modify: `src/lib/tts.ts`
- Modify: `src/lib/tts.test.ts`

**Interfaces:**
- Produces: `speakWithHighlight(text, charOffsets, onWordChange, onEnd, rate)` — calls `onWordChange(tokenIndex)` on each boundary; falls back to `onWordChange(-1)` on iOS; calls `onEnd` when done
- Produces: `buildCharOffsets(tokens: Token[]): number[]` — cumulative char index per token

- [ ] **Step 1: Write failing tests**

Add to `src/lib/tts.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildCharOffsets } from './tts';
import type { Token } from '@/types';

const tokens: Token[] = [
  { hanzi: '从前', pinyin: 'cóng qián', pos: 'adv', hsk: 3, gloss_id: 'dahulu' },
  { hanzi: '，', pinyin: '', pos: 'punct', hsk: null, gloss_id: '' },
  { hanzi: '有', pinyin: 'yǒu', pos: 'verb', hsk: 1, gloss_id: 'ada' },
];

describe('buildCharOffsets', () => {
  it('returns cumulative hanzi char counts', () => {
    // 从前 = 2 chars, ， = 1 char, 有 = 1 char
    expect(buildCharOffsets(tokens)).toEqual([0, 2, 3]);
  });

  it('returns [0] for single token', () => {
    expect(buildCharOffsets([tokens[0]])).toEqual([0]);
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npm run test -- tts
```

- [ ] **Step 3: Rewrite `src/lib/tts.ts`**

```typescript
import type { Token } from '@/types';

export function isSpeechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export function speak(text: string, lang = 'zh-CN', onEnd?: () => void): void {
  if (!isSpeechSupported()) { onEnd?.(); return; }
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  if (onEnd) utterance.onend = onEnd;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

export function buildCharOffsets(tokens: Token[]): number[] {
  const offsets: number[] = [];
  let total = 0;
  for (const t of tokens) {
    offsets.push(total);
    total += t.hanzi.length;
  }
  return offsets;
}

export function speakWithHighlight(
  text: string,
  charOffsets: number[],
  onWordChange: (tokenIndex: number) => void,
  onEnd: () => void,
  rate: 0.5 | 0.75 | 1.0 = 1.0,
): void {
  if (!isSpeechSupported()) { onEnd(); return; }

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'zh-CN';
  utterance.rate = rate;

  let boundaryFired = false;
  const fallback = setTimeout(() => {
    if (!boundaryFired) onWordChange(-1); // iOS: highlight whole sentence
  }, 500);

  utterance.onboundary = (event: SpeechSynthesisEvent) => {
    if (event.name !== 'word') return;
    boundaryFired = true;
    clearTimeout(fallback);
    const charIndex = event.charIndex;
    let idx = charOffsets.length - 1;
    for (let i = 0; i < charOffsets.length; i++) {
      if (charOffsets[i] > charIndex) { idx = i - 1; break; }
    }
    onWordChange(Math.max(0, idx));
  };

  utterance.onend = () => {
    clearTimeout(fallback);
    onEnd();
  };

  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
npm run test -- tts
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/tts.ts src/lib/tts.test.ts
git commit -m "feat: add speakWithHighlight and buildCharOffsets for per-word TTS"
```

---

### Task 8: LookupPopup with Supabase vocab + Cari panel

**Files:**
- Modify: `src/components/reader/LookupPopup.tsx`
- Modify: `src/components/reader/LookupPopup.test.tsx`

**Interfaces:**
- Consumes: `addVocabEntry`, `isVocabSaved` from `src/lib/db/vocab.ts`
- Produces: popup with Cari sub-panel (expands token gloss), audio button, Tambahkan uses Supabase

- [ ] **Step 1: Write failing tests**

Add to `src/components/reader/LookupPopup.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import LookupPopup from './LookupPopup';

vi.mock('@/lib/db/vocab', () => ({
  addVocabEntry: vi.fn(),
  isVocabSaved: vi.fn().mockResolvedValue(false),
}));

const mockToken = {
  hanzi: '农夫',
  pinyin: 'nóng fū',
  pos: 'noun' as const,
  hsk: 4,
  gloss_id: 'petani; buruh tani',
};
const mockAnchor = document.createElement('button');

describe('LookupPopup Cari', () => {
  it('shows Cari button', () => {
    render(<LookupPopup token={mockToken} anchorEl={mockAnchor} sourceSentence="农夫种地" />);
    expect(screen.getByText('Cari')).toBeInTheDocument();
  });

  it('Cari button expands gloss panel', () => {
    render(<LookupPopup token={mockToken} anchorEl={mockAnchor} sourceSentence="农夫种地" />);
    fireEvent.click(screen.getByText('Cari'));
    expect(screen.getByText(/petani/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npm run test -- LookupPopup
```

- [ ] **Step 3: Update `src/components/reader/LookupPopup.tsx`**

```tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import {
  useFloating,
  autoUpdate,
  flip,
  shift,
  offset,
  useDismiss,
  useInteractions,
} from '@floating-ui/react';
import { useReaderStore } from '@/store/readerStore';
import { addVocabEntry, isVocabSaved } from '@/lib/db/vocab';
import * as tts from '@/lib/tts';
import type { Token } from '@/types';

interface Props {
  token: Token;
  anchorEl: HTMLElement;
  sourceSentence: string;
}

export default function LookupPopup({ token, anchorEl, sourceSentence }: Props) {
  const setActiveTokenId = useReaderStore((s) => s.setActiveTokenId);
  const [saved, setSaved] = useState(false);
  const [showCari, setShowCari] = useState(false);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    setSaved(false);
    setShowCari(false);
    isVocabSaved(token.hanzi).then(setSaved);
  }, [token.hanzi]);

  const { refs, floatingStyles, context } = useFloating({
    open,
    onOpenChange: (o) => { if (!o) { setOpen(false); setActiveTokenId(null); } },
    middleware: [offset(8), flip(), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
  });

  const dismiss = useDismiss(context);
  const { getFloatingProps } = useInteractions([dismiss]);

  useEffect(() => {
    refs.setReference(anchorEl);
  }, [anchorEl, refs]);

  if (!open) return null;

  async function handleSave() {
    await addVocabEntry({ hanzi: token.hanzi, pinyin: token.pinyin, gloss: token.gloss_id });
    setSaved(true);
  }

  return (
    <div
      ref={refs.setFloating}
      style={floatingStyles}
      {...getFloatingProps()}
      className="z-50 w-64 rounded-lg border bg-white shadow-lg"
    >
      <div className="p-3">
        <div className="flex items-start justify-between">
          <div>
            <span className="font-[var(--font-hanzi)] text-2xl">{token.hanzi}</span>
            <span className="ml-2 text-sm text-gray-500">{token.pinyin}</span>
          </div>
          {tts.isSpeechSupported() && (
            <button
              onClick={() => tts.speak(token.hanzi)}
              className="ml-2 text-lg"
              aria-label="Putar"
            >
              🔊
            </button>
          )}
        </div>
        <p className="mt-1 text-sm text-gray-700">{token.gloss_id}</p>
        <div className="mt-2 flex gap-2">
          <button
            onClick={handleSave}
            disabled={saved}
            className="flex-1 rounded bg-teal-600 py-1 text-xs font-medium text-white disabled:opacity-50"
          >
            {saved ? 'Sudah ditambahkan' : 'Tambahkan'}
          </button>
          <button
            onClick={() => setShowCari(!showCari)}
            className="rounded border px-2 py-1 text-xs"
          >
            Cari
          </button>
        </div>
        {showCari && (
          <div className="mt-2 rounded bg-gray-50 p-2 text-sm">
            <p className="font-medium">{token.hanzi} — {token.pinyin}</p>
            <p className="mt-1 text-gray-700">{token.gloss_id}</p>
            <p className="mt-1 text-xs text-gray-400">
              POS: {token.pos} · HSK: {token.hsk ?? '–'}
            </p>
            <p className="mt-1 text-xs text-gray-400 italic">{sourceSentence}</p>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
npm run test -- LookupPopup
```

- [ ] **Step 5: Commit**

```bash
git add src/components/reader/LookupPopup.tsx src/components/reader/LookupPopup.test.tsx
git commit -m "feat: add Cari panel and Supabase vocab to LookupPopup"
```

---

### Task 9: Jelaskan API route + ParagraphActions redesign

**Files:**
- Create: `src/app/api/jelaskan/route.ts`
- Modify: `src/components/reader/ParagraphActions.tsx`
- Modify: `src/components/reader/ParagraphActions.test.tsx`

**Interfaces:**
- Produces: `POST /api/jelaskan` body `{ hanzi: string }` → `{ explanation: string }`
- Produces: `<ParagraphActions>` with per-paragraph Terjemahkan toggle + per-sentence Jelaskan

- [ ] **Step 1: Create Jelaskan API route**

Create `src/app/api/jelaskan/route.ts`:

```typescript
import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/lib/supabase/server';

const RequestSchema = z.object({ hanzi: z.string().min(1).max(500) });

export async function POST(request: Request) {
  // Auth check
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const prompt = `Jelaskan kalimat Mandarin berikut dalam Bahasa Indonesia untuk pelajar pemula:
"${parsed.data.hanzi}"
Fokus pada: struktur kalimat, pola tata bahasa, kata-kata penting, dan ungkapan idiomatis.
Buat penjelasan singkat (3-5 kalimat).`;

  const result = await model.generateContent(prompt);
  const explanation = result.response.text();

  return NextResponse.json({ explanation });
}
```

- [ ] **Step 2: Write failing tests for ParagraphActions**

Replace content of `src/components/reader/ParagraphActions.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ParagraphActions from './ParagraphActions';
import type { Sentence } from '@/types';

global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  json: async () => ({ explanation: 'Ini adalah penjelasan tata bahasa.' }),
});

const sentences: Sentence[] = [
  {
    id: 'p1s1',
    tokens: [
      { hanzi: '从前', pinyin: 'cóng qián', pos: 'adv', hsk: 3, gloss_id: 'dahulu' },
    ],
  },
];

describe('ParagraphActions', () => {
  it('shows Terjemahkan button by default', () => {
    render(
      <ParagraphActions
        translation="Dahulu kala"
        sentences={sentences}
      />,
    );
    expect(screen.getByText('Terjemahkan')).toBeInTheDocument();
  });

  it('toggles translation on click', () => {
    render(<ParagraphActions translation="Dahulu kala" sentences={sentences} />);
    fireEvent.click(screen.getByText('Terjemahkan'));
    expect(screen.getByText('Dahulu kala')).toBeInTheDocument();
  });

  it('shows Jelaskan button per sentence', () => {
    render(<ParagraphActions translation="Dahulu kala" sentences={sentences} />);
    expect(screen.getAllByText('Jelaskan').length).toBeGreaterThan(0);
  });

  it('calls /api/jelaskan on Jelaskan click and shows explanation', async () => {
    render(<ParagraphActions translation="Dahulu kala" sentences={sentences} />);
    fireEvent.click(screen.getAllByText('Jelaskan')[0]);
    await waitFor(() => {
      expect(screen.getByText('Ini adalah penjelasan tata bahasa.')).toBeInTheDocument();
    });
  });
});
```

- [ ] **Step 3: Run test — expect FAIL**

```bash
npm run test -- ParagraphActions
```

- [ ] **Step 4: Rewrite `src/components/reader/ParagraphActions.tsx`**

```tsx
'use client';

import { useState } from 'react';
import type { Sentence } from '@/types';

interface Props {
  translation: string;
  sentences: Sentence[];
}

export default function ParagraphActions({ translation, sentences }: Props) {
  const [showTranslation, setShowTranslation] = useState(false);
  const [jelaskanMap, setJelaskanMap] = useState<Record<string, string | 'loading'>>({});

  async function handleJelaskan(sentence: Sentence) {
    const sentenceText = sentence.tokens.map((t) => t.hanzi).join('');
    if (jelaskanMap[sentence.id]) {
      setJelaskanMap((m) => { const n = { ...m }; delete n[sentence.id]; return n; });
      return;
    }
    setJelaskanMap((m) => ({ ...m, [sentence.id]: 'loading' }));
    const res = await fetch('/api/jelaskan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hanzi: sentenceText }),
    });
    const { explanation } = await res.json();
    setJelaskanMap((m) => ({ ...m, [sentence.id]: explanation }));
  }

  return (
    <div className="mt-2 space-y-1">
      {sentences.map((sentence) => (
        <div key={sentence.id} className="flex flex-col gap-1">
          <div className="flex justify-end">
            <button
              onClick={() => handleJelaskan(sentence)}
              className="text-xs text-blue-500 underline"
            >
              Jelaskan
            </button>
          </div>
          {jelaskanMap[sentence.id] && (
            <div className="rounded bg-blue-50 p-2 text-sm text-blue-900">
              {jelaskanMap[sentence.id] === 'loading'
                ? 'Memuat…'
                : jelaskanMap[sentence.id]}
            </div>
          )}
        </div>
      ))}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowTranslation(!showTranslation)}
          className="text-xs text-teal-600 underline"
        >
          {showTranslation ? 'Sembunyikan terjemahan' : 'Terjemahkan'}
        </button>
      </div>
      {showTranslation && (
        <p className="mt-1 text-sm text-gray-600 italic">{translation}</p>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Run test — expect PASS**

```bash
npm run test -- ParagraphActions
```

- [ ] **Step 6: Commit**

```bash
git add src/app/api/jelaskan/ src/components/reader/ParagraphActions.tsx src/components/reader/ParagraphActions.test.tsx
git commit -m "feat: add Jelaskan API route and redesign ParagraphActions"
```

---

### Task 10: Reader layout + ProgressBar + resume position

**Files:**
- Create: `src/components/reader/ProgressBar.tsx`
- Modify: `src/components/reader/Reader.tsx`

**Interfaces:**
- Consumes: `Chapter` from `src/types.ts` (DB version with `content_json`)
- Consumes: `upsertProgressClient` from `src/lib/db/progress.ts`
- Produces: `<Reader chapter={chapter} chapterId={string} initialScrollPosition={number} />` — renders centered 720px column with progress save/resume

- [ ] **Step 1: Create `src/components/reader/ProgressBar.tsx`**

```tsx
'use client';

import { useEffect, useState } from 'react';

export default function ProgressBar() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    function update() {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(scrollable > 0 ? (window.scrollY / scrollable) * 100 : 0);
    }
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, []);

  return (
    <div className="fixed left-0 top-0 z-50 h-1 w-full bg-gray-100">
      <div
        className="h-full bg-teal-500 transition-[width] duration-100"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
```

- [ ] **Step 2: Rewrite `src/components/reader/Reader.tsx`**

```tsx
'use client';

import { useEffect, useState, useRef } from 'react';
import type { Chapter } from '@/types';
import { useReaderStore } from '@/store/readerStore';
import { findSentenceText, findToken } from '@/lib/tokenId';
import { upsertProgressClient } from '@/lib/db/progress';
import WordToken from './WordToken';
import LookupPopup from './LookupPopup';
import ParagraphActions from './ParagraphActions';
import ProgressBar from './ProgressBar';

interface Props {
  chapter: Chapter;
  chapterId: string;
  initialScrollPosition?: number;
}

export default function Reader({ chapter, chapterId, initialScrollPosition = 0 }: Props) {
  const showChinese = useReaderStore((s) => s.showChinese);
  const activeTokenId = useReaderStore((s) => s.activeTokenId);
  const setActiveTokenId = useReaderStore((s) => s.setActiveTokenId);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const paragraphs = chapter.content_json.paragraphs;

  // Restore scroll position on mount
  useEffect(() => {
    if (initialScrollPosition > 0) {
      setTimeout(() => window.scrollTo({ top: initialScrollPosition, behavior: 'instant' }), 100);
    }
  }, [initialScrollPosition]);

  // Save scroll position (debounced 2s)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    function onScroll() {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        upsertProgressClient(chapterId, { scroll_position: Math.round(window.scrollY) });
      }, 2000);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [chapterId]);

  // Mark completed when near bottom
  useEffect(() => {
    function checkCompletion() {
      const remaining = document.documentElement.scrollHeight - window.innerHeight - window.scrollY;
      if (remaining < 200) {
        upsertProgressClient(chapterId, { completed: true });
      }
    }
    window.addEventListener('scroll', checkCompletion, { passive: true });
    return () => window.removeEventListener('scroll', checkCompletion);
  }, [chapterId]);

  // Popup anchor lookup
  useEffect(() => {
    if (!activeTokenId) { setAnchorEl(null); return; }
    if (!showChinese) { setActiveTokenId(null); setAnchorEl(null); return; }
    setAnchorEl(document.querySelector<HTMLElement>(`[data-token-id="${activeTokenId}"]`));
  }, [activeTokenId, showChinese, setActiveTokenId]);

  const activeToken = activeTokenId ? findToken({ paragraphs } as never, activeTokenId) : undefined;
  const activeSentenceText = activeTokenId ? findSentenceText({ paragraphs } as never, activeTokenId) : undefined;

  return (
    <>
      <ProgressBar />
      <main className="mx-auto max-w-[720px] px-6 pb-24 pt-6">
        <div className="space-y-8">
          {paragraphs.map((paragraph) => (
            <div key={paragraph.id}>
              {showChinese && (
                <div className="flex flex-wrap items-end gap-y-2 leading-loose">
                  {paragraph.sentences.map((sentence) =>
                    sentence.tokens.map((token, index) => (
                      <WordToken
                        key={`${sentence.id}-${index}`}
                        token={token}
                        tokenId={`${sentence.id}-${index}`}
                      />
                    )),
                  )}
                </div>
              )}
              <ParagraphActions
                translation={paragraph.translation_id}
                sentences={paragraph.sentences}
              />
            </div>
          ))}
        </div>
      </main>
      {activeToken && anchorEl && (
        <LookupPopup
          token={activeToken}
          anchorEl={anchorEl}
          sourceSentence={activeSentenceText ?? ''}
        />
      )}
    </>
  );
}
```

- [ ] **Step 3: Run all tests**

```bash
npm run test
```

Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git add src/components/reader/ProgressBar.tsx src/components/reader/Reader.tsx
git commit -m "feat: update Reader layout with Supabase data, progress save/resume"
```

---

### Task 11: Toolbar updates (speed control, legend toggle, read-aloud highlight)

**Files:**
- Modify: `src/components/reader/Toolbar.tsx`
- Modify: `src/components/reader/Toolbar.test.tsx`

**Interfaces:**
- Consumes: `speakWithHighlight`, `buildCharOffsets` from `src/lib/tts`
- Consumes: `useReaderStore` — `playbackRate`, `setPlaybackRate`, `setActiveWordIndex`
- Produces: updated toolbar with speed buttons (0.5×/0.75×/1×) and legend toggle; read-aloud uses `speakWithHighlight`

- [ ] **Step 1: Write failing tests**

Add to `src/components/reader/Toolbar.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Toolbar from './Toolbar';
import { useReaderStore } from '@/store/readerStore';

vi.mock('@/lib/tts', () => ({
  isSpeechSupported: () => true,
  speakWithHighlight: vi.fn(),
  buildCharOffsets: vi.fn(() => [0]),
  speak: vi.fn(),
}));

const mockChapter = {
  id: 'c1',
  book_id: 'b1',
  order_index: 1,
  title: 'Test',
  content_json: {
    paragraphs: [{
      id: 'p1',
      translation_id: 'Terjemahan',
      sentences: [{ id: 'p1s1', tokens: [{ hanzi: '你好', pinyin: 'nǐ hǎo', pos: 'verb' as const, hsk: 1, gloss_id: 'halo' }] }],
    }],
  },
  word_count: 1,
  created_at: '',
};

describe('Toolbar speed control', () => {
  it('renders speed buttons', () => {
    render(<Toolbar chapter={mockChapter} />);
    expect(screen.getByText('0.5×')).toBeInTheDocument();
    expect(screen.getByText('0.75×')).toBeInTheDocument();
    expect(screen.getByText('1×')).toBeInTheDocument();
  });

  it('clicking speed button updates store', () => {
    render(<Toolbar chapter={mockChapter} />);
    fireEvent.click(screen.getByText('0.5×'));
    expect(useReaderStore.getState().playbackRate).toBe(0.5);
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npm run test -- Toolbar
```

- [ ] **Step 3: Rewrite `src/components/reader/Toolbar.tsx`**

```tsx
'use client';

import { useRef } from 'react';
import { useReaderStore } from '@/store/readerStore';
import * as tts from '@/lib/tts';
import type { Chapter } from '@/types';

interface Props {
  chapter: Chapter;
}

export default function Toolbar({ chapter }: Props) {
  const showChinese = useReaderStore((s) => s.showChinese);
  const showPinyin = useReaderStore((s) => s.showPinyin);
  const colorMode = useReaderStore((s) => s.colorMode);
  const playbackRate = useReaderStore((s) => s.playbackRate);
  const toggleChinese = useReaderStore((s) => s.toggleChinese);
  const togglePinyin = useReaderStore((s) => s.togglePinyin);
  const setColorMode = useReaderStore((s) => s.setColorMode);
  const setPlaybackRate = useReaderStore((s) => s.setPlaybackRate);
  const setActiveWordIndex = useReaderStore((s) => s.setActiveWordIndex);

  const playbackIdRef = useRef(0);

  function readChapterAloud() {
    const playbackId = ++playbackIdRef.current;
    const sentences = chapter.content_json.paragraphs.flatMap((p) => p.sentences);

    function playAt(index: number) {
      if (playbackId !== playbackIdRef.current || index >= sentences.length) {
        setActiveWordIndex(null);
        return;
      }
      const sentence = sentences[index];
      const tokens = sentence.tokens;
      const text = tokens.map((t) => t.hanzi).join('');
      const charOffsets = tts.buildCharOffsets(tokens);

      tts.speakWithHighlight(
        text,
        charOffsets,
        (tokenIdx) => {
          if (tokenIdx === -1) {
            // iOS fallback: no per-word highlight
            setActiveWordIndex(null);
          } else {
            setActiveWordIndex(`${sentence.id}-${tokenIdx}`);
          }
        },
        () => playAt(index + 1),
        playbackRate,
      );
    }

    playAt(0);
  }

  const rates: Array<0.5 | 0.75 | 1.0> = [0.5, 0.75, 1.0];

  return (
    <nav className="sticky top-1 z-40 border-b bg-white px-4 py-2">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <button
          onClick={toggleChinese}
          className={`rounded px-2 py-1 ${showChinese ? 'bg-gray-800 text-white' : 'bg-gray-100'}`}
        >
          汉字
        </button>
        <button
          onClick={togglePinyin}
          className={`rounded px-2 py-1 ${showPinyin ? 'bg-gray-800 text-white' : 'bg-gray-100'}`}
        >
          Pinyin
        </button>
        <select
          value={colorMode}
          onChange={(e) => setColorMode(e.target.value as 'pos' | 'hsk')}
          className="rounded border px-2 py-1 text-sm"
        >
          <option value="pos">Warna: Jenis kata</option>
          <option value="hsk">Warna: HSK</option>
        </select>
        {tts.isSpeechSupported() && (
          <>
            <button onClick={readChapterAloud} className="rounded bg-teal-600 px-2 py-1 text-white">
              ▶ Baca
            </button>
            <div className="flex gap-1">
              {rates.map((r) => (
                <button
                  key={r}
                  onClick={() => setPlaybackRate(r)}
                  className={`rounded px-1.5 py-0.5 text-xs ${
                    playbackRate === r ? 'bg-gray-800 text-white' : 'bg-gray-100'
                  }`}
                >
                  {r}×
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </nav>
  );
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
npm run test -- Toolbar
```

- [ ] **Step 5: Commit**

```bash
git add src/components/reader/Toolbar.tsx src/components/reader/Toolbar.test.tsx
git commit -m "feat: add speed control and per-word highlight to Toolbar"
```

---

### Task 12: Library UI components

**Files:**
- Create: `src/components/library/ProgressRing.tsx`
- Create: `src/components/library/BookCard.tsx`
- Create: `src/components/library/BookGrid.tsx`
- Create: `src/components/library/ChapterList.tsx`

**Interfaces:**
- Produces: `<ProgressRing percent={number} />`, `<BookCard book={Book} progressPercent={number} continueHref={string|null} />`, `<BookGrid books={...} />`, `<ChapterList chapters={...} progress={...} />`

- [ ] **Step 1: Create `src/components/library/ProgressRing.tsx`**

```tsx
interface Props {
  percent: number;
  size?: number;
}

export default function ProgressRing({ percent, size = 40 }: Props) {
  const r = (size - 4) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#E5E7EB" strokeWidth="3" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="#0D9488"
        strokeWidth="3"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
      />
    </svg>
  );
}
```

- [ ] **Step 2: Create `src/components/library/BookCard.tsx`**

```tsx
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
```

- [ ] **Step 3: Create `src/components/library/BookGrid.tsx`**

```tsx
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
```

- [ ] **Step 4: Create `src/components/library/ChapterList.tsx`**

```tsx
import Link from 'next/link';
import type { Chapter, UserProgress } from '@/types';

interface Props {
  bookId: string;
  chapters: Chapter[];
  progress: UserProgress[];
}

export default function ChapterList({ bookId, chapters, progress }: Props) {
  function getChapterProgress(chapterId: string): UserProgress | undefined {
    return progress.find((p) => p.chapter_id === chapterId);
  }

  return (
    <ol className="space-y-2">
      {chapters.map((chapter, i) => {
        const p = getChapterProgress(chapter.id);
        const scrollPct = p
          ? Math.min(100, Math.round((p.scroll_position / Math.max(document.documentElement.scrollHeight - window.innerHeight, 1)) * 100))
          : 0;

        return (
          <li key={chapter.id}>
            <Link
              href={`/books/${bookId}/chapters/${chapter.id}`}
              className="flex items-center justify-between rounded-lg border bg-white px-4 py-3 hover:bg-gray-50"
            >
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-400">{i + 1}</span>
                <span className="font-medium">{chapter.title ?? `Bab ${i + 1}`}</span>
              </div>
              <div className="flex items-center gap-2">
                {p?.completed && <span className="text-teal-600">✓</span>}
                {!p?.completed && p && (
                  <div className="h-1.5 w-16 rounded-full bg-gray-200">
                    <div
                      className="h-full rounded-full bg-teal-500"
                      style={{ width: `${scrollPct}%` }}
                    />
                  </div>
                )}
              </div>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
```

- [ ] **Step 5: Run tests**

```bash
npm run test
```

Expected: all pass (no new tests; existing tests unaffected).

- [ ] **Step 6: Commit**

```bash
git add src/components/library/
git commit -m "feat: add library UI components (BookCard, BookGrid, ChapterList, ProgressRing)"
```

---

### Task 13: Library pages + chapter reader page

**Files:**
- Modify: `src/app/page.tsx`
- Create: `src/app/books/[bookId]/page.tsx`
- Create: `src/app/books/[bookId]/chapters/[chapterId]/page.tsx`

**Interfaces:**
- Consumes: all DB query helpers, library components, Reader, Toolbar, ColorLegend

- [ ] **Step 1: Build the library home page**

Replace `src/app/page.tsx`:

```tsx
import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import { getBooks } from '@/lib/db/books';
import { getChaptersByBook } from '@/lib/db/chapters';
import BookGrid from '@/components/library/BookGrid';

export default async function LibraryPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const books = await getBooks();

  const items = await Promise.all(
    books.map(async (book) => {
      const chapters = await getChaptersByBook(book.id);
      const { data: progress } = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', user.id)
        .in('chapter_id', chapters.map((c) => c.id));
      return { book, chapters, progress: progress ?? [] };
    }),
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">Perpustakaan</h1>
      {items.length === 0 ? (
        <p className="text-gray-500">Belum ada buku. Minta admin untuk menambahkan buku.</p>
      ) : (
        <BookGrid items={items} />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Build the book detail page**

Create `src/app/books/[bookId]/page.tsx`:

```tsx
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { createServerClient } from '@/lib/supabase/server';
import { getBook } from '@/lib/db/books';
import { getChaptersByBook } from '@/lib/db/chapters';
import ChapterList from '@/components/library/ChapterList';

interface Props {
  params: Promise<{ bookId: string }>;
}

export default async function BookPage({ params }: Props) {
  const { bookId } = await params;
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const [book, chapters] = await Promise.all([
    getBook(bookId),
    getChaptersByBook(bookId),
  ]);

  if (!book) notFound();

  const { data: progress } = await supabase
    .from('user_progress')
    .select('*')
    .eq('user_id', user.id)
    .in('chapter_id', chapters.map((c) => c.id));

  const firstIncomplete = chapters.find(
    (c) => !(progress ?? []).find((p) => p.chapter_id === c.id && p.completed),
  );

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link href="/" className="text-sm text-gray-500 hover:underline">← Perpustakaan</Link>
      <div className="mt-4 flex items-center gap-3">
        <span className="text-5xl">{book.cover_emoji}</span>
        <div>
          <h1 className="text-2xl font-bold">{book.title}</h1>
          {book.author && <p className="text-gray-500">{book.author}</p>}
          <p className="text-xs text-gray-400">{book.license}</p>
        </div>
      </div>
      {firstIncomplete && (
        <Link
          href={`/books/${bookId}/chapters/${firstIncomplete.id}`}
          className="mt-4 inline-block rounded bg-teal-600 px-4 py-2 text-sm font-medium text-white"
        >
          Lanjutkan membaca
        </Link>
      )}
      <div className="mt-6">
        <h2 className="mb-3 font-semibold">Daftar bab</h2>
        <ChapterList bookId={bookId} chapters={chapters} progress={progress ?? []} />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Build the chapter reader page**

Create `src/app/books/[bookId]/chapters/[chapterId]/page.tsx`:

```tsx
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { createServerClient } from '@/lib/supabase/server';
import { getBook } from '@/lib/db/books';
import { getChapter, getAdjacentChapters } from '@/lib/db/chapters';
import { getProgress } from '@/lib/db/progress';
import Toolbar from '@/components/reader/Toolbar';
import Reader from '@/components/reader/Reader';
import ColorLegend from '@/components/reader/ColorLegend';

interface Props {
  params: Promise<{ bookId: string; chapterId: string }>;
}

export default async function ChapterPage({ params }: Props) {
  const { bookId, chapterId } = await params;
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const [book, chapter, adjacent] = await Promise.all([
    getBook(bookId),
    getChapter(chapterId),
    getAdjacentChapters(chapterId, bookId),
  ]);

  if (!book || !chapter) notFound();

  const progress = await getProgress(user.id, chapterId);

  return (
    <div className="min-h-screen bg-gray-50">
      <Toolbar chapter={chapter} />
      <ColorLegend />
      <div className="mx-auto max-w-[720px] px-4 pt-2 pb-2">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Link href="/" className="hover:underline">Perpustakaan</Link>
          <span>›</span>
          <Link href={`/books/${bookId}`} className="hover:underline">{book.title}</Link>
          <span>›</span>
          <span>{chapter.title ?? `Bab ${chapter.order_index}`}</span>
        </div>
      </div>
      <Reader
        chapter={chapter}
        chapterId={chapterId}
        initialScrollPosition={progress?.scroll_position ?? 0}
      />
      <footer className="mx-auto max-w-[720px] border-t px-4 py-6 flex justify-between text-sm">
        {adjacent.prev ? (
          <Link href={`/books/${bookId}/chapters/${adjacent.prev.id}`} className="text-teal-600 hover:underline">
            ← {adjacent.prev.title ?? 'Bab sebelumnya'}
          </Link>
        ) : <span />}
        {adjacent.next ? (
          <Link href={`/books/${bookId}/chapters/${adjacent.next.id}`} className="text-teal-600 hover:underline">
            {adjacent.next.title ?? 'Bab berikutnya'} →
          </Link>
        ) : <span />}
      </footer>
    </div>
  );
}
```

- [ ] **Step 4: Run all tests + build**

```bash
npm run test
npm run build
```

Expected: tests pass; build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/app/
git commit -m "feat: add library home, book detail, and chapter reader pages"
```

---

### Task 14: NLP pipeline (Gemini annotate)

**Files:**
- Create: `src/lib/nlp/gemini-annotate.ts`

**Interfaces:**
- Produces: `annotateChapter(rawText: string, apiKey: string): Promise<ChapterContent>` where `ChapterContent = { paragraphs: Paragraph[] }`

- [ ] **Step 1: Write failing tests**

Create `src/lib/nlp/gemini-annotate.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { ChapterContentSchema } from './gemini-annotate';

describe('ChapterContentSchema', () => {
  it('accepts valid chapter content', () => {
    const valid = {
      paragraphs: [{
        id: 'p1',
        translation_id: 'Dahulu kala',
        sentences: [{
          id: 'p1s1',
          tokens: [{
            hanzi: '从前',
            pinyin: 'cóng qián',
            pos: 'adv',
            hsk: 3,
            gloss_id: 'dahulu',
          }],
        }],
      }],
    };
    expect(() => ChapterContentSchema.parse(valid)).not.toThrow();
  });

  it('rejects invalid pos value', () => {
    const invalid = {
      paragraphs: [{
        id: 'p1',
        translation_id: '',
        sentences: [{
          id: 'p1s1',
          tokens: [{ hanzi: '从', pinyin: 'cóng', pos: 'unknown', hsk: null, gloss_id: '' }],
        }],
      }],
    };
    expect(() => ChapterContentSchema.parse(invalid)).toThrow();
  });

  it('accepts null HSK', () => {
    const valid = {
      paragraphs: [{
        id: 'p1',
        translation_id: '',
        sentences: [{
          id: 'p1s1',
          tokens: [{ hanzi: '树桩', pinyin: 'shù zhuāng', pos: 'noun', hsk: null, gloss_id: 'tunggul' }],
        }],
      }],
    };
    expect(() => ChapterContentSchema.parse(valid)).not.toThrow();
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npm run test -- gemini-annotate
```

- [ ] **Step 3: Create `src/lib/nlp/gemini-annotate.ts`**

```typescript
import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';

const TokenSchema = z.object({
  hanzi:    z.string(),
  pinyin:   z.string(),
  pos:      z.enum(['noun','verb','adj','adv','pron','propn','particle','numeral','function','punct']),
  hsk:      z.union([z.number().int().min(1).max(6), z.null()]),
  gloss_id: z.string(),
});

const SentenceSchema = z.object({
  id:     z.string(),
  tokens: z.array(TokenSchema),
});

const ParagraphSchema = z.object({
  id:             z.string(),
  translation_id: z.string(),
  sentences:      z.array(SentenceSchema),
});

export const ChapterContentSchema = z.object({
  paragraphs: z.array(ParagraphSchema),
});

export type ChapterContent = z.infer<typeof ChapterContentSchema>;

const SYSTEM_PROMPT = `You are a Chinese linguistics expert annotating text for Indonesian learners.
Given raw Chinese text, produce JSON with this exact structure:
{
  "paragraphs": [
    {
      "id": "p1",
      "translation_id": "<full Indonesian translation of this paragraph>",
      "sentences": [
        {
          "id": "p1s1",
          "tokens": [
            {
              "hanzi": "<word>",
              "pinyin": "<tone-marked pinyin, space-separated syllables>",
              "pos": "<one of: noun|verb|adj|adv|pron|propn|particle|numeral|function|punct>",
              "hsk": <1-6 or null>,
              "gloss_id": "<short Indonesian gloss for this word in context>"
            }
          ]
        }
      ]
    }
  ]
}

Rules:
- Split text into paragraphs on blank lines. Sentences end with 。！？.
- Every character must appear in exactly one token.
- Punctuation (，。！？；：) gets its own token with pos:"punct", pinyin:"", gloss_id:"".
- For polyphonic characters, choose the correct reading from context (e.g. 得→"de" as complement particle, 了→"le" as aspect marker).
- hsk: null if not in HSK 1–6.
- translation_id: natural Indonesian paragraph translation (not word-for-word).
- gloss_id: short Indonesian gloss (1–5 words) for this token in context.
- Paragraph IDs: p1, p2, …; sentence IDs: p1s1, p1s2, …`;

export async function annotateChapter(
  rawText: string,
  apiKey: string,
): Promise<ChapterContent> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    generationConfig: { responseMimeType: 'application/json' },
  });

  const result = await model.generateContent([
    { text: SYSTEM_PROMPT },
    { text: `Annotate this text:\n\n${rawText}` },
  ]);

  const raw = result.response.text();
  const parsed = JSON.parse(raw);
  return ChapterContentSchema.parse(parsed);
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
npm run test -- gemini-annotate
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/nlp/
git commit -m "feat: add Gemini NLP pipeline for chapter annotation"
```

---

### Task 15: Admin API routes + Admin UI + seed verification

**Files:**
- Create: `src/app/api/admin/import/route.ts`
- Create: `src/app/api/admin/jobs/[id]/route.ts`
- Create: `src/components/admin/AdminForm.tsx`
- Create: `src/app/admin/page.tsx`

**Interfaces:**
- Consumes: `annotateChapter` from `src/lib/nlp/gemini-annotate.ts`
- Produces: `POST /api/admin/import` → `{ jobId: string }`, `GET /api/admin/jobs/[id]` → `ImportJob`
- Produces: admin form UI with book/chapter fields + status polling

- [ ] **Step 1: Create import API route**

Create `src/app/api/admin/import/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@/lib/supabase/server';
import { annotateChapter } from '@/lib/nlp/gemini-annotate';

const RequestSchema = z.object({
  bookTitle:    z.string().min(1),
  bookAuthor:   z.string().optional(),
  coverEmoji:   z.string().default('📖'),
  license:      z.string().default('Public Domain'),
  sourceUrl:    z.string().url().optional().or(z.literal('')),
  chapterTitle: z.string().optional(),
  chapterOrder: z.number().int().min(1),
  rawText:      z.string().min(10),
  existingBookId: z.string().uuid().optional(),
});

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

export async function POST(request: Request) {
  // Auth + admin check
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const adminEmails = (process.env.ADMIN_EMAILS ?? '').split(',').map((e) => e.trim());
  if (!user || !adminEmails.includes(user.email ?? '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  const admin = adminClient();
  const data = parsed.data;

  // Create import job
  const { data: job, error: jobErr } = await admin
    .from('import_jobs')
    .insert({ status: 'processing', log: null })
    .select()
    .single();
  if (jobErr) return NextResponse.json({ error: jobErr.message }, { status: 500 });

  // Upsert book
  let bookId = data.existingBookId;
  if (!bookId) {
    const { data: book, error: bookErr } = await admin
      .from('books')
      .upsert(
        {
          title: data.bookTitle,
          author: data.bookAuthor ?? null,
          cover_emoji: data.coverEmoji,
          license: data.license,
          source_url: data.sourceUrl || null,
        },
        { onConflict: 'title' },
      )
      .select()
      .single();
    if (bookErr) {
      await admin.from('import_jobs').update({ status: 'error', log: bookErr.message, book_id: null }).eq('id', job.id);
      return NextResponse.json({ error: bookErr.message }, { status: 500 });
    }
    bookId = book.id;
  }

  // Run NLP
  let content;
  try {
    content = await annotateChapter(data.rawText, process.env.GEMINI_API_KEY!);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await admin.from('import_jobs').update({ status: 'error', log: msg, book_id: bookId }).eq('id', job.id);
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  // Count non-punct tokens
  const wordCount = content.paragraphs
    .flatMap((p) => p.sentences)
    .flatMap((s) => s.tokens)
    .filter((t) => t.pos !== 'punct').length;

  // Insert chapter
  const { error: chapterErr } = await admin.from('chapters').insert({
    book_id: bookId,
    order_index: data.chapterOrder,
    title: data.chapterTitle ?? null,
    content_json: content,
    word_count: wordCount,
  });

  if (chapterErr) {
    await admin.from('import_jobs').update({ status: 'error', log: chapterErr.message, book_id: bookId }).eq('id', job.id);
    return NextResponse.json({ error: chapterErr.message }, { status: 500 });
  }

  await admin.from('import_jobs').update({ status: 'done', book_id: bookId }).eq('id', job.id);
  return NextResponse.json({ jobId: job.id });
}
```

- [ ] **Step 2: Create job status route**

Create `src/app/api/admin/jobs/[id]/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const adminEmails = (process.env.ADMIN_EMAILS ?? '').split(',').map((e) => e.trim());
  if (!user || !adminEmails.includes(user.email ?? '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const { data, error } = await admin
    .from('import_jobs')
    .select('*')
    .eq('id', id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json(data);
}
```

- [ ] **Step 3: Create `src/components/admin/AdminForm.tsx`**

```tsx
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

    const data = await res.json();
    if (!res.ok) { setError(data.error); setSubmitting(false); return; }
    setJobId(data.jobId);
    setSubmitting(false);
  }

  // Poll job status
  useEffect(() => {
    if (!jobId) return;
    const interval = setInterval(async () => {
      const res = await fetch(`/api/admin/jobs/${jobId}`);
      const data: ImportJob = await res.json();
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
```

- [ ] **Step 4: Create admin page**

Create `src/app/admin/page.tsx`:

```tsx
import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import AdminForm from '@/components/admin/AdminForm';

export default async function AdminPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const adminEmails = (process.env.ADMIN_EMAILS ?? '').split(',').map((e) => e.trim());

  if (!user || !adminEmails.includes(user.email ?? '')) {
    redirect('/');
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">Admin — Import Bab</h1>
      <AdminForm />
    </div>
  );
}
```

- [ ] **Step 5: Run all tests + build**

```bash
npm run test
npm run build
```

Expected: all tests pass; build succeeds without TypeScript errors.

- [ ] **Step 6: Verify seed works end-to-end**

```bash
npm run seed
npm run dev
```

Navigate to `http://localhost:3000`, log in, confirm the seeded book appears in the library.

- [ ] **Step 7: Commit**

```bash
git add src/app/api/admin/ src/components/admin/ src/app/admin/
git commit -m "feat: add admin import API routes and AdminForm UI"
```

---

## Self-Review

### Spec coverage check

| Spec section | Covered by task |
|---|---|
| Next.js migration | Task 1 |
| Supabase schema + RLS | Task 2 |
| Auth (email + Google OAuth) | Task 4 |
| DB query helpers | Task 3 |
| Middleware (auth + admin) | Task 3 |
| Type extensions | Task 3 |
| Zustand store additions | Task 5 |
| Colorblind palette + legend | Task 5 |
| Punctuation fix | Task 6 |
| Per-word highlight | Task 6 |
| TTS boundary events + speed | Task 7 |
| LookupPopup Cari + Supabase vocab | Task 8 |
| Jelaskan API + ParagraphActions | Task 9 |
| Reader layout + progress | Task 10 |
| ProgressBar component | Task 10 |
| Toolbar speed control | Task 11 |
| Library home | Task 13 |
| Book detail + chapter ToC | Task 13 |
| Chapter reader page | Task 13 |
| Prev/next navigation | Task 13 |
| NLP pipeline (Gemini) | Task 14 |
| Admin import API | Task 15 |
| Admin UI | Task 15 |
| Seed script | Task 4 |
| vocab localStorage migration | Task 8 (addVocabEntry replaces localStorage) |

All spec requirements have a corresponding task. ✓

### Type consistency check

- `Chapter.content_json` typed as `{ paragraphs: Paragraph[] }` — matches usage in `Reader.tsx` ✓
- `getUnderlineClass(token, mode, palette)` — 3-arg signature used consistently in `WordToken` ✓
- `speakWithHighlight` signature matches usage in `Toolbar` ✓
- `buildCharOffsets(tokens: Token[])` matches import in `Toolbar` ✓
- `upsertProgressClient(chapterId, update)` matches call in `Reader` ✓
- `ChapterContent` exported from `gemini-annotate.ts` matches what import route expects ✓
