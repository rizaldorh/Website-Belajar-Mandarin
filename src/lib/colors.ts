import type { ColorMode, Token } from '../types';

type Palette = 'default' | 'colorblind' | 'off';

const POS_UNDERLINE_CLASSES: Record<Token['pos'], string> = {
  noun:     'border-pos-noun',
  verb:     'border-pos-verb',
  adj:      'border-pos-adj',
  adv:      'border-pos-adv',
  pron:     'border-pos-pron',
  propn:    'border-pos-propn',
  particle: 'border-pos-particle',
  numeral:  'border-pos-numeral',
  function: 'border-pos-function',
  punct:    'border-transparent',
};

const POS_CB_CLASSES: Record<Token['pos'], string> = {
  noun:     'border-pos-cb-noun',
  verb:     'border-pos-cb-verb',
  adj:      'border-pos-cb-adj',
  adv:      'border-pos-cb-adv',
  pron:     'border-pos-cb-pron',
  propn:    'border-pos-cb-propn',
  particle: 'border-pos-cb-particle',
  numeral:  'border-pos-cb-numeral',
  function: 'border-pos-cb-function',
  punct:    'border-transparent',
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

export function getUnderlineClass(token: Token, mode: ColorMode, palette: Palette = 'default'): string {
  if (token.pos === 'punct' || palette === 'off') return 'border-transparent';
  if (mode === 'hsk') {
    return HSK_UNDERLINE_CLASSES[token.hsk === null ? 'none' : String(token.hsk)];
  }
  return palette === 'colorblind' ? POS_CB_CLASSES[token.pos] : POS_UNDERLINE_CLASSES[token.pos];
}

// POS labels in Indonesian for the legend
export const POS_LABELS: Record<Token['pos'], string> = {
  noun:     'Kata benda',
  verb:     'Kata kerja',
  adj:      'Kata sifat',
  adv:      'Kata keterangan',
  pron:     'Kata ganti',
  propn:    'Nama diri',
  particle: 'Partikel',
  numeral:  'Numeralia',
  function: 'Kata fungsi',
  punct:    'Tanda baca',
};
