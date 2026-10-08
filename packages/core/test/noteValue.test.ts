import { describe, expect, it } from 'vitest';
import { denominator, lengthInWholes, symbolKey } from '../src/music/noteValue';

describe('note values', () => {
  it('maps values to MEI denominators', () => {
    expect(denominator('whole')).toBe(1);
    expect(denominator('quarter')).toBe(4);
    expect(denominator('sixty-fourth')).toBe(64);
  });

  it('measures lengths in whole notes, including dots', () => {
    expect(lengthInWholes({ value: 'half', rest: false, dotted: false })).toBe(0.5);
    expect(lengthInWholes({ value: 'half', rest: false, dotted: true })).toBe(0.75);
    expect(lengthInWholes({ value: 'eighth', rest: true, dotted: false })).toBe(0.125);
  });

  it('builds stable keys', () => {
    expect(symbolKey({ value: 'half', rest: true, dotted: false })).toBe('rest-half');
    expect(symbolKey({ value: 'quarter', rest: false, dotted: true })).toBe('dotted-quarter');
    expect(symbolKey({ value: 'whole', rest: false, dotted: false })).toBe('whole');
  });
});
