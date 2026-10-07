import { describe, expect, it } from 'vitest';
import { pickWeighted, seededRng, shuffle } from '../src/random';

describe('random', () => {
  it('seededRng is deterministic and stays in [0, 1)', () => {
    const a = seededRng(42);
    const b = seededRng(42);
    const xs = Array.from({ length: 5 }, () => a());
    expect(Array.from({ length: 5 }, () => b())).toEqual(xs);
    for (const x of xs) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
  });

  it('pickWeighted never picks a zero-weight item', () => {
    const rng = seededRng(1);
    for (let i = 0; i < 200; i++) expect(pickWeighted(['a', 'b', 'c'], [1, 0, 1], rng)).not.toBe('b');
  });

  it('pickWeighted favours heavier items', () => {
    const rng = seededRng(7);
    let heavy = 0;
    for (let i = 0; i < 1000; i++) if (pickWeighted(['light', 'heavy'], [1, 9], rng) === 'heavy') heavy++;
    expect(heavy).toBeGreaterThan(800);
  });

  it('pickWeighted rejects an empty list', () => {
    expect(() => pickWeighted([], [], seededRng(1))).toThrow();
  });

  it('shuffle keeps every item', () => {
    expect(shuffle([1, 2, 3, 4, 5], seededRng(3)).sort()).toEqual([1, 2, 3, 4, 5]);
  });
});
