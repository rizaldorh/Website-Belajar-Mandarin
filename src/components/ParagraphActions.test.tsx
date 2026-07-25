import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ParagraphActions from './ParagraphActions';

describe('ParagraphActions', () => {
  it('reveals the translation only after clicking Terjemahkan', () => {
    render(<ParagraphActions translation="Dahulu, ada seorang petani." />);
    expect(screen.queryByText('Dahulu, ada seorang petani.')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Terjemahkan'));
    expect(screen.getByText('Dahulu, ada seorang petani.')).toBeInTheDocument();
  });
});
