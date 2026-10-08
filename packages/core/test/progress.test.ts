import { describe, expect, it } from 'vitest';
import type { Attempt } from '../src/training/attempt';
import type { Question } from '../src/training/exercise';
import { recordAverageMs, suggestNextLevel, weakItems, type RoundRecord } from '../src/training/progress';

let seq = 0;
const q = (itemKey: string): Question => ({
  kind: 'note-reading', itemKey, clef: 'bass', layout: 'single', pitch: { step: 'A', octave: 2, alter: 0 }, answerMode: 'name',
});
const attempt = (itemKey: string, correct: boolean): Attempt => ({
  id: `a${seq++}`, roundId: 'r', exercise: 'note-reading', itemKey, question: q(itemKey),
  answer: { kind: 'step', step: 'C' }, correct, ms: 1000, answeredAt: `2026-10-07T10:00:${String(seq).padStart(2, '0')}.000Z`,
});
const round = (levelId: string | null, correct: number, minute: number): RoundRecord => ({
  id: `r${minute}`, exercise: 'note-reading', levelId, answerMode: 'name', speed: false,
  startedAt: `2026-10-07T10:${String(minute).padStart(2, '0')}:00.000Z`,
  finishedAt: `2026-10-07T10:${String(minute).padStart(2, '0')}:30.000Z`,
  answered: 20, correct, totalMs: 40_000,
});

describe('weakItems', () => {
  it('lists items below 80% with at least 3 attempts, worst first', () => {
    const attempts = [
      attempt('nr:bass:A2', false), attempt('nr:bass:A2', false), attempt('nr:bass:A2', true),
      attempt('nr:bass:B2', false), attempt('nr:bass:B2', true), attempt('nr:bass:B2', true), attempt('nr:bass:B2', true),
      attempt('nr:bass:C3', true), attempt('nr:bass:C3', true), attempt('nr:bass:C3', true),
      attempt('nr:bass:D3', false), attempt('nr:bass:D3', false),
    ];
    const weak = weakItems(attempts);
    expect(weak.map((w) => w.itemKey)).toEqual(['nr:bass:A2', 'nr:bass:B2']);
    expect(weak[0].accuracy).toBeCloseTo(1 / 3);
    expect(weak[0].question.itemKey).toBe('nr:bass:A2');
  });
});

describe('suggestNextLevel', () => {
  const order = ['nr-1', 'nr-2', 'nr-3'];

  it('suggests the next Level after 3 Rounds at 90% or better on the current Level', () => {
    expect(suggestNextLevel([round('nr-2', 18, 1), round('nr-2', 19, 2), round('nr-2', 20, 3)], order)).toBe('nr-3');
  });

  it('waits while any of the last 3 Rounds is below 90%', () => {
    expect(suggestNextLevel([round('nr-2', 17, 1), round('nr-2', 19, 2), round('nr-2', 20, 3)], order)).toBeNull();
  });

  it('waits until there are 3 Rounds', () => {
    expect(suggestNextLevel([round('nr-2', 20, 1), round('nr-2', 20, 2)], order)).toBeNull();
  });

  it('uses the most recently played Level and ignores custom Rounds', () => {
    const rounds = [round('nr-1', 20, 1), round('nr-1', 20, 2), round('nr-1', 20, 3), round('nr-2', 10, 4), round(null, 20, 5)];
    expect(suggestNextLevel(rounds, order)).toBeNull();
  });

  it('has nothing to suggest after the top Level', () => {
    expect(suggestNextLevel([round('nr-3', 20, 1), round('nr-3', 20, 2), round('nr-3', 20, 3)], order)).toBeNull();
  });
});

describe('recordAverageMs', () => {
  it('divides the total time by the answered questions', () => {
    expect(recordAverageMs({ ...round('nr-1', 10, 1), answered: 20, totalMs: 42_000 })).toBe(2100);
  });

  it('is 0 when nothing was answered', () => {
    expect(recordAverageMs({ ...round('nr-1', 0, 1), answered: 0, totalMs: 0 })).toBe(0);
  });
});
