# Core Reader + Tap-Lookup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a static React reader that displays one pre-annotated Chinese chapter with pinyin, POS/HSK-colored underlines, tap-to-look-up popups (gloss + audio + save-to-vocab), toolbar visibility toggles, a color-mode switch, per-paragraph translation reveal, and chapter read-aloud — no backend, no live NLP.

**Architecture:** Fully static Vite + React + TypeScript + Tailwind app. A one-time Node script (`pinyin-pro`) annotates a hand-authored source JSON with pinyin; the app imports the annotated JSON directly at build time. Zustand holds UI toggle/mode state. `localStorage` persists saved vocab. The browser's Web Speech API provides TTS, feature-detected and gracefully hidden when unsupported.

**Tech Stack:** React 18, TypeScript, Vite, Tailwind CSS, Zustand, @floating-ui/react, pinyin-pro, Vitest, @testing-library/react.

## Global Constraints

- All user-facing copy (buttons, hints, labels) is in Indonesian, matching the reference screenshots.
- No network calls, no backend, no database — the app must run entirely from `npm run dev` with no other services.
- TypeScript `strict` mode is on; no `any` in application code (test mocks may cast through `as any` where a browser API isn't in jsdom's lib types).
- All styling via Tailwind utility classes — no separate CSS files beyond the Tailwind directives in `src/index.css`.
- `localStorage` keys are namespaced `belajar-mandarin:*` to avoid collisions with any other app on the same origin.
- Sample chapter content is an original modern-Mandarin retelling of the classical public-domain fable 守株待兔 ("waiting for a rabbit by a tree stump"), composed fresh for this project — not a reproduction of any copyrighted work (notably, not the Paulo Coelho text from the reference screenshots, which is still under copyright).
- Every task ends with `npm test` passing in full (not just the new test file) before it is considered done.

---

### Task 1: Project Scaffold

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `vite.config.ts`
- Create: `tailwind.config.js`
- Create: `postcss.config.js`
- Create: `index.html`
- Create: `src/index.css`
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `vitest.setup.ts`
- Test: `src/App.test.tsx`
- Create: `.gitignore`

**Interfaces:**
- Produces: a working `npm run dev` / `npm test` toolchain that every later task builds on. No app-level exports yet.

- [ ] **Step 1: Write the build/config files**

`package.json`:
```json
{
  "name": "belajar-mandarin",
  "private": true,
  "version": "0.0.1",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "generate:pinyin": "node scripts/generate-pinyin.mjs"
  },
  "dependencies": {
    "@floating-ui/react": "^0.26.28",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "zustand": "^4.5.5"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.5.0",
    "@testing-library/react": "^16.0.1",
    "@types/react": "^18.3.11",
    "@types/react-dom": "^18.3.1",
    "@vitejs/plugin-react": "^4.3.2",
    "autoprefixer": "^10.4.20",
    "jsdom": "^25.0.1",
    "pinyin-pro": "^3.25.0",
    "postcss": "^8.4.47",
    "tailwindcss": "^3.4.13",
    "typescript": "^5.6.2",
    "vite": "^5.4.8",
    "vitest": "^2.1.2"
  }
}
```

`tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "types": ["vitest/globals", "@testing-library/jest-dom"]
  },
  "include": ["src", "vitest.setup.ts"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

`tsconfig.node.json`:
```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}
```

`vite.config.ts`:
```ts
/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: './vitest.setup.ts',
    globals: true,
  },
});
```

`tailwind.config.js`:
```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        pos: {
          noun: '#5EEAD4',
          verb: '#FDBA74',
          adj: '#86EFAC',
          adv: '#FDE047',
          pron: '#93C5FD',
          propn: '#C4B5FD',
          particle: '#F9A8D4',
          numeral: '#FDE047',
          function: '#D1D5DB',
        },
        hsk: {
          1: '#BBF7D0',
          2: '#FDE68A',
          3: '#FED7AA',
          4: '#FECACA',
          5: '#DDD6FE',
          6: '#FBCFE8',
          none: '#E5E7EB',
        },
      },
    },
  },
  plugins: [],
};
```

`postcss.config.js`:
```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

`index.html`:
```html
<!doctype html>
<html lang="id">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Belajar Mandarin</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`src/index.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

`src/main.tsx`:
```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

`vitest.setup.ts`:
```ts
import '@testing-library/jest-dom/vitest';
```

`.gitignore`:
```
node_modules
dist
.DS_Store
```

- [ ] **Step 2: Install dependencies**

Run: `npm install`
Expected: completes with no errors, creates `node_modules/` and `package-lock.json`.

- [ ] **Step 3: Write a minimal App.tsx (no title yet)**

`src/App.tsx`:
```tsx
export default function App() {
  return <div className="min-h-screen bg-gray-50" />;
}
```

- [ ] **Step 4: Write the failing smoke test**

`src/App.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from './App';

describe('App', () => {
  it('renders the app title', () => {
    render(<App />);
    expect(screen.getByText('Belajar Mandarin')).toBeInTheDocument();
  });
});
```

- [ ] **Step 5: Run the test and confirm it fails**

Run: `npm test`
Expected: FAIL — `Unable to find an element with the text: Belajar Mandarin`

- [ ] **Step 6: Update App.tsx to render the title**

`src/App.tsx`:
```tsx
export default function App() {
  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <h1 className="text-xl font-bold">Belajar Mandarin</h1>
    </div>
  );
}
```

- [ ] **Step 7: Run the test and confirm it passes**

Run: `npm test`
Expected: PASS — 1 test passed.

- [ ] **Step 8: Commit**

```bash
git add package.json tsconfig.json tsconfig.node.json vite.config.ts tailwind.config.js postcss.config.js index.html src/index.css src/main.tsx src/App.tsx src/App.test.tsx vitest.setup.ts .gitignore package-lock.json
git commit -m "chore: scaffold Vite/React/TS/Tailwind app with Vitest smoke test"
```

---

### Task 2: Types + Chapter Data + Pinyin Generation Script

**Files:**
- Create: `src/types.ts`
- Create: `src/data/chapter1.source.json`
- Create: `scripts/generate-pinyin.mjs`
- Test: `scripts/generate-pinyin.test.mjs`
- Create: `src/data/chapter1.json` (generated by running the script, not hand-written)

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `Token`, `Sentence`, `Paragraph`, `Chapter`, `Pos`, `ColorMode` types from `src/types.ts` (used by every later task); `src/data/chapter1.json` matching the `Chapter` shape (imported by `Reader.tsx` and `Toolbar.tsx` in later tasks); `annotateWithPinyin(chapter)` exported from `scripts/generate-pinyin.mjs`.

- [ ] **Step 1: Write the shared types**

`src/types.ts`:
```ts
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

export interface Chapter {
  title: string;
  chapterLabel: string;
  paragraphs: Paragraph[];
}

