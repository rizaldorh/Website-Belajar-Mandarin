# Spec: Belajar Mandarin — Foundation & Reader (Spec 1 of 2)

**Date:** 2026-07-27
**Scope:** Migrate Vite → Next.js, add Supabase (Auth + Postgres), overhaul the reader UI, add multi-chapter library navigation, and include a paste-in admin form with a Gemini-powered NLP pipeline. Spec 2 covers automated ingestion from Wikisource/Gutenberg/ctext.

---

## 1. Architecture & Stack

### What stays
All existing React components (`Reader`, `Toolbar`, `WordToken`, `LookupPopup`, `ParagraphActions`), Zustand store, `@floating-ui/react`, `pinyin-pro`, `tts.ts`, Tailwind config, and the full test suite (migrated to work under Next.js).

### What changes
Vite is replaced by **Next.js 15 (App Router)**. API routes live inside Next.js — no separate backend process.

### Services
| Concern | Service |
|---|---|
| Database + Auth | Supabase (Postgres + Auth) |
| Deployment | Vercel |
| NLP — import | Gemini API (`gemini-1.5-flash`, structured output) |
| NLP — Jelaskan | Gemini API (at request time, streamed) |
| TTS | Web Speech API (existing) |
| Fonts | `next/font` → Noto Serif SC (hanzi), system-ui (UI chrome) |

### Routes
```
/                                          Library home (book grid)
/books/[bookId]                            Book detail + chapter ToC
/books/[bookId]/chapters/[chapterId]       Chapter reader
/admin                                     Admin paste-in form + job log
/auth/login                                Supabase Auth UI (email + Google OAuth)
/auth/callback                             OAuth redirect handler
```

`middleware.ts` protects `/books/*` and `/admin/*` — unauthenticated users redirect to `/auth/login`. Admin access additionally checks `session.user.email` against the `ADMIN_EMAILS` env var (comma-separated). No roles table.

---

## 2. Database Schema

All tables live in Supabase Postgres. Row-Level Security (RLS) is enabled on user-owned tables.

```sql
-- Content (readable by all authenticated users; writable by admin only)
books (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text NOT NULL,
  author      text,
  cover_emoji text DEFAULT '📖',
  license     text DEFAULT 'Public Domain',
  source_url  text,
  created_at  timestamptz DEFAULT now()
)

chapters (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id      uuid REFERENCES books ON DELETE CASCADE,
  order_index  int NOT NULL,
  title        text,
  content_json jsonb NOT NULL,  -- { paragraphs: Paragraph[] } — matches existing TypeScript types
  word_count   int,
  created_at   timestamptz DEFAULT now(),
  UNIQUE (book_id, order_index)
)

-- Per-user state (RLS: users own their rows only)
user_progress (
  user_id         uuid REFERENCES auth.users ON DELETE CASCADE,
  chapter_id      uuid REFERENCES chapters ON DELETE CASCADE,
  scroll_position int DEFAULT 0,       -- pixels from top of chapter page
  completed       boolean DEFAULT false,
  updated_at      timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, chapter_id)
)

vocab_entries (
  id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id  uuid REFERENCES auth.users ON DELETE CASCADE,
  hanzi    text NOT NULL,
  pinyin   text,
  gloss    text,
  added_at timestamptz DEFAULT now(),
  UNIQUE (user_id, hanzi)
)

-- Admin only
import_jobs (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id    uuid REFERENCES books,
  status     text CHECK (status IN ('pending','processing','done','error')),
  log        text,
  created_at timestamptz DEFAULT now()
)
```

### Auth
Supabase Auth with **email/password + Google OAuth**. Supabase creates `auth.users` on first sign-in automatically. On first login, the client reads any existing localStorage vocab, upserts it to `vocab_entries`, then clears localStorage — one-time migration with no server involvement.

### RLS policies (summary)
- `books`, `chapters`: `SELECT` for all authenticated; `INSERT/UPDATE/DELETE` for admin (server-side service key only).
- `user_progress`, `vocab_entries`: full CRUD where `user_id = auth.uid()`.
- `import_jobs`: service key only.

