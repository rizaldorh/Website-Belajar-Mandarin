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
