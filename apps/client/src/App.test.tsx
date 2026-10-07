import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';

const native = vi.hoisted(() => ({ listener: null as null | (() => void), exitApp: vi.fn() }));
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => true } }));
vi.mock('@capacitor/app', () => ({
  App: {
    addListener: vi.fn(async (_event: string, listener: () => void) => {
      native.listener = listener;
      return { remove: vi.fn() };
    }),
    exitApp: native.exitApp,
  },
}));
vi.mock('./storage/db', () => ({
  db: {},
  attemptsFor: vi.fn(async () => []),
  roundsFor: vi.fn(async () => []),
  addAttempt: vi.fn(async () => undefined),
  addRound: vi.fn(async () => undefined),
}));
vi.mock('./audio/piano', () => ({ loadPiano: vi.fn(async () => undefined), playMidi: vi.fn() }));
vi.mock('./render/verovio', () => ({ renderMei: vi.fn(async () => '<svg></svg>'), preloadNotation: vi.fn() }));

describe('App', () => {
  beforeEach(() => {
    native.listener = null;
    native.exitApp.mockClear();
  });

  it('goes from the training home to an Exercise setup and back', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Treino' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Leitura de notas/ }));
    expect(screen.getByRole('button', { name: 'Nível 1' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Voltar' }));
    expect(screen.getByRole('heading', { name: 'Treino' })).toBeInTheDocument();
  });

  describe('Android back button', () => {
    const pressBack = async () => {
      await waitFor(() => expect(native.listener).not.toBeNull());
      act(() => native.listener?.());
    };

    it('goes from a Round to the setup, then home, then closes the app', async () => {
      render(<App />);
      fireEvent.click(screen.getByRole('button', { name: /Leitura de notas/ }));
      fireEvent.click(screen.getByRole('button', { name: 'Começar' }));
      expect(await screen.findByRole('button', { name: 'Sair' })).toBeInTheDocument();

      await pressBack();
      expect(screen.getByRole('button', { name: 'Nível 1' })).toBeInTheDocument();
      expect(native.exitApp).not.toHaveBeenCalled();

      await pressBack();
      expect(screen.getByRole('heading', { name: 'Treino' })).toBeInTheDocument();
      expect(native.exitApp).not.toHaveBeenCalled();

      await pressBack();
      expect(native.exitApp).toHaveBeenCalledTimes(1);
    });

    it('goes from the progress screen to home', async () => {
      render(<App />);
      fireEvent.click(screen.getAllByRole('button', { name: 'Ver progresso' })[0]);
      expect(await screen.findByRole('heading', { name: /Progresso/ })).toBeInTheDocument();
      await pressBack();
      expect(screen.getByRole('heading', { name: 'Treino' })).toBeInTheDocument();
    });
  });
});
