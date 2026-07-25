# Chinese Reading Companion — Core Reader + Tap-Lookup (Design)

Date: 2026-07-26

## Purpose

Build the first, standalone piece of a larger "Chinese Reading Companion" concept: a
mobile-width web reader that displays a Chinese text with pinyin, part-of-speech or
HSK-level colored underlines, and a tap-to-look-up popup with an Indonesian gloss,
audio, and vocab-saving — modeled on the reference screenshots provided by the user.

This is a proof of concept for one chapter of text, not the full platform described in
the original spec. The full spec bundles several independent subsystems (live NLP
pipeline, translation-API-backed dictionary, TTS provider abstraction, SRS review,
multi-book library). Those are deliberately deferred; see "Out of scope" below.

## Architecture

Fully static React + TypeScript + Tailwind app (Vite), no backend, no database.

```
belajar-mandarin/
├── scripts/
│   └── generate-pinyin.mjs      # one-time: runs pinyin-pro over raw hanzi, seeds pinyin into data JSON
├── src/
│   ├── data/
│   │   └── chapter1.json         # the hand-authored/pre-baked chapter (see Data Model)
│   ├── components/
│   │   ├── Reader.tsx             # renders paragraphs → sentences → word tokens
│   │   ├── WordToken.tsx          # single tapable word: pinyin above, hanzi, colored underline
│   │   ├── LookupPopup.tsx        # floating popup (Floating UI) on word tap
│   │   ├── Toolbar.tsx            # top bar: Chinese/pinyin/translation toggles, color-mode switch, TTS play
│   │   └── ParagraphActions.tsx   # "Terjemahkan" button + revealed translation block
│   ├── lib/
│   │   ├── tts.ts                 # speak(text) wrapping Web Speech API
│   │   └── vocab.ts               # localStorage read/write for saved words
│   ├── store/
│   │   └── readerStore.ts         # Zustand: toggle states, color mode, popup open word
│   └── App.tsx
├── index.html
└── package.json
```

`chapter1.json` is committed as static data and imported directly by the app (Vite
bundles it at build time). `generate-pinyin.mjs` is a dev-time helper run once against
a plain-hanzi draft with manual word-segmentation boundaries already marked, to
auto-fill the `pinyin` field via `pinyin-pro` (so tone marks aren't hand-typed). `pos`,
`hsk`, and `gloss_id` are still hand-filled per word afterward.

## Data Model

Single JSON file mirroring the reading hierarchy: paragraph → sentence → token.

```json
{
  "title": "Alkemis — Bab Satu",
  "chapterLabel": "Bab 1",
  "paragraphs": [
    {
      "id": "p1",
      "translation_id": "Anak laki-laki ini bernama Santiago...",
      "sentences": [
        {
          "id": "p1s1",
          "tokens": [
            {
              "hanzi": "这个",
              "pinyin": "zhè ge",
              "pos": "pron",
              "hsk": 1,
              "gloss_id": "ini"
            },
            {
              "hanzi": "圣地亚哥",
              "pinyin": "Shèngdìyàgē",
              "pos": "propn",
              "hsk": null,
              "gloss_id": "San Diego (sebuah kota di California, Amerika Serikat)"
            }
          ]
        }
      ]
    }
  ]
}
```

Notes:
- `tokens` are words (post-segmentation), not characters — a token can be
  multi-character (e.g. 圣地亚哥).
- `pos` drives underline color in POS mode: one of
  `noun | verb | adj | adv | pron | propn | particle | numeral | function`. Each maps
  to a distinct pastel color matching the reference screenshots.
- `hsk` is `1`–`6`, or `null` for proper nouns/ungraded words. `null` renders as a
  distinct neutral color in HSK mode — not the same as HSK 6 — so proper nouns don't
  read as "most advanced."
- `gloss_id` is the Indonesian meaning shown directly in the tap popup. No separate
  gloss/translation-cache table — that indirection only pays off once multiple
  chapters share vocabulary, which is out of scope here.
- `translation_id` is the paragraph's full Indonesian translation, backing the
  "Terjemahkan" button.
- No `Book`/`Chapter` entity split — this file *is* one chapter. Multi-chapter
  navigation is out of scope.

## Components & Interaction Flow

**Reader.tsx** walks `paragraphs → sentences → tokens`, rendering each token as a
`WordToken`: pinyin in muted gray above (hidden if the pinyin toggle is off), hanzi
below, a colored underline (or none, depending on color-mode/toggle state). Sized for
comfortable mobile-width reading; sentences wrap naturally.

**Tap-lookup:** tapping a `WordToken` sets `activeToken` in the Zustand store;
`LookupPopup` (positioned via Floating UI, anchored to that token) shows hanzi +
pinyin + `gloss_id`, plus two buttons:
- **Putar (audio)** → `speak(hanzi)` via the Web Speech API.
- **Tambahkan** → `vocab.ts` writes `{hanzi, pinyin, gloss, sourceSentence, addedAt}`
  to localStorage; the button flips to an "already added" state if the word is already
  saved.

"Cari" (fuller dictionary lookup) is omitted entirely — no external dictionary is
wired up in this build, so the button would be a dead click target.

Tapping outside the popup (a document-level click listener) closes it. Long-press
multi-word selection is deferred — single-word tap only.

**Toolbar.tsx:** independent toggle booleans for Chinese visibility, pinyin
visibility, and translation visibility (e.g. hiding Chinese while showing translation
gives a translation-only reading mode); a POS/HSK color-mode switch; and a
chapter-level "read aloud" button that speaks sentence-by-sentence in order via the
same `speak()` helper. No word-highlight sync during playback — Web Speech API
boundary-event support is inconsistent across browsers, so this is deferred.

**ParagraphActions.tsx:** a "Terjemahkan" button under each paragraph that toggles a
revealed block showing `translation_id`. "Jelaskan" (grammar explanation) is dropped
from this build — it requires a live LLM call, which is out of scope for a
no-backend static app.

## Out of Scope (this build)

Deferred deliberately, not silently dropped:
- Multi-chapter/book navigation, table of contents, reading-progress bar, bookmarks,
  resume-position.
- Server-side segmentation/POS/pinyin pipeline (jieba, pypinyin), CC-CEDICT lookup,
  translation-API-backed gloss caching — replaced here by hand-authored JSON plus a
  one-time pinyin-generation script.
- SRS flashcard review screen — vocab is captured to localStorage but there's no
  review UI yet.
- "Cari" fuller dictionary lookup, "Jelaskan" grammar explanation, long-press
  multi-word span selection, word-highlight-synced read-aloud, font/line-spacing
  settings, colorblind-safe palette toggle.

## Edge Cases

- Tapping a word while another popup is open: close the old popup, open the new one
  — popups never stack.
- Chinese toggle off *and* translation toggle off simultaneously: show a small "no
  content to display, enable a view" hint rather than a blank screen.
- `window.speechSynthesis` unavailable: feature-detect and hide audio-related buttons
  gracefully rather than erroring.

## Testing Approach

Manual verification in a mobile-width browser viewport (no automated test suite —
this is a single-screen UI over static data, and the highest-value check is visual/
interactive correctness). Verify: pinyin alignment per word, underline-color accuracy
in both POS and HSK modes, popup positioning near screen edges, toggle combinations,
vocab save/persist across reload, and TTS playback with the feature-detection
fallback.
