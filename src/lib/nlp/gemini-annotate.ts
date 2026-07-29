import { z } from 'zod';

const TokenSchema = z.object({
  hanzi:    z.string(),
  pinyin:   z.string(),
  pos:      z.enum(['noun','verb','adj','adv','pron','propn','particle','numeral','function','punct']),
  hsk:      z.union([z.number().int().min(1).max(6), z.null()]),
  gloss_id: z.string(),
});

const SentenceSchema = z.object({
  id:     z.string(),
  tokens: z.array(TokenSchema),
});

const ParagraphSchema = z.object({
  id:             z.string(),
  translation_id: z.string(),
  sentences:      z.array(SentenceSchema),
});

export const ChapterContentSchema = z.object({
  paragraphs: z.array(ParagraphSchema),
});

export type ChapterContent = z.infer<typeof ChapterContentSchema>;
