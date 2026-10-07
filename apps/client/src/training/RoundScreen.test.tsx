import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { seededRng, type ExerciseConfig } from '@partitura/core';
import { addAttempt, addRound, attemptsFor } from '../storage/db';
import { playMidi } from '../audio/piano';
import { RoundScreen } from './RoundScreen';

vi.mock('../storage/db', () => ({
  db: {},
  attemptsFor: vi.fn(async () => []),
  addAttempt: vi.fn(async () => undefined),
  addRound: vi.fn(async () => undefined),
}));
vi.mock('../audio/piano', () => ({ playMidi: vi.fn(async () => undefined), loadPiano: vi.fn() }));
vi.mock('../render/verovio', () => ({
  // Exposes the rendered note (e.g. "d5") so the test knows the right answer.
  renderMei: vi.fn(async (mei: string) => {
    const m = /pname="(\w)" oct="(\d)"/.exec(mei);
    return `<svg data-note="${m ? m[1] + m[2] : ''}"></svg>`;
  }),
}));

const LABEL: Record<string, string> = { c: 'Dó', d: 'Ré', e: 'Mi', f: 'Fá', g: 'Sol', a: 'Lá', b: 'Si' };
const config: ExerciseConfig = { exercise: 'note-reading', staves: 'treble', ledgerLines: 0, accidentals: false, answerMode: 'name' };

async function shownNote(previous: string | null): Promise<string> {
  let note = '';
  await waitFor(() => {
    note = screen.getByTestId('staff').querySelector('svg')?.getAttribute('data-note') ?? '';
    expect(note).not.toBe('');
    expect(note).not.toBe(previous);
  });
  return note;
}

describe('RoundScreen', () => {
  it('records each Attempt, explains wrong answers and finishes the Round', async () => {
    const onFinished = vi.fn();
    render(<RoundScreen config={config} levelId="nr-1" mode={{ kind: 'count', total: 2 }} onFinished={onFinished} onQuit={() => {}} rng={seededRng(3)} />);

    expect(await screen.findByText('1 de 2')).toBeInTheDocument();
    const first = await shownNote(null);
    fireEvent.click(screen.getByRole('button', { name: first[0] === 'c' ? 'Ré' : 'Dó' }));
    expect(screen.getByText(`Era ${LABEL[first[0]]}`)).toBeInTheDocument();
    expect(playMidi).toHaveBeenCalled();
    expect(addAttempt).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({ correct: false, roundId: expect.any(String) }));

    fireEvent.click(screen.getByRole('button', { name: 'Próxima' }));
    expect(await screen.findByText('2 de 2')).toBeInTheDocument();
    const second = await shownNote(first);
    fireEvent.click(screen.getByRole('button', { name: LABEL[second[0]] }));
    expect(screen.getByText('Certo!')).toBeInTheDocument();

    await waitFor(() => expect(onFinished).toHaveBeenCalledTimes(1));
    expect(onFinished.mock.calls[0][0]).toMatchObject({ exercise: 'note-reading', levelId: 'nr-1', answered: 2, correct: 1, speed: false });
    expect(addRound).toHaveBeenCalledTimes(1);
    expect(addAttempt).toHaveBeenCalledTimes(2);
  });

  describe('when things go wrong or props change', () => {
    afterEach(() => vi.restoreAllMocks());

    it('still shows the first question when past Attempts cannot be loaded', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      vi.mocked(attemptsFor).mockRejectedValueOnce(new Error('idb down'));
      render(<RoundScreen config={config} levelId={null} mode={{ kind: 'count', total: 2 }} onFinished={() => {}} onQuit={() => {}} rng={seededRng(3)} />);

      expect(await screen.findByText('1 de 2')).toBeInTheDocument();
      expect(await shownNote(null)).not.toBe('');
      expect(warn).toHaveBeenCalled();
    });

    it('still finishes the Round when saving it fails, and keeps going when an Attempt fails to save', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      vi.mocked(addRound).mockRejectedValueOnce(new Error('idb down'));
      vi.mocked(addAttempt).mockRejectedValueOnce(new Error('idb down'));
      const onFinished = vi.fn();
      render(<RoundScreen config={config} levelId={null} mode={{ kind: 'count', total: 1 }} onFinished={onFinished} onQuit={() => {}} rng={seededRng(3)} />);

      const note = await shownNote(null);
      fireEvent.click(screen.getByRole('button', { name: LABEL[note[0]] }));
      expect(screen.getByText('Certo!')).toBeInTheDocument();

      await waitFor(() => expect(onFinished).toHaveBeenCalledTimes(1));
      expect(onFinished.mock.calls[0][0]).toMatchObject({ answered: 1, correct: 1 });
      expect(warn).toHaveBeenCalledTimes(2);
    });

    it('does not reset the Round when the parent re-renders with new but equal props', async () => {
      const onFinished = vi.fn();
      const onQuit = () => {};
      const { rerender } = render(<RoundScreen config={{ ...config }} levelId="nr-1" mode={{ kind: 'count', total: 2 }} onFinished={onFinished} onQuit={onQuit} rng={seededRng(3)} />);

      const first = await shownNote(null);
      fireEvent.click(screen.getByRole('button', { name: first[0] === 'c' ? 'Ré' : 'Dó' }));
      fireEvent.click(screen.getByRole('button', { name: 'Próxima' }));
      expect(await screen.findByText('2 de 2')).toBeInTheDocument();
      const second = await shownNote(first);

      rerender(<RoundScreen config={{ ...config }} levelId="nr-1" mode={{ kind: 'count', total: 2 }} onFinished={onFinished} onQuit={onQuit} rng={seededRng(3)} />);
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(screen.getByText('2 de 2')).toBeInTheDocument();
      expect(await shownNote(first)).toBe(second);
      expect(onFinished).not.toHaveBeenCalled();
    });
  });
});
