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
