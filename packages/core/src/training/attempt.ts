import type { Answer } from './answer';
import type { ExerciseKind, Question } from './exercise';

/** One answered question. Attempts are only ever added, never changed. */
export interface Attempt {
  id: string;
  roundId: string;
  exercise: ExerciseKind;
  itemKey: string;
  question: Question;
  answer: Answer;
  correct: boolean;
  ms: number;
  /** ISO 8601 timestamp. */
  answeredAt: string;
}