export type ColorMode = 'pos' | 'hsk';
```

- [ ] **Step 2: Write the hand-authored source data (no pinyin field yet)**

`src/data/chapter1.source.json`:
```json
{
  "title": "Menunggu Kelinci di Tunggul Pohon",
  "chapterLabel": "Bab 1",
  "paragraphs": [
    {
      "id": "p1",
      "translation_id": "Dahulu, ada seorang petani yang sedang bertani di ladang. Suatu hari, seekor kelinci berlari sangat kencang, menabrak tunggul pohon di pinggir ladang, lalu mati. Petani itu sangat senang, memungut kelinci itu dan membawanya pulang. Sejak saat itu, dia setiap hari duduk di samping tunggul pohon, menunggu seekor kelinci lain muncul. Tetapi, dia tidak pernah lagi berhasil menunggu kelinci datang, dan tanaman di ladangnya pun jadi terbengkalai.",
      "sentences": [
        {
          "id": "p1s1",
          "tokens": [
            { "hanzi": "从前", "pos": "adv", "hsk": 3, "gloss_id": "dahulu; pada zaman dahulu" },
            { "hanzi": "，", "pos": "punct", "hsk": null, "gloss_id": "" },
            { "hanzi": "有", "pos": "verb", "hsk": 1, "gloss_id": "ada" },
            { "hanzi": "一个", "pos": "numeral", "hsk": 1, "gloss_id": "sebuah/seorang" },
            { "hanzi": "农夫", "pos": "noun", "hsk": 4, "gloss_id": "petani" },
            { "hanzi": "在", "pos": "function", "hsk": 1, "gloss_id": "di" },
            { "hanzi": "地里", "pos": "noun", "hsk": null, "gloss_id": "di ladang" },
            { "hanzi": "种地", "pos": "verb", "hsk": 4, "gloss_id": "bertani; menggarap sawah" },
            { "hanzi": "。", "pos": "punct", "hsk": null, "gloss_id": "" }
          ]
        },
        {
          "id": "p1s2",
          "tokens": [
            { "hanzi": "有一天", "pos": "adv", "hsk": 2, "gloss_id": "suatu hari" },
            { "hanzi": "，", "pos": "punct", "hsk": null, "gloss_id": "" },
            { "hanzi": "一只", "pos": "numeral", "hsk": 1, "gloss_id": "seekor" },
            { "hanzi": "兔子", "pos": "noun", "hsk": 4, "gloss_id": "kelinci" },
            { "hanzi": "跑", "pos": "verb", "hsk": 2, "gloss_id": "berlari" },
            { "hanzi": "得", "pos": "particle", "hsk": 3, "gloss_id": "(partikel pelengkap tingkat)" },
            { "hanzi": "很快", "pos": "adv", "hsk": 1, "gloss_id": "sangat cepat" },
            { "hanzi": "，", "pos": "punct", "hsk": null, "gloss_id": "" },
            { "hanzi": "撞到", "pos": "verb", "hsk": null, "gloss_id": "menabrak" },
            { "hanzi": "田边", "pos": "noun", "hsk": null, "gloss_id": "pinggir ladang" },
            { "hanzi": "的", "pos": "particle", "hsk": 1, "gloss_id": "(partikel penghubung)" },
            { "hanzi": "树桩", "pos": "noun", "hsk": null, "gloss_id": "tunggul pohon" },
            { "hanzi": "，", "pos": "punct", "hsk": null, "gloss_id": "" },
            { "hanzi": "就", "pos": "adv", "hsk": 2, "gloss_id": "lalu; kemudian" },
            { "hanzi": "死", "pos": "verb", "hsk": 3, "gloss_id": "mati" },
            { "hanzi": "了", "pos": "particle", "hsk": 1, "gloss_id": "(partikel aspek selesai)" },
            { "hanzi": "。", "pos": "punct", "hsk": null, "gloss_id": "" }
          ]
        },
        {
          "id": "p1s3",
          "tokens": [
            { "hanzi": "农夫", "pos": "noun", "hsk": 4, "gloss_id": "petani" },
            { "hanzi": "很", "pos": "adv", "hsk": 1, "gloss_id": "sangat" },
            { "hanzi": "高兴", "pos": "adj", "hsk": 1, "gloss_id": "senang; gembira" },
            { "hanzi": "，", "pos": "punct", "hsk": null, "gloss_id": "" },
            { "hanzi": "捡起", "pos": "verb", "hsk": null, "gloss_id": "memungut; mengambil" },
            { "hanzi": "兔子", "pos": "noun", "hsk": 4, "gloss_id": "kelinci" },
            { "hanzi": "带回家", "pos": "verb", "hsk": null, "gloss_id": "membawa pulang" },
            { "hanzi": "。", "pos": "punct", "hsk": null, "gloss_id": "" }
          ]
        },
        {
          "id": "p1s4",
          "tokens": [
            { "hanzi": "从那以后", "pos": "adv", "hsk": null, "gloss_id": "sejak saat itu" },
            { "hanzi": "，", "pos": "punct", "hsk": null, "gloss_id": "" },
            { "hanzi": "他", "pos": "pron", "hsk": 1, "gloss_id": "dia" },
            { "hanzi": "每天", "pos": "adv", "hsk": 1, "gloss_id": "setiap hari" },
            { "hanzi": "都", "pos": "adv", "hsk": 1, "gloss_id": "selalu; semua" },
            { "hanzi": "坐在", "pos": "verb", "hsk": 2, "gloss_id": "duduk di" },
            { "hanzi": "树桩", "pos": "noun", "hsk": null, "gloss_id": "tunggul pohon" },
            { "hanzi": "旁边", "pos": "noun", "hsk": 2, "gloss_id": "di samping" },
            { "hanzi": "，", "pos": "punct", "hsk": null, "gloss_id": "" },
            { "hanzi": "等", "pos": "verb", "hsk": 1, "gloss_id": "menunggu" },
            { "hanzi": "着", "pos": "particle", "hsk": 3, "gloss_id": "(partikel aspek berlangsung)" },
            { "hanzi": "另一只", "pos": "numeral", "hsk": null, "gloss_id": "seekor lagi" },
            { "hanzi": "兔子", "pos": "noun", "hsk": 4, "gloss_id": "kelinci" },
            { "hanzi": "出现", "pos": "verb", "hsk": 3, "gloss_id": "muncul" },
            { "hanzi": "。", "pos": "punct", "hsk": null, "gloss_id": "" }
          ]
        },
        {
          "id": "p1s5",
          "tokens": [
            { "hanzi": "可是", "pos": "function", "hsk": 2, "gloss_id": "tetapi" },
            { "hanzi": "，", "pos": "punct", "hsk": null, "gloss_id": "" },
            { "hanzi": "他", "pos": "pron", "hsk": 1, "gloss_id": "dia" },
            { "hanzi": "再也没有", "pos": "adv", "hsk": null, "gloss_id": "tidak pernah lagi" },
            { "hanzi": "等到", "pos": "verb", "hsk": null, "gloss_id": "berhasil menunggu" },
            { "hanzi": "兔子", "pos": "noun", "hsk": 4, "gloss_id": "kelinci" },
            { "hanzi": "，", "pos": "punct", "hsk": null, "gloss_id": "" },
            { "hanzi": "地里", "pos": "noun", "hsk": null, "gloss_id": "di ladang" },
            { "hanzi": "的", "pos": "particle", "hsk": 1, "gloss_id": "(partikel kepemilikan)" },
            { "hanzi": "庄稼", "pos": "noun", "hsk": null, "gloss_id": "tanaman pertanian" },
            { "hanzi": "也", "pos": "adv", "hsk": 1, "gloss_id": "juga" },
            { "hanzi": "荒废", "pos": "verb", "hsk": null, "gloss_id": "terbengkalai" },
            { "hanzi": "了", "pos": "particle", "hsk": 1, "gloss_id": "(partikel aspek selesai)" },
            { "hanzi": "。", "pos": "punct", "hsk": null, "gloss_id": "" }
          ]
        }
      ]
    }
  ]
}
```

- [ ] **Step 3: Write the failing test for the pinyin-annotation function**

`scripts/generate-pinyin.test.mjs`:
```js
import { describe, it, expect } from 'vitest';
import { annotateWithPinyin } from './generate-pinyin.mjs';

