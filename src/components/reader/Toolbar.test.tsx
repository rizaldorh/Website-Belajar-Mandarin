import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Toolbar from './Toolbar';
import { useReaderStore } from '@/store/readerStore';

vi.mock('@/lib/tts', () => ({
  isSpeechSupported: () => true,
  speakWithHighlight: vi.fn(),
  buildCharOffsets: vi.fn(() => [0]),
  speak: vi.fn(),
}));

const mockChapter = {
  id: 'c1',
  book_id: 'b1',
  order_index: 1,
  title: 'Test',
  content_json: {
    paragraphs: [{
      id: 'p1',
      translation_id: 'Terjemahan',
      sentences: [{ id: 'p1s1', tokens: [{ hanzi: '你好', pinyin: 'nǐ hǎo', pos: 'verb' as const, hsk: 1 as const, gloss_id: 'halo' }] }],
    }],
  },
  word_count: 1,
  created_at: '',
};

describe('Toolbar speed control', () => {
  it('renders speed buttons', () => {
    render(<Toolbar chapter={mockChapter} />);
    expect(screen.getByText('0.5×')).toBeInTheDocument();
    expect(screen.getByText('0.75×')).toBeInTheDocument();
    expect(screen.getByText('1×')).toBeInTheDocument();
  });

  it('clicking speed button updates store', () => {
    render(<Toolbar chapter={mockChapter} />);
    fireEvent.click(screen.getByText('0.5×'));
    expect(useReaderStore.getState().playbackRate).toBe(0.5);
  });
});
