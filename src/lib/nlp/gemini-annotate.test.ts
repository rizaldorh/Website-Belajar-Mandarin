import { describe, it, expect } from 'vitest';
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
