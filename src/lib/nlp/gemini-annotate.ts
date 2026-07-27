import { GoogleGenerativeAI } from '@google/generative-ai';
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

const SYSTEM_PROMPT = `You are a Chinese linguistics expert annotating text for Indonesian learners.
Given raw Chinese text, produce JSON with this exact structure:
{
  "paragraphs": [
    {
      "id": "p1",
      "translation_id": "<full Indonesian translation of this paragraph>",
      "sentences": [
        {
          "id": "p1s1",
          "tokens": [
            {
              "hanzi": "<word>",
              "pinyin": "<tone-marked pinyin, space-separated syllables>",
              "pos": "<one of: noun|verb|adj|adv|pron|propn|particle|numeral|function|punct>",
              "hsk": <1-6 or null>,
              "gloss_id": "<short Indonesian gloss for this word in context>"
            }
          ]
        }
      ]
    }
  ]
}

Rules:
- Split text into paragraphs on blank lines. Sentences end with 。！？.
- Every character must appear in exactly one token.
- Punctuation (，。！？；：) gets its own token with pos:"punct", pinyin:"", gloss_id:"".
- For polyphonic characters, choose the correct reading from context (e.g. 得→"de" as complement particle, 了→"le" as aspect marker).
- hsk: null if not in HSK 1–6.
- translation_id: natural Indonesian paragraph translation (not word-for-word).
- gloss_id: short Indonesian gloss (1–5 words) for this token in context.
- Paragraph IDs: p1, p2, …; sentence IDs: p1s1, p1s2, …`;

export async function annotateChapter(
  rawText: string,
  apiKey: string,
): Promise<ChapterContent> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    generationConfig: { responseMimeType: 'application/json' },
  });

  const result = await model.generateContent([
    { text: SYSTEM_PROMPT },
    { text: `Annotate this text:\n\n${rawText}` },
  ]);

  const raw = result.response.text();
  const parsed = JSON.parse(raw) as unknown;
  return ChapterContentSchema.parse(parsed);
}
