import type { Token } from '../types';
import { useReaderStore } from '../store/readerStore';
import { getUnderlineClass } from '../lib/colors';

interface WordTokenProps {
  token: Token;
  tokenId: string;
}

export default function WordToken({ token, tokenId }: WordTokenProps) {
  const showPinyin = useReaderStore((s) => s.showPinyin);
  const colorMode = useReaderStore((s) => s.colorMode);
  const activeTokenId = useReaderStore((s) => s.activeTokenId);
  const setActiveTokenId = useReaderStore((s) => s.setActiveTokenId);

  if (token.pos === 'punct') {
    return <span className="text-4xl">{token.hanzi}</span>;
  }

  const underlineClass = getUnderlineClass(token, colorMode);
  const isActive = activeTokenId === tokenId;

  return (
    <span
      role="button"
      data-token-id={tokenId}
      aria-pressed={isActive}
      onClick={() => setActiveTokenId(isActive ? null : tokenId)}
      className="inline-flex cursor-pointer select-none flex-col items-center mx-1"
    >
      {showPinyin && <span className="mb-0.5 text-xs text-gray-400">{token.pinyin}</span>}
      <span className={`rounded-sm border-b-4 px-0.5 text-4xl font-medium ${underlineClass}`}>
        {token.hanzi}
      </span>
    </span>
  );
}
