import { NOTE_VALUES, type NoteValue } from '../music/noteValue';
import type { ExerciseKind } from './exercise';
import type { NoteReadingSettings } from './noteReading';
import type { NoteValueQuestionType, NoteValueSettings } from './noteValues';

export interface Level<S> {
  id: string;
  number: number;
  settings: S;
}

export const NOTE_READING_LEVELS: Level<NoteReadingSettings>[] = [
  { id: 'nr-1', number: 1, settings: { staves: 'treble', ledgerLines: 0, accidentals: false } },
  { id: 'nr-2', number: 2, settings: { staves: 'bass', ledgerLines: 0, accidentals: false } },
  { id: 'nr-3', number: 3, settings: { staves: 'grand', ledgerLines: 0, accidentals: false } },
  { id: 'nr-4', number: 4, settings: { staves: 'grand', ledgerLines: 1, accidentals: false } },
  { id: 'nr-5', number: 5, settings: { staves: 'grand', ledgerLines: 2, accidentals: false } },
  { id: 'nr-6', number: 6, settings: { staves: 'grand', ledgerLines: 3, accidentals: true } },
];

const BASIC: NoteValue[] = ['whole', 'half', 'quarter', 'eighth'];
const WITH_SIXTEENTH: NoteValue[] = [...BASIC, 'sixteenth'];
const NAMING: NoteValueQuestionType[] = ['symbol-to-name', 'name-to-symbol'];
const ALL_TYPES: NoteValueQuestionType[] = [...NAMING, 'relation'];

export const NOTE_VALUE_LEVELS: Level<NoteValueSettings>[] = [
  { id: 'nv-1', number: 1, settings: { values: BASIC, types: ['symbol-to-name'], rests: false, dotted: false } },
  { id: 'nv-2', number: 2, settings: { values: WITH_SIXTEENTH, types: NAMING, rests: false, dotted: false } },
  { id: 'nv-3', number: 3, settings: { values: WITH_SIXTEENTH, types: NAMING, rests: true, dotted: false } },
  { id: 'nv-4', number: 4, settings: { values: WITH_SIXTEENTH, types: ALL_TYPES, rests: true, dotted: false } },
  { id: 'nv-5', number: 5, settings: { values: [...WITH_SIXTEENTH, 'thirty-second'], types: ALL_TYPES, rests: true, dotted: true } },
  { id: 'nv-6', number: 6, settings: { values: [...NOTE_VALUES], types: ALL_TYPES, rests: true, dotted: true } },
];

export function levelOrder(exercise: ExerciseKind): { id: string; number: number }[] {
  const levels: readonly { id: string; number: number }[] =
    exercise === 'note-reading' ? NOTE_READING_LEVELS : NOTE_VALUE_LEVELS;
  return levels.map(({ id, number }) => ({ id, number }));
}
