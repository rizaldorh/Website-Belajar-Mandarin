import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import LookupPopup from './LookupPopup';

vi.mock('@/lib/db/vocab', () => ({
  addVocabEntry: vi.fn(),
  isVocabSaved: vi.fn().mockResolvedValue(false),
}));

const mockToken = {
  hanzi: '农夫',
  pinyin: 'nóng fū',
  pos: 'noun' as const,
  hsk: 4 as const,
  gloss_id: 'petani; buruh tani',
};
const mockAnchor = document.createElement('button');

describe('LookupPopup Cari', () => {
  it('shows Cari button', () => {
    render(<LookupPopup token={mockToken} anchorEl={mockAnchor} sourceSentence="农夫种地" />);
    expect(screen.getByText('Cari')).toBeInTheDocument();
  });

  it('Cari button expands gloss panel', () => {
    render(<LookupPopup token={mockToken} anchorEl={mockAnchor} sourceSentence="农夫种地" />);
    fireEvent.click(screen.getByText('Cari'));
    expect(screen.getAllByText(/petani/).length).toBeGreaterThanOrEqual(1);
  });
});
