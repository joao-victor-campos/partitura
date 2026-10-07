import { NOTE_VALUES, lengthInWholes, symbolKey, type NoteValue, type ValueSymbol } from '../music/noteValue';
import { shuffle, type Rng } from '../random';
import type { Answer } from './answer';

export type NoteValueQuestionType = 'symbol-to-name' | 'name-to-symbol' | 'relation';

export interface NoteValueSettings {
  values: NoteValue[];
  types: NoteValueQuestionType[];
  rests: boolean;
  dotted: boolean;
}

export interface NoteValueConfig extends NoteValueSettings {
  exercise: 'note-value';
}

export type NoteValueItem =
  | { itemKey: string; type: 'symbol-to-name' | 'name-to-symbol'; symbol: ValueSymbol }
  | { itemKey: string; type: 'relation'; whole: ValueSymbol; part: ValueSymbol };

export type NoteValueQuestion =
  | {
      kind: 'note-value';
      type: 'symbol-to-name' | 'name-to-symbol';
      itemKey: string;
      symbol: ValueSymbol;
      options: ValueSymbol[];
      correctIndex: number;
    }
  | {
      kind: 'note-value';
      type: 'relation';
      itemKey: string;
      whole: ValueSymbol;
      part: ValueSymbol;
      options: number[];
      correctIndex: number;
    };

const DOTTABLE: ReadonlySet<NoteValue> = new Set<NoteValue>(['whole', 'half', 'quarter', 'eighth']);
const note = (value: NoteValue, dotted = false): ValueSymbol => ({ value, rest: false, dotted });

export function symbolPool(settings: NoteValueSettings): ValueSymbol[] {
  const out: ValueSymbol[] = [];
  for (const value of NOTE_VALUES) {
    if (!settings.values.includes(value)) continue;
    out.push(note(value));
    if (settings.dotted && DOTTABLE.has(value)) out.push(note(value, true));
    if (settings.rests) out.push({ value, rest: true, dotted: false });
  }
  return out;
}

/** "How many <part> fit in one <whole>?" */
export function relationAnswer(whole: ValueSymbol, part: ValueSymbol): number {
  return lengthInWholes(whole) / lengthInWholes(part);
}

export function noteValuePool(settings: NoteValueSettings): NoteValueItem[] {
  const symbols = symbolPool(settings);
  const items: NoteValueItem[] = [];
  for (const type of settings.types) {
    if (type === 'relation') {
      for (const whole of symbols.filter((s) => !s.rest)) {
        for (const value of NOTE_VALUES) {
          if (!settings.values.includes(value)) continue;
          const part = note(value);
          const answer = relationAnswer(whole, part);
          if (Number.isInteger(answer) && answer >= 2 && answer <= 16) {
            items.push({ itemKey: `nv:relation:${symbolKey(whole)}/${value}`, type, whole, part });
          }
        }
      }
    } else {
      for (const symbol of symbols) items.push({ itemKey: `nv:${type}:${symbolKey(symbol)}`, type, symbol });
    }
  }
  return items;
}

function relationDistractors(answer: number): number[] {
  const out: number[] = [];
  for (const candidate of [answer * 2, answer / 2, answer + 1, answer - 1, answer + 2]) {
    if (out.length < 3 && Number.isInteger(candidate) && candidate >= 1 && candidate !== answer && !out.includes(candidate)) {
      out.push(candidate);
    }
  }
  return out;
}

export function toNoteValueQuestion(item: NoteValueItem, settings: NoteValueSettings, rng: Rng): NoteValueQuestion {
  if (item.type === 'relation') {
    const answer = relationAnswer(item.whole, item.part);
    const options = shuffle([answer, ...relationDistractors(answer)], rng);
    return {
      kind: 'note-value', type: 'relation', itemKey: item.itemKey,
      whole: item.whole, part: item.part, options, correctIndex: options.indexOf(answer),
    };
  }
  const key = symbolKey(item.symbol);
  const others = symbolPool(settings).filter((s) => symbolKey(s) !== key);
  const sameKind = others.filter((s) => s.rest === item.symbol.rest);
  const distractors = shuffle(sameKind.length >= 3 ? sameKind : others, rng).slice(0, 3);
  const options = shuffle([item.symbol, ...distractors], rng);
  return {
    kind: 'note-value', type: item.type, itemKey: item.itemKey,
    symbol: item.symbol, options, correctIndex: options.findIndex((s) => symbolKey(s) === key),
  };
}

export function checkNoteValue(q: NoteValueQuestion, a: Answer): boolean {
  return a.kind === 'option' && a.index === q.correctIndex;
}
