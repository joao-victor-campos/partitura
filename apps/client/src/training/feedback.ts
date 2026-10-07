import { lengthInWholes, midiNumber, type Answer, type Question } from '@partitura/core';
import { pitchLabel, symbolLabel } from '../i18n/format';
import { t } from '../i18n/pt-BR';
import { VALUE_PITCH } from '../render/mei';

const SECONDS_PER_QUARTER = 60 / 90;

export function correctAnswerLabel(q: Question): string {
  if (q.kind === 'note-reading') return pitchLabel(q.pitch);
  if (q.type === 'relation') return String(q.options[q.correctIndex]);
  return symbolLabel(q.symbol);
}

/** What to play after a wrong answer: the note itself, or a note as long as the asked value. */
export function feedbackSound(q: Question): { midi: number; seconds: number } | null {
  if (q.kind === 'note-reading') return { midi: midiNumber(q.pitch), seconds: 1 };
  if (q.type === 'relation' || q.symbol.rest) return null;
  return { midi: midiNumber(VALUE_PITCH), seconds: lengthInWholes(q.symbol) * 4 * SECONDS_PER_QUARTER };
}

/** "Era X" for a wrong answer, or "Era X, em outra oitava" when the piano key had the right Pitch name. */
export function wrongAnswerMessage(q: Question, answer: Answer): string {
  const label = correctAnswerLabel(q);
  if (q.kind === 'note-reading' && answer.kind === 'midi') {
    const asked = midiNumber(q.pitch);
    if (answer.midi !== asked && answer.midi % 12 === asked % 12) return t.round.wrongOctave(label);
  }
  return t.round.wrongWas(label);
}