function chapterWithToken(token) {
  return {
    title: 't',
    chapterLabel: 'c',
    paragraphs: [
      {
        id: 'p1',
        translation_id: 'x',
        sentences: [{ id: 's1', tokens: [token] }],
      },
    ],
  };
}

describe('annotateWithPinyin', () => {
  it('fills in tone-marked pinyin for a hanzi token', () => {
    const result = annotateWithPinyin(
      chapterWithToken({ hanzi: '你好', pos: 'phrase', hsk: 1, gloss_id: 'halo' })
    );
    expect(result.paragraphs[0].sentences[0].tokens[0].pinyin).toBe('nǐ hǎo');
  });

  it('leaves punctuation tokens with empty pinyin', () => {
    const result = annotateWithPinyin(
      chapterWithToken({ hanzi: '。', pos: 'punct', hsk: null, gloss_id: '' })
    );
    expect(result.paragraphs[0].sentences[0].tokens[0].pinyin).toBe('');
  });
});
```

- [ ] **Step 4: Run the test and confirm it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module './generate-pinyin.mjs'` (or similar resolution error).

- [ ] **Step 5: Write the pinyin-generation script**

`scripts/generate-pinyin.mjs`:
```js
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { pinyin } from 'pinyin-pro';

const __dirname = dirname(fileURLToPath(import.meta.url));

export function annotateWithPinyin(chapter) {
  return {
    ...chapter,
    paragraphs: chapter.paragraphs.map((paragraph) => ({
      ...paragraph,
      sentences: paragraph.sentences.map((sentence) => ({
        ...sentence,
        tokens: sentence.tokens.map((token) => ({
          ...token,
          pinyin: token.pos === 'punct' ? '' : pinyin(token.hanzi),
        })),
      })),
    })),
  };
}

function main() {
  const sourcePath = join(__dirname, '../src/data/chapter1.source.json');
  const outputPath = join(__dirname, '../src/data/chapter1.json');
  const source = JSON.parse(readFileSync(sourcePath, 'utf-8'));
  const annotated = annotateWithPinyin(source);
  writeFileSync(outputPath, JSON.stringify(annotated, null, 2) + '\n', 'utf-8');
  console.log(`Wrote ${outputPath}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
```

- [ ] **Step 6: Run the test and confirm it passes**

Run: `npm test`
Expected: PASS — both `generate-pinyin` tests pass, plus the Task 1 smoke test still passes.

- [ ] **Step 7: Generate the annotated chapter data**

Run: `npm run generate:pinyin`
Expected: prints `Wrote .../src/data/chapter1.json`; the file now exists with every non-punctuation token carrying a `pinyin` field.

- [ ] **Step 8: Commit**

```bash
git add src/types.ts src/data/chapter1.source.json src/data/chapter1.json scripts/generate-pinyin.mjs scripts/generate-pinyin.test.mjs
git commit -m "feat: add chapter data types, source content, and pinyin generation script"
```

---

### Task 3: Reader State Store

**Files:**
- Create: `src/store/readerStore.ts`
- Test: `src/store/readerStore.test.ts`

**Interfaces:**
- Consumes: `ColorMode` from `src/types.ts`.
- Produces: `useReaderStore` (Zustand hook) with state `{ showChinese, showPinyin, showTranslation, colorMode, activeTokenId }` and actions `{ toggleChinese, togglePinyin, toggleTranslation, setColorMode(mode), setActiveTokenId(id) }`. Every later component task reads/writes through this hook — these exact names are load-bearing for Tasks 6–9.

- [ ] **Step 1: Write the failing test**

`src/store/readerStore.test.ts`:
```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { useReaderStore } from './readerStore';

const initialState = useReaderStore.getState();

