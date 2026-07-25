import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import WordToken from './WordToken';
import { useReaderStore } from '../store/readerStore';
import type { Token } from '../types';

const initialState = useReaderStore.getState();

const nounToken: Token = { hanzi: '农夫', pinyin: 'nóng fū', pos: 'noun', hsk: 4, gloss_id: 'petani' };
const punctToken: Token = { hanzi: '。', pinyin: '', pos: 'punct', hsk: null, gloss_id: '' };

describe('WordToken', () => {
  beforeEach(() => {
    useReaderStore.setState(initialState, true);
  });

  it('renders hanzi and pinyin above it', () => {
    render(<WordToken token={nounToken} tokenId="p1s1-0" />);
    expect(screen.getByText('农夫')).toBeInTheDocument();
    expect(screen.getByText('nóng fū')).toBeInTheDocument();
  });

  it('hides pinyin when the pinyin toggle is off', () => {
    useReaderStore.getState().togglePinyin();
    render(<WordToken token={nounToken} tokenId="p1s1-0" />);
    expect(screen.queryByText('nóng fū')).not.toBeInTheDocument();
  });

  it('sets itself as the active token on click', () => {
    render(<WordToken token={nounToken} tokenId="p1s1-0" />);
    fireEvent.click(screen.getByText('农夫'));
    expect(useReaderStore.getState().activeTokenId).toBe('p1s1-0');
  });

  it('deselects on a second click', () => {
    render(<WordToken token={nounToken} tokenId="p1s1-0" />);
    fireEvent.click(screen.getByText('农夫'));
    fireEvent.click(screen.getByText('农夫'));
    expect(useReaderStore.getState().activeTokenId).toBeNull();
  });

  it('renders punctuation plainly, without pinyin or click handling', () => {
    render(<WordToken token={punctToken} tokenId="p1s1-1" />);
    fireEvent.click(screen.getByText('。'));
    expect(useReaderStore.getState().activeTokenId).toBeNull();
  });
});
