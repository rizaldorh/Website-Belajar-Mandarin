import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ParagraphActions from './ParagraphActions';

describe('ParagraphActions', () => {
  it('shows Terjemahkan button by default', () => {
    render(<ParagraphActions translation="Dahulu kala" />);
    expect(screen.getByText('Terjemahkan')).toBeInTheDocument();
  });

  it('toggles translation on click', () => {
    render(<ParagraphActions translation="Dahulu kala" />);
    fireEvent.click(screen.getByText('Terjemahkan'));
    expect(screen.getByText('Dahulu kala')).toBeInTheDocument();
  });

  it('hides translation on second click', () => {
    render(<ParagraphActions translation="Dahulu kala" />);
    fireEvent.click(screen.getByText('Terjemahkan'));
    fireEvent.click(screen.getByText('Sembunyikan terjemahan'));
    expect(screen.queryByText('Dahulu kala')).not.toBeInTheDocument();
  });
});
