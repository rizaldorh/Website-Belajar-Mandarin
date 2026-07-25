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
