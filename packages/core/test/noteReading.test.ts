import { describe, expect, it } from 'vitest';
import {
  checkNoteReading, keyboardRange, noteReadingPool, readableRange, toNoteReadingQuestion,
  type NoteReadingConfig,
} from '../src/training/noteReading';

const config = (over: Partial<NoteReadingConfig> = {}): NoteReadingConfig => ({
  exercise: 'note-reading', staves: 'treble', ledgerLines: 0, accidentals: false, answerMode: 'name', ...over,
});

describe('readableRange', () => {
  it('covers only the five lines and four spaces with no ledger lines', () => {
    expect(readableRange('treble', 0)).toEqual({ low: 30, high: 38 }); // E4–F5
    expect(readableRange('bass', 0)).toEqual({ low: 18, high: 26 }); // G2–A3
  });

  it('adds the notes on and just beyond each ledger line', () => {
    expect(readableRange('treble', 1)).toEqual({ low: 27, high: 41 }); // B3–B5
    expect(readableRange('bass', 1)).toEqual({ low: 15, high: 29 }); // D2–D4
    expect(readableRange('bass', 3)).toEqual({ low: 11, high: 33 });
  });
});

describe('noteReadingPool', () => {
  it('lists every natural note of the staff', () => {
    const pool = noteReadingPool(config());
    expect(pool).toHaveLength(9);
    expect(pool[0].itemKey).toBe('nr:treble:E4');
    expect(pool[8].itemKey).toBe('nr:treble:F5');
  });

  it('uses both clefs for mixed and grand staves', () => {
    expect(noteReadingPool(config({ staves: 'mixed' }))).toHaveLength(18);
    expect(noteReadingPool(config({ staves: 'grand' })).some((i) => i.clef === 'bass')).toBe(true);
  });

  it('ignores accidentals when answering by name', () => {
    expect(noteReadingPool(config({ accidentals: true }))).toHaveLength(9);
  });

  it('adds sharps and flats, but never E#, B#, Cb or Fb, when answering on the piano', () => {
    const pool = noteReadingPool(config({ accidentals: true, answerMode: 'piano' }));
    expect(pool).toHaveLength(21);
    const keys = pool.map((i) => i.itemKey);
    expect(keys).toContain('nr:treble:F#4');
    expect(keys).toContain('nr:treble:Bb4');
    expect(keys).not.toContain('nr:treble:E#4');
    expect(keys).not.toContain('nr:treble:Cb5');
  });
});

describe('questions and answers', () => {
  const d5 = { itemKey: 'nr:treble:D5', clef: 'treble' as const, pitch: { step: 'D' as const, octave: 5, alter: 0 as const } };

  it('uses the grand-staff layout only for grand staves', () => {
    expect(toNoteReadingQuestion(d5, config()).layout).toBe('single');
    expect(toNoteReadingQuestion(d5, config({ staves: 'grand' })).layout).toBe('grand');
  });

  it('ignores the octave when answering by name', () => {
    const q = toNoteReadingQuestion(d5, config());
    expect(checkNoteReading(q, { kind: 'step', step: 'D' })).toBe(true);
    expect(checkNoteReading(q, { kind: 'step', step: 'C' })).toBe(false);
    expect(checkNoteReading(q, { kind: 'midi', midi: 74 })).toBe(false);
  });

  it('requires the exact key when answering on the piano', () => {
    const q = toNoteReadingQuestion(d5, config({ answerMode: 'piano' }));
    expect(checkNoteReading(q, { kind: 'midi', midi: 74 })).toBe(true);
    expect(checkNoteReading(q, { kind: 'midi', midi: 62 })).toBe(false);
  });

  it('sizes the on-screen keyboard to whole octaves around the pool', () => {
    expect(keyboardRange(config({ answerMode: 'piano' }))).toEqual({ lowMidi: 60, highMidi: 83 });
  });
});
