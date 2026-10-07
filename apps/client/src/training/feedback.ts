import { lengthInWholes, midiNumber, type Question } from '@partitura/core';
import { pitchLabel, symbolLabel } from '../i18n/format';

const SECONDS_PER_QUARTER = 60 / 90;
/** Si4, the middle line of clave de Sol: where note-value symbols are drawn. */
const VALUE_PITCH = 71;

export function correctAnswerLabel(q: Question): string {
  if (q.kind === 'note-reading') return pitchLabel(q.pitch);
  if (q.type === 'relation') return String(q.options[q.correctIndex]);
  return symbolLabel(q.symbol);
}

/** What to play after a wrong answer: the note itself, or a note as long as the asked value. */
export function feedbackSound(q: Question): { midi: number; seconds: number } | null {
  if (q.kind === 'note-reading') return { midi: midiNumber(q.pitch), seconds: 1 };
  if (q.type === 'relation' || q.symbol.rest) return null;
  return { midi: VALUE_PITCH, seconds: lengthInWholes(q.symbol) * 4 * SECONDS_PER_QUARTER };
}
