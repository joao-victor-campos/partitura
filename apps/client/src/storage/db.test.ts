import { describe, expect, it } from 'vitest';
import type { Attempt, RoundRecord } from '@partitura/core';
import { TrainingDb, addAttempt, addRound, attemptsFor, roundsFor } from './db';

const attempt = (id: string, exercise: Attempt['exercise'], answeredAt: string): Attempt => ({
  id, roundId: 'r1', exercise, itemKey: 'nr:treble:C5',
  question: { kind: 'note-reading', itemKey: 'nr:treble:C5', clef: 'treble', layout: 'single', pitch: { step: 'C', octave: 5, alter: 0 }, answerMode: 'name' },
  answer: { kind: 'step', step: 'C' }, correct: true, ms: 900, answeredAt,
});

const round = (id: string, finishedAt: string): RoundRecord => ({
  id, exercise: 'note-value', levelId: 'nv-1', answerMode: null, speed: false,
  startedAt: finishedAt, finishedAt, answered: 20, correct: 18, totalMs: 30_000,
});

describe('TrainingDb', () => {
  it('returns Attempts for one Exercise, oldest first', async () => {
    const db = new TrainingDb(`test-${crypto.randomUUID()}`);
    await addAttempt(db, attempt('b', 'note-reading', '2026-10-07T10:00:02.000Z'));
    await addAttempt(db, attempt('a', 'note-reading', '2026-10-07T10:00:01.000Z'));
    await addAttempt(db, attempt('c', 'note-value', '2026-10-07T10:00:00.000Z'));
    expect((await attemptsFor(db, 'note-reading')).map((x) => x.id)).toEqual(['a', 'b']);
  });

  it('refuses to overwrite an Attempt', async () => {
    const db = new TrainingDb(`test-${crypto.randomUUID()}`);
    await addAttempt(db, attempt('a', 'note-reading', '2026-10-07T10:00:01.000Z'));
    await expect(addAttempt(db, attempt('a', 'note-reading', '2026-10-07T10:00:09.000Z'))).rejects.toThrow();
  });

  it('returns Rounds for one Exercise, oldest first', async () => {
    const db = new TrainingDb(`test-${crypto.randomUUID()}`);
    await addRound(db, round('r2', '2026-10-07T11:00:00.000Z'));
    await addRound(db, round('r1', '2026-10-07T10:00:00.000Z'));
    expect((await roundsFor(db, 'note-value')).map((r) => r.id)).toEqual(['r1', 'r2']);
    expect(await roundsFor(db, 'note-reading')).toEqual([]);
  });
});
