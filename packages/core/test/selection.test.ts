import { describe, expect, it } from 'vitest';
import { seededRng } from '../src/random';
import type { Attempt } from '../src/training/attempt';
import type { Question } from '../src/training/exercise';
import { itemStats, itemWeight, pickItem } from '../src/training/selection';

let seq = 0;
const attempt = (itemKey: string, correct: boolean, ms = 1000): Attempt => ({
  id: `a${seq++}`, roundId: 'r', exercise: 'note-reading', itemKey, question: {} as Question,
  answer: { kind: 'step', step: 'C' }, correct, ms, answeredAt: '2026-10-07T10:00:00.000Z',
});

describe('itemWeight', () => {
  it('gives unseen items a coverage bonus', () => expect(itemWeight(undefined)).toBe(2));
  it('gives mastered items the base weight', () => expect(itemWeight({ n: 5, wrong: 0, medianMs: 900 })).toBe(1));
  it('grows with the error rate', () => expect(itemWeight({ n: 4, wrong: 2, medianMs: 900 })).toBe(3));
  it('adds one for slow answers', () => expect(itemWeight({ n: 4, wrong: 0, medianMs: 3500 })).toBe(2));
});

describe('itemStats', () => {
  it('only looks at the 10 most recent attempts of an item', () => {
    const history = [
      ...Array.from({ length: 10 }, () => attempt('x', false)),
      ...Array.from({ length: 10 }, () => attempt('x', true, 500)),
    ];
    expect(itemStats(history).get('x')).toEqual({ n: 10, wrong: 0, medianMs: 500 });
  });
});

describe('pickItem', () => {
  const pool = [{ itemKey: 'a' }, { itemKey: 'b' }, { itemKey: 'c' }];

  it('never repeats the previous item when there is a choice', () => {
    const rng = seededRng(4);
    for (let i = 0; i < 100; i++) expect(pickItem(pool, [], 'b', rng).itemKey).not.toBe('b');
  });

  it('can repeat when the pool has one item', () => {
    expect(pickItem([{ itemKey: 'a' }], [], 'a', seededRng(1)).itemKey).toBe('a');
  });

  it('asks more often about items the user gets wrong', () => {
    const history = [
      ...Array.from({ length: 5 }, () => attempt('a', true)),
      ...Array.from({ length: 5 }, () => attempt('b', false)),
      ...Array.from({ length: 5 }, () => attempt('c', true)),
    ];
    const rng = seededRng(11);
    const counts: Record<string, number> = { a: 0, b: 0, c: 0 };
    for (let i = 0; i < 1000; i++) counts[pickItem(pool, history, null, rng).itemKey]++;
    expect(counts.b).toBeGreaterThan(600);
  });
});
