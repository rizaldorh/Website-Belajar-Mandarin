import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { pinyin } from 'pinyin-pro';

const __dirname = dirname(fileURLToPath(import.meta.url));

export function annotateWithPinyin(chapter) {
  return {
    ...chapter,
    paragraphs: chapter.paragraphs.map((paragraph) => ({
      ...paragraph,
      sentences: paragraph.sentences.map((sentence) => ({
        ...sentence,
        tokens: sentence.tokens.map((token) => ({
          ...token,
          pinyin: token.pos === 'punct' ? '' : pinyin(token.hanzi),
        })),
      })),
    })),
  };
}

function main() {
  const sourcePath = join(__dirname, '../src/data/chapter1.source.json');
  const outputPath = join(__dirname, '../src/data/chapter1.json');
  const source = JSON.parse(readFileSync(sourcePath, 'utf-8'));
  const annotated = annotateWithPinyin(source);
  writeFileSync(outputPath, JSON.stringify(annotated, null, 2) + '\n', 'utf-8');
  console.log(`Wrote ${outputPath}`);
}

if (import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main();
}
