import Dexie, { type Table } from 'dexie';
import type { Attempt, ExerciseKind, RoundRecord } from '@partitura/core';

export class TrainingDb extends Dexie {
  declare attempts: Table<Attempt, string>;
  declare rounds: Table<RoundRecord, string>;

  constructor(name = 'partitura') {
    super(name);
    this.version(1).stores({
      attempts: 'id, exercise, itemKey, answeredAt, roundId',
      rounds: 'id, exercise, levelId, finishedAt',
    });
  }
}

export const db = new TrainingDb();

/** Attempts are only ever added, never changed (CONTEXT.md, "Attempt"). `add` rejects a duplicate id. */
export async function addAttempt(database: TrainingDb, attempt: Attempt): Promise<void> {
  await database.attempts.add(attempt);
}

export async function attemptsFor(database: TrainingDb, exercise: ExerciseKind): Promise<Attempt[]> {
  return database.attempts.where('exercise').equals(exercise).sortBy('answeredAt');
}

export async function addRound(database: TrainingDb, round: RoundRecord): Promise<void> {
  await database.rounds.add(round);
}

export async function roundsFor(database: TrainingDb, exercise: ExerciseKind): Promise<RoundRecord[]> {
  return database.rounds.where('exercise').equals(exercise).sortBy('finishedAt');
}
