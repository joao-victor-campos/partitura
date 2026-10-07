import { describe, expect, it } from 'vitest';
import { diatonicIndex, fromDiatonicIndex, isWhiteKey, midiNumber, pitchFromMidi, pitchKey } from '../src/music/pitch';

describe('pitch', () => {
  it('uses C4 = middle C = MIDI 60', () => {
    expect(midiNumber({ step: 'C', octave: 4, alter: 0 })).toBe(60);
    expect(midiNumber({ step: 'A', octave: 4, alter: 0 })).toBe(69);
    expect(midiNumber({ step: 'B', octave: 3, alter: -1 })).toBe(58);
    expect(midiNumber({ step: 'F', octave: 3, alter: 1 })).toBe(54);
  });

  it('round-trips diatonic indexes', () => {
    expect(diatonicIndex({ step: 'E', octave: 4, alter: 0 })).toBe(30);
    expect(fromDiatonicIndex(30)).toEqual({ step: 'E', octave: 4, alter: 0 });
    expect(fromDiatonicIndex(18)).toEqual({ step: 'G', octave: 2, alter: 0 });
    expect(fromDiatonicIndex(31, 1)).toEqual({ step: 'F', octave: 4, alter: 1 });
  });

  it('spells MIDI numbers with sharps', () => {
    expect(pitchFromMidi(61)).toEqual({ step: 'C', octave: 4, alter: 1 });
    expect(pitchFromMidi(59)).toEqual({ step: 'B', octave: 3, alter: 0 });
    expect(pitchFromMidi(21)).toEqual({ step: 'A', octave: 0, alter: 0 });
  });

  it('knows white keys', () => {
    expect(isWhiteKey(60)).toBe(true);
    expect(isWhiteKey(61)).toBe(false);
    expect(isWhiteKey(64)).toBe(true);
  });

  it('builds stable keys', () => {
    expect(pitchKey({ step: 'F', octave: 3, alter: 1 })).toBe('F#3');
    expect(pitchKey({ step: 'B', octave: 3, alter: -1 })).toBe('Bb3');
    expect(pitchKey({ step: 'C', octave: 4, alter: 0 })).toBe('C4');
  });
});