describe('useReaderStore', () => {
  beforeEach(() => {
    useReaderStore.setState(initialState, true);
  });

  it('defaults to Chinese and pinyin visible, translation hidden, pos color mode', () => {
    const state = useReaderStore.getState();
    expect(state.showChinese).toBe(true);
    expect(state.showPinyin).toBe(true);
    expect(state.showTranslation).toBe(false);
    expect(state.colorMode).toBe('pos');
    expect(state.activeTokenId).toBeNull();
  });

  it('toggles visibility flags independently', () => {
    useReaderStore.getState().toggleChinese();
    expect(useReaderStore.getState().showChinese).toBe(false);
    expect(useReaderStore.getState().showPinyin).toBe(true);
  });

  it('switches color mode', () => {
    useReaderStore.getState().setColorMode('hsk');
    expect(useReaderStore.getState().colorMode).toBe('hsk');
  });

  it('sets and clears the active token id', () => {
    useReaderStore.getState().setActiveTokenId('p1s1-2');
    expect(useReaderStore.getState().activeTokenId).toBe('p1s1-2');
    useReaderStore.getState().setActiveTokenId(null);
    expect(useReaderStore.getState().activeTokenId).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module './readerStore'`.

- [ ] **Step 3: Write the store**

`src/store/readerStore.ts`:
```ts
import { create } from 'zustand';
import type { ColorMode } from '../types';

export interface ReaderState {
  showChinese: boolean;
  showPinyin: boolean;
  showTranslation: boolean;
  colorMode: ColorMode;
  activeTokenId: string | null;
  toggleChinese: () => void;
  togglePinyin: () => void;
  toggleTranslation: () => void;
  setColorMode: (mode: ColorMode) => void;
  setActiveTokenId: (id: string | null) => void;
}

export const useReaderStore = create<ReaderState>((set) => ({
  showChinese: true,
  showPinyin: true,
  showTranslation: false,
  colorMode: 'pos',
  activeTokenId: null,
  toggleChinese: () => set((s) => ({ showChinese: !s.showChinese })),
  togglePinyin: () => set((s) => ({ showPinyin: !s.showPinyin })),
  toggleTranslation: () => set((s) => ({ showTranslation: !s.showTranslation })),
  setColorMode: (mode) => set({ colorMode: mode }),
  setActiveTokenId: (id) => set({ activeTokenId: id }),
}));
```

- [ ] **Step 4: Run the test and confirm it passes**

Run: `npm test`
Expected: PASS — all `readerStore` tests pass, full suite still green.

- [ ] **Step 5: Commit**

```bash
git add src/store/readerStore.ts src/store/readerStore.test.ts
git commit -m "feat: add reader UI state store"
```

---

### Task 4: Underline Color Mapping

**Files:**
- Create: `src/lib/colors.ts`
- Test: `src/lib/colors.test.ts`

**Interfaces:**
- Consumes: `Token`, `ColorMode` from `src/types.ts`.
- Produces: `getUnderlineClass(token: Token, mode: ColorMode): string`, returning a Tailwind `border-*` class. Used by `WordToken` in Task 6.

- [ ] **Step 1: Write the failing test**

`src/lib/colors.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { getUnderlineClass } from './colors';
import type { Token } from '../types';

const noun: Token = { hanzi: '农夫', pinyin: 'nóng fū', pos: 'noun', hsk: 4, gloss_id: 'petani' };
const punct: Token = { hanzi: '。', pinyin: '', pos: 'punct', hsk: null, gloss_id: '' };
const ungraded: Token = { hanzi: '树桩', pinyin: 'shù zhuāng', pos: 'noun', hsk: null, gloss_id: 'tunggul pohon' };

describe('getUnderlineClass', () => {
  it('returns the POS color class in pos mode', () => {
    expect(getUnderlineClass(noun, 'pos')).toBe('border-pos-noun');
  });

  it('returns the HSK color class in hsk mode', () => {
    expect(getUnderlineClass(noun, 'hsk')).toBe('border-hsk-4');
  });

  it('returns a neutral HSK class for ungraded words, distinct from HSK 6', () => {
    expect(getUnderlineClass(ungraded, 'hsk')).toBe('border-hsk-none');
    expect(getUnderlineClass(ungraded, 'hsk')).not.toBe('border-hsk-6');
  });

  it('always renders punctuation with a transparent underline', () => {
    expect(getUnderlineClass(punct, 'pos')).toBe('border-transparent');
    expect(getUnderlineClass(punct, 'hsk')).toBe('border-transparent');
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module './colors'`.

- [ ] **Step 3: Write the color mapping**

`src/lib/colors.ts`:
```ts
import type { ColorMode, Token } from '../types';

const POS_UNDERLINE_CLASSES: Record<Token['pos'], string> = {
  noun: 'border-pos-noun',
  verb: 'border-pos-verb',
  adj: 'border-pos-adj',
  adv: 'border-pos-adv',
  pron: 'border-pos-pron',
  propn: 'border-pos-propn',
  particle: 'border-pos-particle',
  numeral: 'border-pos-numeral',
  function: 'border-pos-function',
  punct: 'border-transparent',
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

export function getUnderlineClass(token: Token, mode: ColorMode): string {
  if (token.pos === 'punct') {
    return 'border-transparent';
  }
  if (mode === 'hsk') {
    return HSK_UNDERLINE_CLASSES[token.hsk === null ? 'none' : String(token.hsk)];
  }
  return POS_UNDERLINE_CLASSES[token.pos];
}
```

- [ ] **Step 4: Run the test and confirm it passes**

Run: `npm test`
Expected: PASS — all `colors` tests pass, full suite still green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/colors.ts src/lib/colors.test.ts
git commit -m "feat: add POS/HSK underline color mapping"
```

---

### Task 5: Client Utility Libraries (vocab + tts)

**Files:**
- Create: `src/lib/vocab.ts`
- Test: `src/lib/vocab.test.ts`
- Create: `src/lib/tts.ts`
- Test: `src/lib/tts.test.ts`

**Interfaces:**
- Produces: `VocabEntry` type, `getVocab(): VocabEntry[]`, `isSaved(hanzi: string): boolean`, `addVocabEntry(entry: Omit<VocabEntry, 'addedAt'>): void` from `vocab.ts`; `isSpeechSupported(): boolean`, `speak(text: string, lang?: string): void` from `tts.ts`. Both are used by `LookupPopup` (Task 7) and `speak`/`isSpeechSupported` also by `Toolbar` (Task 9).

- [ ] **Step 1: Write the failing vocab test**

`src/lib/vocab.test.ts`:
```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { addVocabEntry, getVocab, isSaved } from './vocab';

describe('vocab storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('starts empty', () => {
    expect(getVocab()).toEqual([]);
  });

  it('saves a vocab entry with a timestamp', () => {
    addVocabEntry({ hanzi: '兔子', pinyin: 'tù zi', gloss: 'kelinci', sourceSentence: '一只兔子跑得很快' });
    const vocab = getVocab();
    expect(vocab).toHaveLength(1);
    expect(vocab[0].hanzi).toBe('兔子');
    expect(typeof vocab[0].addedAt).toBe('string');
  });

  it('does not duplicate an already-saved word', () => {
    addVocabEntry({ hanzi: '兔子', pinyin: 'tù zi', gloss: 'kelinci', sourceSentence: 's1' });
    addVocabEntry({ hanzi: '兔子', pinyin: 'tù zi', gloss: 'kelinci', sourceSentence: 's2' });
    expect(getVocab()).toHaveLength(1);
  });

  it('reports whether a word is already saved', () => {
    expect(isSaved('兔子')).toBe(false);
    addVocabEntry({ hanzi: '兔子', pinyin: 'tù zi', gloss: 'kelinci', sourceSentence: 's1' });
    expect(isSaved('兔子')).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module './vocab'`.

- [ ] **Step 3: Write vocab.ts**

`src/lib/vocab.ts`:
```ts
export interface VocabEntry {
  hanzi: string;
  pinyin: string;
  gloss: string;
  sourceSentence: string;
  addedAt: string;
}

const STORAGE_KEY = 'belajar-mandarin:vocab';

export function getVocab(): VocabEntry[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  return JSON.parse(raw) as VocabEntry[];
}

export function isSaved(hanzi: string): boolean {
  return getVocab().some((entry) => entry.hanzi === hanzi);
}

export function addVocabEntry(entry: Omit<VocabEntry, 'addedAt'>): void {
  if (isSaved(entry.hanzi)) return;
  const vocab = getVocab();
  vocab.push({ ...entry, addedAt: new Date().toISOString() });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(vocab));
}
```

- [ ] **Step 4: Run the test and confirm it passes**

Run: `npm test`
Expected: PASS — all `vocab` tests pass.

- [ ] **Step 5: Write the failing tts test**

`src/lib/tts.test.ts`:
```ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import { isSpeechSupported, speak } from './tts';

describe('tts', () => {
  const originalSpeechSynthesis = (window as unknown as { speechSynthesis?: unknown }).speechSynthesis;
  const originalUtterance = (window as unknown as { SpeechSynthesisUtterance?: unknown }).SpeechSynthesisUtterance;

  afterEach(() => {
    (window as unknown as { speechSynthesis?: unknown }).speechSynthesis = originalSpeechSynthesis;
    (window as unknown as { SpeechSynthesisUtterance?: unknown }).SpeechSynthesisUtterance = originalUtterance;
  });

  it('reports unsupported when speechSynthesis is absent', () => {
    delete (window as unknown as { speechSynthesis?: unknown }).speechSynthesis;
    expect(isSpeechSupported()).toBe(false);
  });

  it('speaks the given text in Mandarin by default when supported', () => {
    const speakFn = vi.fn();
    const cancelFn = vi.fn();
    (window as unknown as { speechSynthesis: unknown }).speechSynthesis = { speak: speakFn, cancel: cancelFn };
    (window as unknown as { SpeechSynthesisUtterance: unknown }).SpeechSynthesisUtterance = vi
      .fn()
      .mockImplementation((text: string) => ({ text, lang: '' }));

    speak('兔子');

    expect(cancelFn).toHaveBeenCalled();
    expect(speakFn).toHaveBeenCalledTimes(1);
    const utterance = speakFn.mock.calls[0][0] as { text: string; lang: string };
    expect(utterance.text).toBe('兔子');
    expect(utterance.lang).toBe('zh-CN');
  });

  it('does nothing when speech is unsupported', () => {
    delete (window as unknown as { speechSynthesis?: unknown }).speechSynthesis;
    expect(() => speak('兔子')).not.toThrow();
  });
});
```

- [ ] **Step 6: Run the test and confirm it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module './tts'`.

- [ ] **Step 7: Write tts.ts**

`src/lib/tts.ts`:
```ts
export function isSpeechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export function speak(text: string, lang = 'zh-CN'): void {
  if (!isSpeechSupported()) return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}
```

- [ ] **Step 8: Run the test and confirm it passes**

Run: `npm test`
Expected: PASS — all `tts` and `vocab` tests pass, full suite still green.

- [ ] **Step 9: Commit**

```bash
git add src/lib/vocab.ts src/lib/vocab.test.ts src/lib/tts.ts src/lib/tts.test.ts
git commit -m "feat: add localStorage vocab persistence and Web Speech API wrapper"
```

---

### Task 6: WordToken Component

**Files:**
- Create: `src/components/WordToken.tsx`
- Test: `src/components/WordToken.test.tsx`

**Interfaces:**
- Consumes: `Token` from `src/types.ts`; `useReaderStore` from Task 3; `getUnderlineClass` from Task 4.
- Produces: `WordToken({ token: Token, tokenId: string })`, a React component. It renders a `data-token-id={tokenId}` attribute on its clickable wrapper — Task 8's `Reader` relies on this attribute to locate the DOM anchor for the popup.

- [ ] **Step 1: Write the failing test**

`src/components/WordToken.test.tsx`:
```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import WordToken from './WordToken';
import { useReaderStore } from '../store/readerStore';
import type { Token } from '../types';

const initialState = useReaderStore.getState();

const nounToken: Token = { hanzi: '农夫', pinyin: 'nóng fū', pos: 'noun', hsk: 4, gloss_id: 'petani' };
const punctToken: Token = { hanzi: '。', pinyin: '', pos: 'punct', hsk: null, gloss_id: '' };

describe('WordToken', () => {
  beforeEach(() => {
    useReaderStore.setState(initialState, true);
  });

  it('renders hanzi and pinyin above it', () => {
    render(<WordToken token={nounToken} tokenId="p1s1-0" />);
    expect(screen.getByText('农夫')).toBeInTheDocument();
    expect(screen.getByText('nóng fū')).toBeInTheDocument();
  });

  it('hides pinyin when the pinyin toggle is off', () => {
    useReaderStore.getState().togglePinyin();
    render(<WordToken token={nounToken} tokenId="p1s1-0" />);
    expect(screen.queryByText('nóng fū')).not.toBeInTheDocument();
  });

  it('sets itself as the active token on click', () => {
    render(<WordToken token={nounToken} tokenId="p1s1-0" />);
    fireEvent.click(screen.getByText('农夫'));
    expect(useReaderStore.getState().activeTokenId).toBe('p1s1-0');
  });

  it('deselects on a second click', () => {
    render(<WordToken token={nounToken} tokenId="p1s1-0" />);
    fireEvent.click(screen.getByText('农夫'));
    fireEvent.click(screen.getByText('农夫'));
    expect(useReaderStore.getState().activeTokenId).toBeNull();
  });

  it('renders punctuation plainly, without pinyin or click handling', () => {
    render(<WordToken token={punctToken} tokenId="p1s1-1" />);
    fireEvent.click(screen.getByText('。'));
    expect(useReaderStore.getState().activeTokenId).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module './WordToken'`.

- [ ] **Step 3: Write WordToken.tsx**

`src/components/WordToken.tsx`:
```tsx
import type { Token } from '../types';
import { useReaderStore } from '../store/readerStore';
import { getUnderlineClass } from '../lib/colors';

interface WordTokenProps {
  token: Token;
  tokenId: string;
}

export default function WordToken({ token, tokenId }: WordTokenProps) {
  const showPinyin = useReaderStore((s) => s.showPinyin);
  const colorMode = useReaderStore((s) => s.colorMode);
  const activeTokenId = useReaderStore((s) => s.activeTokenId);
  const setActiveTokenId = useReaderStore((s) => s.setActiveTokenId);

  if (token.pos === 'punct') {
    return <span className="text-4xl">{token.hanzi}</span>;
  }

  const underlineClass = getUnderlineClass(token, colorMode);
  const isActive = activeTokenId === tokenId;

  return (
    <span
      role="button"
      data-token-id={tokenId}
      aria-pressed={isActive}
      onClick={() => setActiveTokenId(isActive ? null : tokenId)}
      className="inline-flex cursor-pointer select-none flex-col items-center mx-1"
    >
      {showPinyin && <span className="mb-0.5 text-xs text-gray-400">{token.pinyin}</span>}
      <span className={`rounded-sm border-b-4 px-0.5 text-4xl font-medium ${underlineClass}`}>
        {token.hanzi}
      </span>
    </span>
  );
}
```

- [ ] **Step 4: Run the test and confirm it passes**

Run: `npm test`
Expected: PASS — all `WordToken` tests pass, full suite still green.

- [ ] **Step 5: Commit**

```bash
git add src/components/WordToken.tsx src/components/WordToken.test.tsx
git commit -m "feat: add WordToken component with pinyin, color underline, and tap-to-select"
```

---

### Task 7: LookupPopup Component

**Files:**
- Modify: `vitest.setup.ts` (add a `ResizeObserver` stub — jsdom doesn't implement it, and `@floating-ui/react`'s `autoUpdate` requires it)
- Create: `src/components/LookupPopup.tsx`
- Test: `src/components/LookupPopup.test.tsx`

**Interfaces:**
- Consumes: `Token` from `src/types.ts`; `isSpeechSupported`, `speak` from Task 5's `tts.ts`; `addVocabEntry`, `isSaved` from Task 5's `vocab.ts`; `useReaderStore` from Task 3.
- Produces: `LookupPopup({ token: Token, anchorEl: HTMLElement, sourceSentence: string })`. Consumed by `Reader` in Task 8.

- [ ] **Step 1: Add the ResizeObserver polyfill**

`vitest.setup.ts`:
```ts
import '@testing-library/jest-dom/vitest';

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

if (typeof window !== 'undefined' && !window.ResizeObserver) {
  window.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;
}
```

- [ ] **Step 2: Write the failing test**

`src/components/LookupPopup.test.tsx`:
```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import LookupPopup from './LookupPopup';
import { useReaderStore } from '../store/readerStore';
import type { Token } from '../types';

const initialState = useReaderStore.getState();

const token: Token = { hanzi: '兔子', pinyin: 'tù zi', pos: 'noun', hsk: 4, gloss_id: 'kelinci' };

function renderPopup() {
  const anchor = document.createElement('span');
  document.body.appendChild(anchor);
  return render(<LookupPopup token={token} anchorEl={anchor} sourceSentence="一只兔子跑得很快" />);
}

describe('LookupPopup', () => {
  beforeEach(() => {
    useReaderStore.setState(initialState, true);
    localStorage.clear();
  });

  it('shows the hanzi, pinyin, and Indonesian gloss', () => {
    renderPopup();
    expect(screen.getByText('兔子')).toBeInTheDocument();
    expect(screen.getByText('tù zi')).toBeInTheDocument();
    expect(screen.getByText('kelinci')).toBeInTheDocument();
  });

  it('saves the word to vocab and flips the button label', () => {
    renderPopup();
    fireEvent.click(screen.getByText('Tambahkan'));
    expect(screen.getByText('Sudah ditambahkan')).toBeInTheDocument();
    expect(screen.getByText('Sudah ditambahkan')).toBeDisabled();
  });

  it('closes and clears activeTokenId when Escape is pressed', () => {
    useReaderStore.getState().setActiveTokenId('p1s2-3');
    renderPopup();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(useReaderStore.getState().activeTokenId).toBeNull();
  });
});
```

- [ ] **Step 3: Run the test and confirm it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module './LookupPopup'`.

- [ ] **Step 4: Write LookupPopup.tsx**

`src/components/LookupPopup.tsx`:
```tsx
import { useEffect } from 'react';
import { autoUpdate, flip, offset, shift, useDismiss, useFloating, useInteractions } from '@floating-ui/react';
import type { Token } from '../types';
import { isSpeechSupported, speak } from '../lib/tts';
import { addVocabEntry, isSaved } from '../lib/vocab';
import { useReaderStore } from '../store/readerStore';

interface LookupPopupProps {
  token: Token;
  anchorEl: HTMLElement;
  sourceSentence: string;
}

export default function LookupPopup({ token, anchorEl, sourceSentence }: LookupPopupProps) {
  const setActiveTokenId = useReaderStore((s) => s.setActiveTokenId);

  const { refs, floatingStyles, context } = useFloating({
    open: true,
    onOpenChange: (open) => {
      if (!open) setActiveTokenId(null);
    },
    placement: 'top',
    middleware: [offset(8), flip(), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
  });

  const dismiss = useDismiss(context);
  const { getFloatingProps } = useInteractions([dismiss]);

  useEffect(() => {
    refs.setReference(anchorEl);
  }, [anchorEl, refs]);

  const alreadySaved = isSaved(token.hanzi);

  return (
    <div
      ref={refs.setFloating}
      style={floatingStyles}
      {...getFloatingProps()}
      role="dialog"
      className="z-50 w-72 rounded-xl bg-white p-4 shadow-lg"
    >
      <p className="text-2xl font-semibold">{token.hanzi}</p>
      <p className="text-gray-500">{token.pinyin}</p>
      <p className="mt-2">{token.gloss_id}</p>
      <div className="mt-4 flex gap-2">
        {isSpeechSupported() && (
          <button
            type="button"
            onClick={() => speak(token.hanzi)}
            className="rounded-full bg-yellow-400 px-4 py-2 text-sm font-semibold"
          >
            Putar
          </button>
        )}
        <button
          type="button"
          disabled={alreadySaved}
          onClick={() =>
            addVocabEntry({
              hanzi: token.hanzi,
              pinyin: token.pinyin,
              gloss: token.gloss_id,
              sourceSentence,
            })
          }
          className="rounded-full bg-gray-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {alreadySaved ? 'Sudah ditambahkan' : 'Tambahkan'}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Run the test and confirm it passes**

Run: `npm test`
Expected: PASS — all `LookupPopup` tests pass, full suite still green. If a Floating UI internal still errors on a missing browser API, add the minimal matching stub to `vitest.setup.ts` following the same pattern as `ResizeObserverStub`.

- [ ] **Step 6: Commit**

```bash
git add vitest.setup.ts src/components/LookupPopup.tsx src/components/LookupPopup.test.tsx
git commit -m "feat: add LookupPopup with gloss display, audio, and vocab save"
```

---

### Task 8: Reader + ParagraphActions

**Files:**
- Create: `src/lib/tokenId.ts`
- Test: `src/lib/tokenId.test.ts`
- Create: `src/components/ParagraphActions.tsx`
- Test: `src/components/ParagraphActions.test.tsx`
- Create: `src/components/Reader.tsx`
- Test: `src/components/Reader.test.tsx`

**Interfaces:**
- Consumes: `Chapter`, `Token` from `src/types.ts`; `chapter1.json` from Task 2; `useReaderStore` from Task 3; `WordToken` from Task 6; `LookupPopup` from Task 7.
- Produces: `parseTokenId(tokenId): { sentenceId, tokenIndex }`, `findToken(chapter, tokenId): Token | undefined`, `findSentenceText(chapter, tokenId): string | undefined` from `tokenId.ts`; `ParagraphActions({ translation: string })`; `Reader()` — the main screen, mounted by `App` in Task 10.

- [ ] **Step 1: Write the failing tokenId test**

`src/lib/tokenId.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { findSentenceText, findToken, parseTokenId } from './tokenId';
import type { Chapter } from '../types';

const chapter: Chapter = {
  title: 't',
  chapterLabel: 'c',
  paragraphs: [
    {
      id: 'p1',
      translation_id: 'x',
      sentences: [
        {
          id: 'p1s1',
          tokens: [
            { hanzi: '这', pinyin: 'zhè', pos: 'pron', hsk: 1, gloss_id: 'ini' },
            { hanzi: '猫', pinyin: 'māo', pos: 'noun', hsk: 1, gloss_id: 'kucing' },
          ],
        },
      ],
    },
  ],
};

describe('tokenId helpers', () => {
  it('parses a composite token id into sentenceId and tokenIndex', () => {
    expect(parseTokenId('p1s1-1')).toEqual({ sentenceId: 'p1s1', tokenIndex: 1 });
  });

  it('finds the token at that position in the chapter', () => {
    expect(findToken(chapter, 'p1s1-1')?.hanzi).toBe('猫');
  });

  it('joins the sentence hanzi for the token id', () => {
    expect(findSentenceText(chapter, 'p1s1-0')).toBe('这猫');
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module './tokenId'`.

- [ ] **Step 3: Write tokenId.ts**

`src/lib/tokenId.ts`:
```ts
import type { Chapter, Token } from '../types';

export function parseTokenId(tokenId: string): { sentenceId: string; tokenIndex: number } {
  const lastDash = tokenId.lastIndexOf('-');
  return {
    sentenceId: tokenId.slice(0, lastDash),
    tokenIndex: Number(tokenId.slice(lastDash + 1)),
  };
}

export function findToken(chapter: Chapter, tokenId: string): Token | undefined {
  const { sentenceId, tokenIndex } = parseTokenId(tokenId);
  const sentence = chapter.paragraphs.flatMap((p) => p.sentences).find((s) => s.id === sentenceId);
  return sentence?.tokens[tokenIndex];
}

export function findSentenceText(chapter: Chapter, tokenId: string): string | undefined {
  const { sentenceId } = parseTokenId(tokenId);
  const sentence = chapter.paragraphs.flatMap((p) => p.sentences).find((s) => s.id === sentenceId);
  return sentence?.tokens.map((t) => t.hanzi).join('');
}
```

- [ ] **Step 4: Run the test and confirm it passes**

Run: `npm test`
Expected: PASS — all `tokenId` tests pass.

- [ ] **Step 5: Write the failing ParagraphActions test**

`src/components/ParagraphActions.test.tsx`:
```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ParagraphActions from './ParagraphActions';

describe('ParagraphActions', () => {
  it('reveals the translation only after clicking Terjemahkan', () => {
    render(<ParagraphActions translation="Dahulu, ada seorang petani." />);
    expect(screen.queryByText('Dahulu, ada seorang petani.')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Terjemahkan'));
    expect(screen.getByText('Dahulu, ada seorang petani.')).toBeInTheDocument();
  });
});
```

- [ ] **Step 6: Run the test and confirm it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module './ParagraphActions'`.

- [ ] **Step 7: Write ParagraphActions.tsx**

`src/components/ParagraphActions.tsx`:
```tsx
import { useState } from 'react';

interface ParagraphActionsProps {
  translation: string;
}

export default function ParagraphActions({ translation }: ParagraphActionsProps) {
  const [showTranslation, setShowTranslation] = useState(false);

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setShowTranslation((v) => !v)}
        className="rounded-full bg-yellow-400 px-4 py-2 text-sm font-semibold"
      >
        Terjemahkan
      </button>
      {showTranslation && <p className="mt-2 text-gray-700">{translation}</p>}
    </div>
  );
}
```

- [ ] **Step 8: Run the test and confirm it passes**

Run: `npm test`
Expected: PASS — `ParagraphActions` test passes.

- [ ] **Step 9: Write the failing Reader test**

`src/components/Reader.test.tsx`:
```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import Reader from './Reader';
import { useReaderStore } from '../store/readerStore';

const initialState = useReaderStore.getState();

describe('Reader', () => {
  beforeEach(() => {
    useReaderStore.setState(initialState, true);
    localStorage.clear();
  });

  it('renders the chapter label', () => {
    render(<Reader />);
    expect(screen.getByText('Bab 1')).toBeInTheDocument();
  });

  it('renders a Terjemahkan button per paragraph', () => {
    render(<Reader />);
    expect(screen.getAllByText('Terjemahkan').length).toBeGreaterThan(0);
  });

  it('opens the lookup popup for a tapped word', () => {
    render(<Reader />);
    fireEvent.click(screen.getByText('撞到'));
    expect(screen.getByText('menabrak')).toBeInTheDocument();
  });

  it('shows a hint instead of a blank screen when Chinese and translation are both hidden', () => {
    useReaderStore.getState().toggleChinese();
    render(<Reader />);
    expect(screen.getByText(/Tidak ada tampilan aktif/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 10: Run the test and confirm it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module './Reader'`.

- [ ] **Step 11: Write Reader.tsx**

`src/components/Reader.tsx`:
```tsx
import { useEffect, useState } from 'react';
import chapterData from '../data/chapter1.json';
import type { Chapter } from '../types';
import { useReaderStore } from '../store/readerStore';
import { findSentenceText, findToken } from '../lib/tokenId';
import WordToken from './WordToken';
import LookupPopup from './LookupPopup';
import ParagraphActions from './ParagraphActions';

const chapter = chapterData as Chapter;

export default function Reader() {
  const showChinese = useReaderStore((s) => s.showChinese);
  const showTranslation = useReaderStore((s) => s.showTranslation);
  const activeTokenId = useReaderStore((s) => s.activeTokenId);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!activeTokenId) {
      setAnchorEl(null);
      return;
    }
    setAnchorEl(document.querySelector<HTMLElement>(`[data-token-id="${activeTokenId}"]`));
  }, [activeTokenId]);

  if (!showChinese && !showTranslation) {
    return (
      <p className="p-4 text-center text-gray-400">
        Tidak ada tampilan aktif. Aktifkan teks Mandarin atau terjemahan dari toolbar.
      </p>
    );
  }

  const activeToken = activeTokenId ? findToken(chapter, activeTokenId) : undefined;
  const activeSentenceText = activeTokenId ? findSentenceText(chapter, activeTokenId) : undefined;

  return (
    <div className="p-4">
      <p className="text-sm text-gray-400">{chapter.chapterLabel}</p>
      <h1 className="mb-4 text-2xl font-bold">{chapter.title}</h1>
      {chapter.paragraphs.map((paragraph) => (
        <div key={paragraph.id} className="mb-6 leading-loose">
          {showChinese &&
            paragraph.sentences.map((sentence) => (
              <span key={sentence.id}>
                {sentence.tokens.map((token, index) => (
                  <WordToken key={`${sentence.id}-${index}`} token={token} tokenId={`${sentence.id}-${index}`} />
                ))}
              </span>
            ))}
          {showTranslation && <p className="mt-2 text-gray-700">{paragraph.translation_id}</p>}
          <ParagraphActions translation={paragraph.translation_id} />
        </div>
      ))}
      {activeToken && anchorEl && (
        <LookupPopup token={activeToken} anchorEl={anchorEl} sourceSentence={activeSentenceText ?? ''} />
      )}
    </div>
  );
}
```

- [ ] **Step 12: Run the test and confirm it passes**

Run: `npm test`
Expected: PASS — all `Reader` tests pass, full suite still green.

- [ ] **Step 13: Commit**

```bash
git add src/lib/tokenId.ts src/lib/tokenId.test.ts src/components/ParagraphActions.tsx src/components/ParagraphActions.test.tsx src/components/Reader.tsx src/components/Reader.test.tsx
git commit -m "feat: add Reader screen with tap-lookup wiring and paragraph translation reveal"
```

---

### Task 9: Toolbar Component

**Files:**
- Create: `src/components/Toolbar.tsx`
- Test: `src/components/Toolbar.test.tsx`

**Interfaces:**
- Consumes: `useReaderStore` from Task 3; `speak` from Task 5's `tts.ts`; `chapter1.json` and `Chapter` type.
- Produces: `Toolbar()`, mounted by `App` in Task 10 alongside `Reader`.

- [ ] **Step 1: Write the failing test**

`src/components/Toolbar.test.tsx`:
```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Toolbar from './Toolbar';
import { useReaderStore } from '../store/readerStore';
import * as tts from '../lib/tts';

const initialState = useReaderStore.getState();

describe('Toolbar', () => {
  beforeEach(() => {
    useReaderStore.setState(initialState, true);
  });

  it('toggles Chinese visibility', () => {
    render(<Toolbar />);
    const button = screen.getByText('汉');
    expect(useReaderStore.getState().showChinese).toBe(true);
    fireEvent.click(button);
    expect(useReaderStore.getState().showChinese).toBe(false);
  });

  it('switches color mode label between Jenis kata and Level HSK', () => {
    render(<Toolbar />);
    fireEvent.click(screen.getByText('Warna: Jenis kata'));
    expect(screen.getByText('Warna: Level HSK')).toBeInTheDocument();
  });

  it('reads each sentence aloud in order on a delay', () => {
    vi.useFakeTimers();
    const speakSpy = vi.spyOn(tts, 'speak').mockImplementation(() => {});
    render(<Toolbar />);
    fireEvent.click(screen.getByText('▶ Baca'));

    expect(speakSpy).not.toHaveBeenCalled();
    vi.advanceTimersByTime(0);
    expect(speakSpy).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(3000);
    expect(speakSpy).toHaveBeenCalledTimes(2);

    vi.useRealTimers();
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module './Toolbar'`.

- [ ] **Step 3: Write Toolbar.tsx**

`src/components/Toolbar.tsx`:
```tsx
import chapterData from '../data/chapter1.json';
import type { Chapter } from '../types';
import { useReaderStore } from '../store/readerStore';
import * as tts from '../lib/tts';

const chapter = chapterData as Chapter;

export default function Toolbar() {
  const showChinese = useReaderStore((s) => s.showChinese);
  const showPinyin = useReaderStore((s) => s.showPinyin);
  const showTranslation = useReaderStore((s) => s.showTranslation);
  const colorMode = useReaderStore((s) => s.colorMode);
  const toggleChinese = useReaderStore((s) => s.toggleChinese);
  const togglePinyin = useReaderStore((s) => s.togglePinyin);
  const toggleTranslation = useReaderStore((s) => s.toggleTranslation);
  const setColorMode = useReaderStore((s) => s.setColorMode);

  function readChapterAloud() {
    const sentences = chapter.paragraphs.flatMap((p) => p.sentences);
    sentences.forEach((sentence, index) => {
      const text = sentence.tokens.map((t) => t.hanzi).join('');
      setTimeout(() => tts.speak(text), index * 3000);
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 p-2">
      <button
        type="button"
        aria-pressed={showChinese}
        onClick={toggleChinese}
        className="rounded px-3 py-1 text-sm font-semibold aria-pressed:bg-gray-900 aria-pressed:text-white"
      >
        汉
      </button>
      <button
        type="button"
        aria-pressed={showPinyin}
        onClick={togglePinyin}
        className="rounded px-3 py-1 text-sm font-semibold aria-pressed:bg-gray-900 aria-pressed:text-white"
      >
        拼音
      </button>
      <button
        type="button"
        aria-pressed={showTranslation}
        onClick={toggleTranslation}
        className="rounded px-3 py-1 text-sm font-semibold aria-pressed:bg-gray-900 aria-pressed:text-white"
      >
        Terjemahan
      </button>
      <button
        type="button"
        onClick={() => setColorMode(colorMode === 'pos' ? 'hsk' : 'pos')}
        className="rounded px-3 py-1 text-sm font-semibold"
      >
        Warna: {colorMode === 'pos' ? 'Jenis kata' : 'Level HSK'}
      </button>
      <button
        type="button"
        onClick={readChapterAloud}
        className="rounded bg-yellow-400 px-3 py-1 text-sm font-semibold"
      >
        ▶ Baca
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Run the test and confirm it passes**

Run: `npm test`
Expected: PASS — all `Toolbar` tests pass, full suite still green.

- [ ] **Step 5: Commit**

```bash
git add src/components/Toolbar.tsx src/components/Toolbar.test.tsx
git commit -m "feat: add Toolbar with visibility toggles, color-mode switch, and read-aloud"
```

---

### Task 10: App Wiring + Manual Verification

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`

**Interfaces:**
- Consumes: `Toolbar` from Task 9, `Reader` from Task 8.
- Produces: the final mounted app — no further consumers.

- [ ] **Step 1: Write the failing test for the final App composition**

`src/App.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from './App';

describe('App', () => {
  it('renders the chapter label and the toolbar', () => {
    render(<App />);
    expect(screen.getByText('Bab 1')).toBeInTheDocument();
    expect(screen.getByText('汉')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `npm test`
Expected: FAIL — `Unable to find an element with the text: Bab 1` (current `App.tsx` only renders a static title).

- [ ] **Step 3: Wire Toolbar and Reader into App.tsx**

`src/App.tsx`:
```tsx
import Toolbar from './components/Toolbar';
import Reader from './components/Reader';

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Toolbar />
      <Reader />
    </div>
  );
}
```

- [ ] **Step 4: Run the test and confirm it passes**

Run: `npm test`
Expected: PASS — `App` test passes.

- [ ] **Step 5: Run the full test suite**

Run: `npm test`
Expected: PASS — every test file from Tasks 1–10 passes.

- [ ] **Step 6: Manual verification in a real browser**

Run: `npm run dev`, then open the app (mobile-width viewport) and check:
- Tapping 撞到 (or any non-punctuation word) opens the popup anchored under that word, showing hanzi/pinyin/gloss.
- Putar plays audio (if the browser supports `speechSynthesis`); the button is absent otherwise.
- Tambahkan saves the word and the label flips to "Sudah ditambahkan"; reloading the page and reopening the same word's popup shows it's still marked saved (localStorage persisted).
- 汉 / 拼音 / Terjemahan toolbar buttons independently toggle Chinese text, pinyin, and paragraph translation.
- Toggling both 汉 and Terjemahan off shows the "Tidak ada tampilan aktif" hint instead of a blank page.
- The color-mode button switches underline colors between POS categories and HSK levels.
- ▶ Baca speaks each sentence in turn.

- [ ] **Step 7: Commit**

```bash
git add src/App.tsx src/App.test.tsx
git commit -m "feat: wire Toolbar and Reader into App"
```
