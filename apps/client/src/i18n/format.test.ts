import { describe, expect, it } from 'vitest';
import { exerciseTitle, formatPercent, formatSeconds, pitchAriaLabel, pitchLabel, pluralValue, symbolLabel } from './format';

describe('format', () => {
  it('names pitches in solfège', () => {
    expect(pitchLabel({ step: 'C', octave: 4, alter: 0 })).toBe('Dó');
    expect(pitchLabel({ step: 'F', octave: 3, alter: 1 })).toBe('Fá♯');
    expect(pitchLabel({ step: 'B', octave: 3, alter: -1 })).toBe('Si♭');
    expect(pitchAriaLabel({ step: 'A', octave: 2, alter: 0 })).toBe('Lá 2');
  });

  it('names note values, rests and dotted values in Portuguese', () => {
    expect(symbolLabel({ value: 'quarter', rest: false, dotted: false })).toBe('semínima');
    expect(symbolLabel({ value: 'half', rest: true, dotted: false })).toBe('pausa de mínima');
    expect(symbolLabel({ value: 'quarter', rest: false, dotted: true })).toBe('semínima pontuada');
    expect(pluralValue('eighth')).toBe('colcheias');
  });

  it('titles each kind of Exercise', () => {
    expect(exerciseTitle('note-reading')).toBe('Leitura de notas');
    expect(exerciseTitle('note-value')).toBe('Figuras musicais');
  });

  it('formats numbers the Brazilian way', () => {
    expect(formatSeconds(2100)).toBe('2,1');
    expect(formatPercent(0.9)).toBe('90%');
  });
});
