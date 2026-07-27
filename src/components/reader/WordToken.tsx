'use client';

import { useReaderStore } from '@/store/readerStore';
import { getUnderlineClass } from '@/lib/colors';
import type { Token } from '@/types';

interface Props {
  token: Token;
  tokenId: string;
}

export default function WordToken({ token, tokenId }: Props) {
  const colorMode = useReaderStore((s) => s.colorMode);
  const colorPalette = useReaderStore((s) => s.colorPalette);
  const activeTokenId = useReaderStore((s) => s.activeTokenId);
  const activeWordIndex = useReaderStore((s) => s.activeWordIndex);
  const setActiveTokenId = useReaderStore((s) => s.setActiveTokenId);
  const showPinyin = useReaderStore((s) => s.showPinyin);

  // Punctuation: attach to preceding word, no pinyin slot, no tap target
  if (token.pos === 'punct') {
    return (
      <span className="-ml-[0.1em] font-[var(--font-hanzi)] text-2xl sm:text-3xl">
        {token.hanzi}
      </span>
    );
  }

  const isActive = activeTokenId === tokenId;
  const isHighlighted = activeWordIndex === tokenId;
  const underlineClass = getUnderlineClass(token, colorMode, colorPalette);

  function handleClick() {
    setActiveTokenId(isActive ? null : tokenId);
  }

  return (
    <span
      role="button"
      data-token-id={tokenId}
      onClick={handleClick}
      className={`
        inline-flex cursor-pointer flex-col items-center px-[0.15em]
        rounded transition-all min-w-[44px] min-h-[44px] justify-center
        ${isHighlighted ? 'outline outline-2 outline-amber-400' : ''}
      `}
    >
      {showPinyin && (
        <span className="text-[0.6em] text-gray-400 leading-none mb-0.5">
          {token.pinyin}
        </span>
      )}
      <span
        className={`
          font-[var(--font-hanzi)] text-2xl sm:text-3xl leading-tight
          border-b-2 ${underlineClass}
        `}
      >
        {token.hanzi}
      </span>
    </span>
  );
}
