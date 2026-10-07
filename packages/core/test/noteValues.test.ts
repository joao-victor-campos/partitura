import { describe, expect, it } from 'vitest';
import { symbolKey } from '../src/music/noteValue';
import { seededRng } from '../src/random';
import {
  checkNoteValue, noteValuePool, relationAnswer, symbolPool, toNoteValueQuestion,
  type NoteValueSettings,
} from '../src/training/noteValues';

const basic: NoteValueSettings = {
  values: ['whole', 'half', 'quarter', 'eighth'], types: ['symbol-to-name'], rests: false, dotted: false,
};

describe('symbolPool', () => {
  it('lists the chosen values', () => {
    expect(symbolPool(basic).map(symbolKey)).toEqual(['whole', 'half', 'quarter', 'eighth']);
  });

  it('adds dotted notes and rests when asked', () => {
    const pool = symbolPool({ ...basic, values: ['half', 'quarter'], rests: true, dotted: true });
    expect(pool.map(symbolKey)).toEqual(['half', 'dotted-half', 'rest-half', 'quarter', 'dotted-quarter', 'rest-quarter']);
  });

  it('never dots sixteenths or shorter', () => {
    expect(symbolPool({ ...basic, values: ['sixteenth'], dotted: true }).map(symbolKey)).toEqual(['sixteenth']);
  });
});

describe('noteValuePool', () => {
  it('builds one item per symbol and question type', () => {
    const pool = noteValuePool({ ...basic, types: ['symbol-to-name', 'name-to-symbol'] });
    expect(pool).toHaveLength(8);
    expect(pool[0].itemKey).toBe('nv:symbol-to-name:whole');
  });

  it('builds relations only where the answer is a whole number from 2 to 16', () => {
    const pool = noteValuePool({ ...basic, types: ['relation'] });
    expect(pool.map((i) => i.itemKey)).toEqual([
      'nv:relation:whole/half', 'nv:relation:whole/quarter', 'nv:relation:whole/eighth',
      'nv:relation:half/quarter', 'nv:relation:half/eighth', 'nv:relation:quarter/eighth',
    ]);
  });

  it('includes dotted relations such as "mínima pontuada = 3 semínimas"', () => {
    const pool = noteValuePool({ ...basic, types: ['relation'], dotted: true });
    expect(pool).toHaveLength(12);
    const item = pool.find((i) => i.itemKey === 'nv:relation:dotted-half/quarter');
    expect(item && item.type === 'relation' && relationAnswer(item.whole, item.part)).toBe(3);
  });

  it('is empty when nothing can be asked', () => {
    expect(noteValuePool({ ...basic, values: [] })).toHaveLength(0);
    expect(noteValuePool({ ...basic, values: ['whole'], types: ['relation'] })).toHaveLength(0);
  });
});

describe('toNoteValueQuestion', () => {
  it('offers four distinct symbols including the right one', () => {
    const [item] = noteValuePool(basic);
    const q = toNoteValueQuestion(item, basic, seededRng(5));
    if (q.type === 'relation') throw new Error('expected a symbol question');
    expect(q.options).toHaveLength(4);
    expect(new Set(q.options.map(symbolKey)).size).toBe(4);
    expect(symbolKey(q.options[q.correctIndex])).toBe(symbolKey(q.symbol));
  });

  it('draws distractors of the same kind (rest vs note) when there are enough', () => {
    const settings = { ...basic, rests: true };
    const item = noteValuePool(settings).find((i) => i.itemKey === 'nv:symbol-to-name:rest-half')!;
    const q = toNoteValueQuestion(item, settings, seededRng(9));
    if (q.type === 'relation') throw new Error('expected a symbol question');
    expect(q.options.every((s) => s.rest)).toBe(true);
  });

  it('offers four distinct numbers for a relation', () => {
    const settings = { ...basic, types: ['relation' as const] };
    for (const item of noteValuePool(settings)) {
      const q = toNoteValueQuestion(item, settings, seededRng(2));
      if (q.type !== 'relation') throw new Error('expected a relation');
      expect(q.options).toHaveLength(4);
      expect(new Set(q.options).size).toBe(4);
      expect(q.options[q.correctIndex]).toBe(relationAnswer(q.whole, q.part));
      expect(q.options.every((n) => Number.isInteger(n) && n >= 1)).toBe(true);
    }
  });

  it('checks answers by option index', () => {
    const [item] = noteValuePool(basic);
    const q = toNoteValueQuestion(item, basic, seededRng(1));
    expect(checkNoteValue(q, { kind: 'option', index: q.correctIndex })).toBe(true);
    expect(checkNoteValue(q, { kind: 'option', index: (q.correctIndex + 1) % 4 })).toBe(false);
    expect(checkNoteValue(q, { kind: 'step', step: 'C' })).toBe(false);
  });
});
