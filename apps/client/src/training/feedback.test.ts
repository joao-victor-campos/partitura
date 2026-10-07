import { describe, expect, it } from 'vitest';
import type { Question } from '@partitura/core';
import { correctAnswerLabel, feedbackSound } from './feedback';

const reading: Question = {
  kind: 'note-reading', itemKey: 'nr:bass:F#3', clef: 'bass', layout: 'single',
  pitch: { step: 'F', octave: 3, alter: 1 }, answerMode: 'piano',
};
const quarter = { value: 'quarter' as const, rest: false, dotted: false };
const symbol: Question = {
  kind: 'note-value', type: 'symbol-to-name', itemKey: 'nv:symbol-to-name:quarter', symbol: quarter,
  options: [quarter, { value: 'half', rest: false, dotted: false }], correctIndex: 0,
};
const relation: Question = {
  kind: 'note-value', type: 'relation', itemKey: 'nv:relation:half/quarter',
  whole: { value: 'half', rest: false, dotted: false }, part: quarter, options: [4, 2, 1, 3], correctIndex: 1,
};

describe('feedback', () => {
  it('names the right answer without octave numbers', () => {
    expect(correctAnswerLabel(reading)).toBe('Fá♯');
    expect(correctAnswerLabel(symbol)).toBe('semínima');
    expect(correctAnswerLabel(relation)).toBe('2');
  });

  it('plays the asked note, or a note as long as the asked value at quarter = 90', () => {
    expect(feedbackSound(reading)).toEqual({ midi: 54, seconds: 1 });
    expect(feedbackSound(symbol)?.seconds).toBeCloseTo(60 / 90);
    expect(feedbackSound(relation)).toBeNull();
  });

  it('stays silent for rests', () => {
    const rest = { value: 'half' as const, rest: true, dotted: false };
    expect(feedbackSound({ ...symbol, symbol: rest, options: [rest] })).toBeNull();
  });
});
