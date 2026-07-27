'use client';

import { useState } from 'react';
import { useReaderStore } from '@/store/readerStore';
import { POS_LABELS } from '@/lib/colors';
import type { Token } from '@/types';

const POS_SWATCH_CLASSES: Record<Token['pos'], { default: string; colorblind: string }> = {
  noun:     { default: 'bg-pos-noun',     colorblind: 'bg-pos-cb-noun' },
  verb:     { default: 'bg-pos-verb',     colorblind: 'bg-pos-cb-verb' },
  adj:      { default: 'bg-pos-adj',      colorblind: 'bg-pos-cb-adj' },
  adv:      { default: 'bg-pos-adv',      colorblind: 'bg-pos-cb-adv' },
  pron:     { default: 'bg-pos-pron',     colorblind: 'bg-pos-cb-pron' },
  propn:    { default: 'bg-pos-propn',    colorblind: 'bg-pos-cb-propn' },
  particle: { default: 'bg-pos-particle', colorblind: 'bg-pos-cb-particle' },
  numeral:  { default: 'bg-pos-numeral',  colorblind: 'bg-pos-cb-numeral' },
  function: { default: 'bg-pos-function', colorblind: 'bg-pos-cb-function' },
  punct:    { default: 'bg-transparent',  colorblind: 'bg-transparent' },
};

const POS_KEYS = Object.keys(POS_LABELS).filter((k) => k !== 'punct') as Token['pos'][];

export default function ColorLegend() {
  const [open, setOpen] = useState(false);
  const colorPalette = useReaderStore((s) => s.colorPalette);
  const setColorPalette = useReaderStore((s) => s.setColorPalette);

  return (
    <div className="border-b bg-white px-4 py-2 text-sm">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 font-medium text-gray-600"
        aria-expanded={open}
      >
        <span>Legenda warna</span>
        <span>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="mt-2 space-y-2">
          <div className="flex gap-2">
            {(['default', 'colorblind', 'off'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setColorPalette(p)}
                className={`rounded px-2 py-1 text-xs ${
                  colorPalette === p
                    ? 'bg-gray-800 text-white'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                {p === 'default' ? 'Standar' : p === 'colorblind' ? 'Buta warna' : 'Mati'}
              </button>
            ))}
          </div>
          {colorPalette !== 'off' && (
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3">
              {POS_KEYS.map((pos) => (
                <div key={pos} className="flex items-center gap-2">
                  <span
                    className={`inline-block h-3 w-3 rounded-sm border-2 ${POS_SWATCH_CLASSES[pos][colorPalette]}`}
                  />
                  <span className="text-gray-700">{POS_LABELS[pos]}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
