import type { Answer } from './answer';
import { checkAnswer, type Question } from './exercise';

export type RoundMode = { kind: 'count'; total: number } | { kind: 'timed'; durationMs: number };
export const DEFAULT_ROUND: RoundMode = { kind: 'count', total: 20 };
export const SPEED_ROUND: Extract<RoundMode, { kind: 'timed' }> = { kind: 'timed', durationMs: 60_000 };

export type RoundStatus = 'asking' | 'feedback' | 'finished';

export interface RoundState {
  mode: RoundMode;
  startedAt: number;
  question: Question;
  questionShownAt: number;
  status: RoundStatus;
  answered: number;
  correct: number;
  totalMs: number;
  last: { answer: Answer; correct: boolean } | null;
}

export function startRound(mode: RoundMode, first: Question, now: number): RoundState {
  return {
    mode, startedAt: now, question: first, questionShownAt: now,
    status: 'asking', answered: 0, correct: 0, totalMs: 0, last: null,
  };
}

export function answerQuestion(
  state: RoundState,
  answer: Answer,
  now: number,
): { state: RoundState; correct: boolean; ms: number } {
  if (state.status !== 'asking') throw new Error(`answerQuestion: round is ${state.status}`);
  const correct = checkAnswer(state.question, answer);
  const ms = now - state.questionShownAt;
  return {
    correct,
    ms,
    state: {
      ...state,
      status: 'feedback',
      answered: state.answered + 1,
      correct: state.correct + (correct ? 1 : 0),
      totalMs: state.totalMs + ms,
      last: { answer, correct },
    },
  };
}

export function isRoundOver(state: RoundState, now: number): boolean {
  return state.mode.kind === 'count'
    ? state.answered >= state.mode.total
    : now - state.startedAt >= state.mode.durationMs;
}

/** Moves from feedback to the next question, or finishes the Round. */
export function advance(state: RoundState, now: number, makeNext: () => Question): RoundState {
  if (state.status === 'finished') return state;
  if (isRoundOver(state, now)) return { ...state, status: 'finished' };
  return { ...state, status: 'asking', question: makeNext(), questionShownAt: now, last: null };
}

/** In speed mode, ends the Round when time runs out while a question is open. */
export function tick(state: RoundState, now: number): RoundState {
  if (state.status === 'asking' && state.mode.kind === 'timed' && isRoundOver(state, now)) {
    return { ...state, status: 'finished' };
  }
  return state;
}

export function remainingMs(state: RoundState, now: number): number | null {
  if (state.mode.kind !== 'timed') return null;
  return Math.max(0, state.mode.durationMs - (now - state.startedAt));
}

export function averageMs(state: RoundState): number {
  return state.answered === 0 ? 0 : state.totalMs / state.answered;
}
