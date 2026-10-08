import type { Rng } from '../random';
import type { Answer } from './answer';
import type { Attempt } from './attempt';
import {
  checkNoteReading, noteReadingPool, toNoteReadingQuestion,
  type NoteReadingConfig, type NoteReadingQuestion,
} from './noteReading';
import {
  checkNoteValue, noteValuePool, toNoteValueQuestion,
  type NoteValueConfig, type NoteValueQuestion,
} from './noteValues';
import { pickItem } from './selection';

export type ExerciseKind = 'note-reading' | 'note-value';
export type ExerciseConfig = NoteReadingConfig | NoteValueConfig;
export type Question = NoteReadingQuestion | NoteValueQuestion;

export function checkAnswer(q: Question, a: Answer): boolean {
  return q.kind === 'note-reading' ? checkNoteReading(q, a) : checkNoteValue(q, a);
}

export function isConfigValid(config: ExerciseConfig): boolean {
  return config.exercise === 'note-reading'
    ? noteReadingPool(config).length > 0
    : noteValuePool(config).length > 0;
}

/** Picks the next question, favouring items with poor Attempts and never repeating the previous one. */
export function nextQuestion(
  config: ExerciseConfig,
  history: readonly Attempt[],
  previousKey: string | null,
  rng: Rng,
): Question {
  if (config.exercise === 'note-reading') {
    return toNoteReadingQuestion(pickItem(noteReadingPool(config), history, previousKey, rng), config);
  }
  return toNoteValueQuestion(pickItem(noteValuePool(config), history, previousKey, rng), config, rng);
}
