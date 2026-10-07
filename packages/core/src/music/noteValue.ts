/** Ordered from longest to shortest. On screen: semibreve … semifusa. */
export const NOTE_VALUES = ['whole', 'half', 'quarter', 'eighth', 'sixteenth', 'thirty-second', 'sixty-fourth'] as const;
export type NoteValue = (typeof NOTE_VALUES)[number];

/** A written note or rest symbol, possibly dotted. */
export interface ValueSymbol {
  value: NoteValue;
  rest: boolean;
  dotted: boolean;
}

/** 1 for whole, 2 for half, 4 for quarter … (the number MEI writes as `dur`). */
export function denominator(value: NoteValue): number {
  return 2 ** NOTE_VALUES.indexOf(value);
}

export function lengthInWholes(s: ValueSymbol): number {
  return (s.dotted ? 1.5 : 1) / denominator(s.value);
}

export function symbolKey(s: ValueSymbol): string {
  return `${s.rest ? 'rest-' : ''}${s.dotted ? 'dotted-' : ''}${s.value}`;
}
