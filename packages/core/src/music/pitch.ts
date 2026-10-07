export const STEPS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as const;
export type Step = (typeof STEPS)[number];
export type Alter = -1 | 0 | 1;

/** A written pitch. Octaves use scientific numbering: C4 is middle C. */
export interface Pitch {
  step: Step;
  octave: number;
  alter: Alter;
}

const SEMITONE_OF_STEP: Record<Step, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const SHARP_SPELLING: ReadonlyArray<readonly [Step, Alter]> = [
  ['C', 0], ['C', 1], ['D', 0], ['D', 1], ['E', 0], ['F', 0],
  ['F', 1], ['G', 0], ['G', 1], ['A', 0], ['A', 1], ['B', 0],
];

/** Counts lines and spaces: each step up the staff is +1. */
export function diatonicIndex(p: Pitch): number {
  return p.octave * 7 + STEPS.indexOf(p.step);
}

export function fromDiatonicIndex(index: number, alter: Alter = 0): Pitch {
  const octave = Math.floor(index / 7);
  return { step: STEPS[index - octave * 7], octave, alter };
}

export function midiNumber(p: Pitch): number {
  return (p.octave + 1) * 12 + SEMITONE_OF_STEP[p.step] + p.alter;
}

export function pitchFromMidi(midi: number): Pitch {
  const octave = Math.floor(midi / 12) - 1;
  const [step, alter] = SHARP_SPELLING[midi - (octave + 1) * 12];
  return { step, octave, alter };
}

export function isWhiteKey(midi: number): boolean {
  return pitchFromMidi(midi).alter === 0;
}

export function pitchKey(p: Pitch): string {
  const accidental = p.alter === 1 ? '#' : p.alter === -1 ? 'b' : '';
  return `${p.step}${accidental}${p.octave}`;
}
