import type { Attempt } from './attempt';
import type { ExerciseKind, Question } from './exercise';
import type { AnswerMode } from './noteReading';
import { itemStats } from './selection';

/** The stored result of one Round. Timestamps are ISO 8601. */
export interface RoundRecord {
  id: string;
  exercise: ExerciseKind;
  /** null for a custom setup. */
  levelId: string | null;
  answerMode: AnswerMode | null;
  speed: boolean;
  startedAt: string;
  finishedAt: string;
  answered: number;
  correct: number;
  totalMs: number;
}

export interface WeakItem {
  itemKey: string;
  accuracy: number;
  n: number;
  /** The most recent question asked for this item, used to show it. */
  question: Question;
}

export function weakItems(attempts: readonly Attempt[], minAttempts = 3, threshold = 0.8): WeakItem[] {
  const stats = itemStats(attempts);
  const latest = new Map<string, Question>();
  for (const a of attempts) latest.set(a.itemKey, a.question);
  const out: WeakItem[] = [];
  for (const [itemKey, s] of stats) {
    const accuracy = 1 - s.wrong / s.n;
    const question = latest.get(itemKey);
    if (question && s.n >= minAttempts && accuracy < threshold) out.push({ itemKey, accuracy, n: s.n, question });
  }
  return out.sort((a, b) => a.accuracy - b.accuracy);
}

export const PROMOTION_ACCURACY = 0.9;
export const PROMOTION_ROUNDS = 3;

/** Suggests the Level after the most recently played one once its last 3 Rounds were all ≥ 90%. */
export function suggestNextLevel(rounds: readonly RoundRecord[], orderedLevelIds: readonly string[]): string | null {
  const levelled = rounds
    .filter((r) => r.levelId !== null)
    .sort((a, b) => a.finishedAt.localeCompare(b.finishedAt));
  const current = levelled.at(-1)?.levelId;
  if (!current) return null;
  const index = orderedLevelIds.indexOf(current);
  if (index < 0 || index === orderedLevelIds.length - 1) return null;
  const recent = levelled.filter((r) => r.levelId === current).slice(-PROMOTION_ROUNDS);
  if (recent.length < PROMOTION_ROUNDS) return null;
  const allGood = recent.every((r) => r.answered > 0 && r.correct / r.answered >= PROMOTION_ACCURACY);
  return allGood ? orderedLevelIds[index + 1] : null;
}
