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
