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
