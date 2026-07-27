import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ParagraphActions from './ParagraphActions';
import type { Sentence } from '@/types';

global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  json: async () => ({ explanation: 'Ini adalah penjelasan tata bahasa.' }),
});

const sentences: Sentence[] = [
  {
    id: 'p1s1',
    tokens: [
      { hanzi: '从前', pinyin: 'cóng qián', pos: 'adv', hsk: 3, gloss_id: 'dahulu' },
    ],
  },
];

describe('ParagraphActions', () => {
  it('shows Terjemahkan button by default', () => {
    render(
      <ParagraphActions
        translation="Dahulu kala"
        sentences={sentences}
      />,
    );
    expect(screen.getByText('Terjemahkan')).toBeInTheDocument();
  });

  it('toggles translation on click', () => {
    render(<ParagraphActions translation="Dahulu kala" sentences={sentences} />);
    fireEvent.click(screen.getByText('Terjemahkan'));
    expect(screen.getByText('Dahulu kala')).toBeInTheDocument();
  });

  it('shows Jelaskan button per sentence', () => {
    render(<ParagraphActions translation="Dahulu kala" sentences={sentences} />);
    expect(screen.getAllByText('Jelaskan').length).toBeGreaterThan(0);
  });

  it('calls /api/jelaskan on Jelaskan click and shows explanation', async () => {
    render(<ParagraphActions translation="Dahulu kala" sentences={sentences} />);
    fireEvent.click(screen.getAllByText('Jelaskan')[0]);
    await waitFor(() => {
      expect(screen.getByText('Ini adalah penjelasan tata bahasa.')).toBeInTheDocument();
    });
  });
});
