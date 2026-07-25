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