---

## 3. Reader UI

### Layout
`max-w-[720px] mx-auto px-6` reading column, centered. Hanzi in `Noto Serif SC` at `text-3xl` desktop / `text-2xl` mobile. Outer container uses `leading-relaxed` with extra vertical rhythm between sentences. Fully responsive — word groups wrap naturally on narrow screens, no horizontal overflow.

### Punctuation
Punctuation tokens render as a plain `<span>` with `margin-left: -0.1em` to visually attach to the preceding character. No pinyin slot rendered above them. Not a tap target. No `data-token-id`. The flex-wrap container prevents them from starting a new line alone.

### Color legend
Collapsible panel (chevron toggle) anchored below the toolbar. Shows a colored swatch + Indonesian label per POS category. Three palette options in a toggle group:

| Option | Description |
|---|---|
| Default | Existing Tailwind custom POS colors |
| Colorblind-safe | Okabe-Ito palette (8 colors covering all 10 POS) |
| Off | No underlines (`border-transparent` everywhere) |

Palette choice stored in Zustand, persisted to `localStorage`.

### Tap-to-look-up popup
Keeps the existing Floating UI anchor. Additions:
- **Cari button** — expands a sub-panel showing all gloss senses from the token's `gloss_id` field, formatted with the word, pinyin, and full Indonesian gloss.
- **Audio button** — calls `tts.speak(token.hanzi)`.
- Outside-tap dismissal via `useDismiss` (existing, works on touch).

### Translation controls
Each paragraph gets two inline buttons (always visible on mobile, visible on hover on desktop):
- **Terjemahkan** — toggles the paragraph's `translation_id` inline (one translation per paragraph, matching the existing data model). Independent of the global toolbar translation toggle.
- **Jelaskan** — per-sentence: small button below each sentence, calls `POST /api/jelaskan` with `{ hanzi: string }` (the joined sentence text). Returns `{ explanation: string }` — a Gemini-generated Indonesian grammar/idiom explanation. Result cached in component state for the session; displayed in a collapsible panel below the sentence.

The old ambiguous toolbar translation toggle is removed. The toolbar retains: Chinese on/off, pinyin on/off, color mode selector, and read-aloud.

### Audio with per-word highlight
Pre-compute a char-offset map on chapter load: for each token in a sentence, record the cumulative character index in the joined sentence string (punctuation included). `SpeechSynthesisUtterance.onboundary` fires with `charIndex` — find the token whose char range contains `charIndex`, set `activeWordIndex` in Zustand. That token gets a highlight ring (`outline-2 outline-amber-400 rounded`). On utterance end, clear `activeWordIndex`.

**iOS fallback:** if `onboundary` never fires within 500 ms of utterance start, switch to sentence-level highlight for that session (no per-word). Detected once per page load, not per-utterance.

**Speed control:** `utterance.rate` set to `0.5`, `0.75`, or `1.0` via a button group in the toolbar. Selection persisted to `localStorage`.

### Progress & resume
- Thin progress bar fixed at top of viewport: `scrollY / (document.scrollHeight - window.innerHeight)`.
- On scroll: debounce 2 s, upsert `user_progress.scroll_position`.
- On chapter load: if saved position exists, `window.scrollTo({ top: savedPosition, behavior: 'instant' })` after first paint.
- Chapter marked completed when user scrolls to within 200 px of the bottom, or taps "Tandai selesai" in the footer prompt.

---

## 4. Library & Chapter Navigation

### Library home (`/`)
Server Component — content rendered at request time for authenticated users. Responsive grid (`grid-cols-2 sm:grid-cols-3 lg:grid-cols-4`). Each book card shows: cover emoji, title, author, progress ring (% chapters completed). In-progress books show a "Lanjutkan" shortcut linking to the last chapter with a non-zero `scroll_position`.

### Book detail (`/books/[bookId]`)
Chapter list in `order_index` order. Each row: chapter title, scroll-based progress bar, ✓ badge when completed. "Lanjutkan membaca" button at top links to first incomplete chapter.

