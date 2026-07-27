import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import WordToken from './WordToken';
import { useReaderStore } from '@/store/readerStore';

const initialState = useReaderStore.getState();

const punctToken = { hanzi: '，', pinyin: '', pos: 'punct' as const, hsk: null as null, gloss_id: '' };
const nounToken = { hanzi: '农夫', pinyin: 'nóng fū', pos: 'noun' as const, hsk: 4 as const, gloss_id: 'petani' };

beforeEach(() => {
  useReaderStore.setState(initialState, true);
});

describe('WordToken punctuation', () => {
  it('renders punctuation without a pinyin slot', () => {
    const { container } = render(<WordToken token={punctToken} tokenId="p1s1-1" />);
    expect(container.querySelector('[data-token-id]')).toBeNull();
    expect(container.textContent).toBe('，');
  });

  it('punctuation has negative margin class', () => {
    const { container } = render(<WordToken token={punctToken} tokenId="p1s1-1" />);
    const span = container.querySelector('span');
    expect(span?.className).toContain('-ml');
  });
});

describe('WordToken word highlight', () => {
  it('applies highlight ring when activeWordIndex matches tokenId', () => {
    useReaderStore.setState({ activeWordIndex: 'p1s1-2' });
    const { container } = render(<WordToken token={nounToken} tokenId="p1s1-2" />);
    const btn = container.querySelector('[data-token-id="p1s1-2"]');
    expect(btn?.className).toContain('outline');
  });

  it('no highlight ring when tokenId does not match', () => {
    useReaderStore.setState({ activeWordIndex: 'p1s1-99' });
    const { container } = render(<WordToken token={nounToken} tokenId="p1s1-2" />);
    const btn = container.querySelector('[data-token-id="p1s1-2"]');
    expect(btn?.className).not.toContain('outline-amber');
  });
});
