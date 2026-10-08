import { fromDiatonicIndex, midiNumber, pitchKey, type Alter, type Pitch } from '../music/pitch';
import type { Answer } from './answer';

export type Clef = 'treble' | 'bass';
/** Which staff or staves a note-reading Exercise uses. "mixed" mixes single staves; "grand" shows both. */
export type StaffChoice = 'treble' | 'bass' | 'mixed' | 'grand';
export type LedgerLines = 0 | 1 | 2 | 3;
export type AnswerMode = 'name' | 'piano';

export interface NoteReadingSettings {
  staves: StaffChoice;
  ledgerLines: LedgerLines;
  accidentals: boolean;
}

export interface NoteReadingConfig extends NoteReadingSettings {
  exercise: 'note-reading';
  answerMode: AnswerMode;
}

export interface NoteReadingItem {
  itemKey: string;
  clef: Clef;
  pitch: Pitch;
}

export interface NoteReadingQuestion {
  kind: 'note-reading';
  itemKey: string;
  clef: Clef;
  layout: 'single' | 'grand';
  pitch: Pitch;
  answerMode: AnswerMode;
}

/** Diatonic indexes of the bottom and top staff lines: E4–F5 and G2–A3. */
const STAFF_LINES: Record<Clef, { bottom: number; top: number }> = {
  treble: { bottom: 30, top: 38 },
  bass: { bottom: 18, top: 26 },
};

/**
 * With 0 ledger lines: only the five lines and four spaces.
 * With n ≥ 1: also every note on the first n ledger lines, plus the note just beyond the nth.
 */
export function readableRange(clef: Clef, ledgerLines: LedgerLines): { low: number; high: number } {
  const { bottom, top } = STAFF_LINES[clef];
  const extra = ledgerLines === 0 ? 0 : 2 * ledgerLines + 1;
  return { low: bottom - extra, high: top + extra };
}

export function clefsFor(staves: StaffChoice): Clef[] {
  if (staves === 'treble') return ['treble'];
  if (staves === 'bass') return ['bass'];
  return ['treble', 'bass'];
}

/** Accidentals appear only when answering on the piano. */
export function usesAccidentals(config: NoteReadingConfig): boolean {
  return config.accidentals && config.answerMode === 'piano';
}

const NO_SHARP = new Set(['E', 'B']);
const NO_FLAT = new Set(['C', 'F']);

export function noteReadingPool(config: NoteReadingConfig): NoteReadingItem[] {
  const alters: Alter[] = usesAccidentals(config) ? [0, 1, -1] : [0];
  const items: NoteReadingItem[] = [];
  for (const clef of clefsFor(config.staves)) {
    const { low, high } = readableRange(clef, config.ledgerLines);
    for (let index = low; index <= high; index++) {
      for (const alter of alters) {
        const pitch = fromDiatonicIndex(index, alter);
        if (alter === 1 && NO_SHARP.has(pitch.step)) continue;
        if (alter === -1 && NO_FLAT.has(pitch.step)) continue;
        items.push({ itemKey: `nr:${clef}:${pitchKey(pitch)}`, clef, pitch });
      }
    }
  }
  return items;
}

export function toNoteReadingQuestion(item: NoteReadingItem, config: NoteReadingConfig): NoteReadingQuestion {
  return {
    kind: 'note-reading',
    itemKey: item.itemKey,
    clef: item.clef,
    layout: config.staves === 'grand' ? 'grand' : 'single',
    pitch: item.pitch,
    answerMode: config.answerMode,
  };
}

export function checkNoteReading(q: NoteReadingQuestion, a: Answer): boolean {
  if (q.answerMode === 'name') return a.kind === 'step' && a.step === q.pitch.step;
  return a.kind === 'midi' && a.midi === midiNumber(q.pitch);
}

/** The on-screen piano covers whole octaves (C to B) around every note the Exercise can ask. */
export function keyboardRange(config: NoteReadingConfig): { lowMidi: number; highMidi: number } {
  const midis = noteReadingPool(config).map((item) => midiNumber(item.pitch));
  const low = Math.min(...midis);
  const high = Math.max(...midis);
  return { lowMidi: low - (low % 12), highMidi: high + (11 - (high % 12)) };
}
