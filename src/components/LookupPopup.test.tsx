import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import LookupPopup from './LookupPopup';
import { useReaderStore } from '../store/readerStore';
import type { Token } from '../types';

const initialState = useReaderStore.getState();

const token: Token = { hanzi: '兔子', pinyin: 'tù zi', pos: 'noun', hsk: 4, gloss_id: 'kelinci' };

function renderPopup() {
  const anchor = document.createElement('span');
  document.body.appendChild(anchor);
  return render(<LookupPopup token={token} anchorEl={anchor} sourceSentence="一只兔子跑得很快" />);
}

describe('LookupPopup', () => {
  beforeEach(() => {
    useReaderStore.setState(initialState, true);
    localStorage.clear();
  });

  it('shows the hanzi, pinyin, and Indonesian gloss', () => {
    renderPopup();
    expect(screen.getByText('兔子')).toBeInTheDocument();
    expect(screen.getByText('tù zi')).toBeInTheDocument();
    expect(screen.getByText('kelinci')).toBeInTheDocument();
  });

  it('saves the word to vocab and flips the button label', () => {
    renderPopup();
    fireEvent.click(screen.getByText('Tambahkan'));
    expect(screen.getByText('Sudah ditambahkan')).toBeInTheDocument();
    expect(screen.getByText('Sudah ditambahkan')).toBeDisabled();
  });

  it('closes and clears activeTokenId when Escape is pressed', () => {
    useReaderStore.getState().setActiveTokenId('p1s2-3');
    renderPopup();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(useReaderStore.getState().activeTokenId).toBeNull();
  });

  it('resets the saved state when the popup is reused for a different token', () => {
    const anchor = document.createElement('span');
    document.body.appendChild(anchor);
    const otherToken: Token = { hanzi: '树桩', pinyin: 'shù zhuāng', pos: 'noun', hsk: null, gloss_id: 'tunggul pohon' };

    const { rerender } = render(<LookupPopup token={token} anchorEl={anchor} sourceSentence="一只兔子跑得很快" />);
    fireEvent.click(screen.getByText('Tambahkan'));
    expect(screen.getByText('Sudah ditambahkan')).toBeInTheDocument();

    rerender(<LookupPopup token={otherToken} anchorEl={anchor} sourceSentence="老教堂的屋顶" />);
    expect(screen.getByText('Tambahkan')).toBeInTheDocument();
    expect(screen.queryByText('Sudah ditambahkan')).not.toBeInTheDocument();
  });
});