### Chapter reader (`/books/[bookId]/chapters/[chapterId]`)
- Breadcrumb: book title → chapter title.
- Fixed top progress bar.
- Reader content (all Section 3 features).
- Footer: **← Bab sebelumnya** / **Bab berikutnya →** links (hidden if first/last chapter).
- At bottom: "Selesai — tandai sebagai selesai?" confirmation prompt.

### Progress model
- Scroll position (px) updated on scroll with 2 s debounce.
- `completed = true` set when user reaches the bottom or taps confirmation.
- Library/book progress % = `(completed chapters / total chapters) × 100`.

---

## 5. Admin Paste-in Form & NLP Pipeline

### Access
`/admin` server-rendered; middleware checks `session.user.email` against `ADMIN_EMAILS` env var. Non-admin users get a 403 page.

### Form
**Book section:** title, author, cover emoji, license (default: "Public Domain"), source URL (optional). Selecting an existing book auto-fills these fields and increments chapter number.

**Chapter section:** chapter number (auto-suggested), chapter title, raw Chinese text (large textarea).

### Import flow
1. Submit → `POST /api/admin/import` → creates `import_jobs` row (`status: 'pending'`), returns job ID.
2. Same request (synchronous): splits pasted text into paragraphs on blank lines, sends one Gemini prompt for the whole chapter. **Vercel timeout note:** Hobby plan limits serverless functions to 60 s; a long chapter may approach this. Vercel Pro extends to 300 s. If needed, the import can be split into per-paragraph Gemini calls to stay well under the limit.
3. **Gemini prompt** uses `responseMimeType: 'application/json'` and a JSON schema matching `{ paragraphs: Paragraph[] }`. Instructs Gemini to: segment words, assign tone-marked pinyin (context-aware for polyphones), tag POS from the 10-value `Pos` union, estimate HSK level (1–6 or null), and provide Indonesian gloss per token.
4. Response validated with Zod against the `Chapter` TypeScript type. Failure → `import_jobs.status = 'error'` + raw response logged.
5. Success → upsert `books`, insert `chapters`, set `import_jobs.status = 'done'`.
6. Admin page polls `GET /api/admin/jobs/[id]` every 2 s to show live status.

### Seeding the existing chapter
`scripts/seed.ts` (run once locally via `npx tsx scripts/seed.ts`):
- Reads `src/data/chapter1.json` (already has correct pinyin).
- Wraps as book "Cerita Rakyat Tiongkok", chapter "守株待兔".
- Inserts into Supabase using the service key.
- Idempotent (upsert by title + order_index).

---

## 6. Migration Plan (Vite → Next.js)

1. Scaffold `npx create-next-app@latest` with TypeScript + Tailwind in a temp directory; copy `tailwind.config.js`, `tsconfig.json` base into the new structure.
2. Move `src/components/`, `src/lib/`, `src/store/`, `src/types.ts` to `app/` or `lib/` as-is.
3. Replace `src/data/chapter1.json` direct imports in `Reader.tsx` with Supabase fetch calls.
4. Keep Vitest as the test runner (Next.js is compatible with Vitest; no Jest migration needed).
5. Run `scripts/seed.ts` against local Supabase dev instance before deploying.
6. Deploy to Vercel; set env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY`, `GEMINI_API_KEY`, `ADMIN_EMAILS`.

---

## 7. Out of Scope (Spec 2)

- Wikisource, ctext.org, Project Gutenberg source adapters
- Automated chapter splitting from headings
- Batch import of multiple books
- Full CC-CEDICT integration
- SRS / flashcard review screen
- Real cover images (Spec 1 uses emoji placeholders)

---

## 8. Open Questions (deferred)

- **Jelaskan caching:** Session-only cache in Spec 1. Spec 2 can add DB-level caching per sentence.
- **Vocab review UI (SRS):** Captured but out of scope.
- **Offline support:** Not planned for either spec.
