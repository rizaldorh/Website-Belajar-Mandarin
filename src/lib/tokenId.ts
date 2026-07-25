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
