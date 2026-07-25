import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from './App';

describe('App', () => {
  it('renders the chapter label and the toolbar', () => {
    render(<App />);
    expect(screen.getByText('Bab 1')).toBeInTheDocument();
    expect(screen.getByText('汉')).toBeInTheDocument();
  });
});
