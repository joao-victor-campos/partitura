import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Attempt, RoundRecord } from '@partitura/core';
import { t } from '../i18n/pt-BR';
import { attemptsFor } from '../storage/db';
import { ProgressScreen } from './ProgressScreen';

const weakAttempt = (i: number): Attempt => ({
  id: `a${i}`, roundId: 'r', exercise: 'note-reading', itemKey: 'nr:bass:A2',
  question: { kind: 'note-reading', itemKey: 'nr:bass:A2', clef: 'bass', layout: 'single', pitch: { step: 'A', octave: 2, alter: 0 }, answerMode: 'name' },
  answer: { kind: 'step', step: 'C' }, correct: false, ms: 2000, answeredAt: `2026-10-07T10:00:0${i}.000Z`,
});
const goodRound = (i: number): RoundRecord => ({
  id: `r${i}`, exercise: 'note-reading', levelId: 'nr-2', answerMode: 'name', speed: false,
  startedAt: `2026-10-07T1${i}:00:00.000Z`, finishedAt: `2026-10-07T1${i}:01:00.000Z`, answered: 20, correct: 19, totalMs: 30_000,
});

vi.mock('../storage/db', () => ({
  db: {},
  attemptsFor: vi.fn(async () => [weakAttempt(1), weakAttempt(2), weakAttempt(3)]),
  roundsFor: vi.fn(async () => [goodRound(1), goodRound(2), goodRound(3)]),
}));
vi.mock('../render/verovio', () => ({ renderMei: vi.fn(async () => '<svg></svg>') }));

describe('ProgressScreen', () => {
  it('shows weak notes, the Level suggestion and recent Rounds', async () => {
    render(<ProgressScreen exercise="note-reading" onBack={() => {}} />);
    expect(await screen.findByText(/Lá \(clave de Fá\)/)).toBeInTheDocument();
    expect(screen.getByText(/Experimente o Nível 3/)).toBeInTheDocument();
    expect(screen.getAllByText(/19 de 20/)).toHaveLength(3);
    expect(screen.getByTestId('staff')).toBeInTheDocument();
  });

  it('still shows the screen, with empty data, when storage fails', async () => {
    vi.mocked(attemptsFor).mockRejectedValueOnce(new Error('storage down'));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    render(<ProgressScreen exercise="note-reading" onBack={() => {}} />);
    expect(await screen.findByRole('button', { name: 'Voltar' })).toBeInTheDocument();
    expect(screen.getByText(/Nada para reforçar ainda/)).toBeInTheDocument();
    expect(screen.getByText(t.progress.noRounds)).toBeInTheDocument();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
