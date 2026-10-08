import type { ExerciseKind, NoteValue, Pitch, ValueSymbol } from '@partitura/core';
import { t } from './pt-BR';

export function pitchLabel(p: Pitch): string {
  return t.pitch[p.step] + (p.alter === 1 ? t.sharp : p.alter === -1 ? t.flat : '');
}

/** Only for aria-labels: octave numbers are never shown on screen. */
export function pitchAriaLabel(p: Pitch): string {
  return `${pitchLabel(p)} ${p.octave}`;
}

export function symbolLabel(s: ValueSymbol): string {
  const name = t.noteValue[s.value];
  if (s.rest) return `${t.restOf} ${name}`;
  if (s.dotted) return `${name} ${t.dotted}`;
  return name;
}

export function exerciseTitle(kind: ExerciseKind): string {
  return kind === 'note-reading' ? t.home.noteReading : t.home.noteValue;
}

export function pluralValue(value: NoteValue): string {
  return t.noteValuePlural[value];
}

const seconds = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const percent = new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 0 });

export function formatSeconds(ms: number): string {
  return seconds.format(ms / 1000);
}

export function formatPercent(ratio: number): string {
  return percent.format(ratio);
}
