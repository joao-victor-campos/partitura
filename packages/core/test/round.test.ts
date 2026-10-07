import { describe, expect, it } from 'vitest';
import type { Question } from '../src/training/exercise';
import { advance, answerQuestion, averageMs, remainingMs, startRound, tick } from '../src/training/round';

const question = (step: 'C' | 'D'): Question => ({
  kind: 'note-reading', itemKey: `nr:treble:${step}5`, clef: 'treble', layout: 'single',
  pitch: { step, octave: 5, alter: 0 }, answerMode: 'name',
});

describe('count rounds', () => {
  it('asks, gives feedback, advances and finishes after the last question', () => {
    let s = startRound({ kind: 'count', total: 2 }, question('D'), 1000);
    expect(s.status).toBe('asking');

    const first = answerQuestion(s, { kind: 'step', step: 'D' }, 2500);
    expect(first.correct).toBe(true);
    expect(first.ms).toBe(1500);
    s = first.state;
    expect(s.status).toBe('feedback');
    expect(s.answered).toBe(1);

    s = advance(s, 3000, () => question('C'));
    expect(s.status).toBe('asking');
    expect(s.question.itemKey).toBe('nr:treble:C5');
    expect(s.last).toBeNull();

    s = answerQuestion(s, { kind: 'step', step: 'E' }, 5000).state;
    expect(s.last).toEqual({ answer: { kind: 'step', step: 'E' }, correct: false });

    s = advance(s, 5100, () => { throw new Error('must not ask again'); });
    expect(s.status).toBe('finished');
    expect(s.correct).toBe(1);
    expect(averageMs(s)).toBe(1750);
  });

  it('refuses a second answer to the same question', () => {
    const s = answerQuestion(startRound({ kind: 'count', total: 2 }, question('D'), 0), { kind: 'step', step: 'D' }, 10).state;
    expect(() => answerQuestion(s, { kind: 'step', step: 'D' }, 20)).toThrow();
  });
});

describe('timed rounds', () => {
  it('finishes on a tick once time is up', () => {
    const s = startRound({ kind: 'timed', durationMs: 60_000 }, question('D'), 0);
    expect(tick(s, 59_999)).toBe(s);
    expect(remainingMs(s, 59_000)).toBe(1000);
    const done = tick(s, 60_000);
    expect(done.status).toBe('finished');
    expect(done.answered).toBe(0);
  });

  it('finishes instead of advancing when time ran out during feedback', () => {
    let s = startRound({ kind: 'timed', durationMs: 1000 }, question('D'), 0);
    s = answerQuestion(s, { kind: 'step', step: 'D' }, 900).state;
    expect(advance(s, 1200, () => question('C')).status).toBe('finished');
  });

  it('has no remaining time in count mode', () => {
    expect(remainingMs(startRound({ kind: 'count', total: 20 }, question('D'), 0), 5)).toBeNull();
  });
});
