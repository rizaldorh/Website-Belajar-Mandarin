import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import Reader from './Reader';
import { useReaderStore } from '../store/readerStore';

const initialState = useReaderStore.getState();

describe('Reader', () => {
  beforeEach(() => {
    useReaderStore.setState(initialState, true);
    localStorage.clear();
  });

  it('renders the chapter label', () => {
    render(<Reader />);
    expect(screen.getByText('Bab 1')).toBeInTheDocument();
  });

  it('renders a Terjemahkan button per paragraph', () => {
    render(<Reader />);
    expect(screen.getAllByText('Terjemahkan').length).toBeGreaterThan(0);
  });

  it('does not duplicate the translation and hides the per-paragraph button when the toolbar toggle is on', () => {
    useReaderStore.getState().toggleTranslation();
    render(<Reader />);
    expect(
      screen.getAllByText(
        'Dahulu, ada seorang petani yang sedang bertani di ladang. Suatu hari, seekor kelinci berlari sangat kencang, menabrak tunggul pohon di pinggir ladang, lalu mati. Petani itu sangat senang, memungut kelinci itu dan membawanya pulang. Sejak saat itu, dia setiap hari duduk di samping tunggul pohon, menunggu seekor kelinci lain muncul. Tetapi, dia tidak pernah lagi berhasil menunggu kelinci datang, dan tanaman di ladangnya pun jadi terbengkalai.'
      ).length
    ).toBe(1);
    expect(screen.queryByText('Terjemahkan')).not.toBeInTheDocument();
  });

  it('opens the lookup popup for a tapped word', () => {
    render(<Reader />);
    fireEvent.click(screen.getByText('撞到'));
    expect(screen.getByText('menabrak')).toBeInTheDocument();
  });

  it('shows a hint instead of a blank screen when Chinese and translation are both hidden', () => {
    useReaderStore.getState().toggleChinese();
    render(<Reader />);
    expect(screen.getByText(/Tidak ada tampilan aktif/)).toBeInTheDocument();
  });

  it('closes the popup when Chinese text is hidden while a token is active', () => {
    render(<Reader />);
    fireEvent.click(screen.getByText('撞到'));
    expect(screen.getByText('menabrak')).toBeInTheDocument();
    act(() => {
      useReaderStore.getState().toggleChinese();
    });
    expect(screen.queryByText('menabrak')).not.toBeInTheDocument();
    expect(useReaderStore.getState().activeTokenId).toBe(null);
  });
});
