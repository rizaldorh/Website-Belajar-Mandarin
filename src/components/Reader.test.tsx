import { fireEvent, render, screen } from '@testing-library/react';
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
});
