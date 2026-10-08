import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_ROUND, SPEED_ROUND } from '@partitura/core';
import { SetupScreen } from './SetupScreen';

vi.mock('../render/verovio', () => ({ renderMei: vi.fn(async () => '<svg></svg>'), preloadNotation: vi.fn() }));
vi.mock('../audio/piano', () => ({ loadPiano: vi.fn(async () => undefined), playMidi: vi.fn() }));

describe('SetupScreen', () => {
  it('starts a note-reading Level with the chosen answer mode', () => {
    const onStart = vi.fn();
    render(<SetupScreen exercise="note-reading" onStart={onStart} onBack={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Nível 3' }));
    fireEvent.click(screen.getByRole('button', { name: 'Teclado' }));
    fireEvent.click(screen.getByRole('button', { name: 'Começar' }));
    expect(onStart).toHaveBeenCalledWith({
      config: { exercise: 'note-reading', answerMode: 'piano', staves: 'grand', ledgerLines: 0, accidentals: false },
      levelId: 'nr-3',
      mode: DEFAULT_ROUND,
    });
  });

  it('starts a speed Round', () => {
    const onStart = vi.fn();
    render(<SetupScreen exercise="note-value" onStart={onStart} onBack={() => {}} />);
    fireEvent.click(screen.getByLabelText('Modo velocidade (60 segundos)'));
    fireEvent.click(screen.getByRole('button', { name: 'Começar' }));
    expect(onStart.mock.calls[0][0]).toMatchObject({ levelId: 'nv-1', mode: SPEED_ROUND });
  });

  it('refuses a custom setup that cannot ask anything', () => {
    render(<SetupScreen exercise="note-value" onStart={() => {}} onBack={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Personalizado' }));
    for (const name of ['semibreve', 'mínima', 'semínima', 'colcheia']) fireEvent.click(screen.getByLabelText(name));
    expect(screen.getByRole('button', { name: 'Começar' })).toBeDisabled();
    expect(screen.getByText(/Escolha pelo menos uma figura/)).toBeInTheDocument();
  });

  it('allows accidentals only when answering on the piano', () => {
    render(<SetupScreen exercise="note-reading" onStart={() => {}} onBack={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Personalizado' }));
    expect(screen.getByLabelText(/Sustenidos e bemóis/)).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Teclado' }));
    expect(screen.getByLabelText(/Sustenidos e bemóis/)).toBeEnabled();
  });
});
