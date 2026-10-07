import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import App from './App';

vi.mock('./audio/piano', () => ({ loadPiano: vi.fn(async () => undefined), playMidi: vi.fn() }));
vi.mock('./render/verovio', () => ({ renderMei: vi.fn(async () => '<svg></svg>') }));

describe('App', () => {
  it('goes from the training home to an Exercise setup and back', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Treino' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Leitura de notas/ }));
    expect(screen.getByRole('button', { name: 'Nível 1' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Voltar' }));
    expect(screen.getByRole('heading', { name: 'Treino' })).toBeInTheDocument();
  });
});
