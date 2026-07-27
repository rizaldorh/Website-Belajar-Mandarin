import { describe, expect, it } from 'vitest';
import { findSentenceText, findToken, parseTokenId } from './tokenId';
import type { ChapterContent } from '../types';

const chapter: ChapterContent = {
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
