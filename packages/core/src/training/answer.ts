import type { Step } from '../music/pitch';

/** What the user gave: a Pitch name, a piano key, or the index of a multiple-choice option. */
export type Answer =
  | { kind: 'step'; step: Step }
  | { kind: 'midi'; midi: number }
  | { kind: 'option'; index: number };
