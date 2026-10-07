import { describe, expect, it } from 'vitest';
import type { NoteReadingQuestion } from '@partitura/core';
import { noteReadingMei, pitchesMei, symbolMei } from './mei';

const question = (over: Partial<NoteReadingQuestion> = {}): NoteReadingQuestion => ({
  kind: 'note-reading', itemKey: 'nr:treble:D5', clef: 'treble', layout: 'single',
  pitch: { step: 'D', octave: 5, alter: 0 }, answerMode: 'name', ...over,
});

describe('MEI builders', () => {
  it('writes one note on a single treble staff', () => {
    const mei = noteReadingMei(question());
    expect(mei).toContain('<clef shape="G" line="2"/>');
    expect(mei).toContain('<note pname="d" oct="5" dur="1"/>');
    expect(mei).not.toContain('shape="F"');
  });

  it('writes accidentals', () => {
    expect(noteReadingMei(question({ pitch: { step: 'F', octave: 4, alter: 1 } }))).toContain('accid="s"');
    expect(noteReadingMei(question({ pitch: { step: 'B', octave: 4, alter: -1 } }))).toContain('accid="f"');
  });

  it('puts a bass note on the lower staff of a grand staff', () => {
    const mei = noteReadingMei(question({ clef: 'bass', layout: 'grand', pitch: { step: 'A', octave: 2, alter: 0 } }));
    expect(mei).toContain('symbol="brace"');
    expect(mei).toMatch(/<staff n="1"><layer n="1"><mSpace\/><\/layer><\/staff>/);
    expect(mei).toMatch(/<staff n="2"><layer n="1"><note pname="a" oct="2" dur="1"\/><\/layer><\/staff>/);
  });

  it('writes note-value symbols, rests and dots', () => {
    expect(symbolMei({ value: 'quarter', rest: false, dotted: false })).toContain('<note pname="b" oct="4" dur="4"/>');
    expect(symbolMei({ value: 'half', rest: true, dotted: false })).toContain('<rest dur="2"/>');
    expect(symbolMei({ value: 'half', rest: false, dotted: true })).toContain('dots="1"');
  });

  it('colours a row of notes, one per measure', () => {
    const mei = pitchesMei('bass', [{ step: 'A', octave: 2, alter: 0 }, { step: 'B', octave: 2, alter: 0 }], '#b3261e');
    expect(mei.match(/<measure /g)).toHaveLength(2);
    expect(mei).toContain('color="#b3261e"');
    expect(mei).toContain('shape="F"');
  });
});
