import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  advance, answerQuestion, keyboardRange, nextQuestion, remainingMs, startRound, tick,
  type Answer, type Attempt, type ExerciseConfig, type Rng, type RoundMode, type RoundRecord, type RoundState,
} from '@partitura/core';
import { playMidi } from '../audio/piano';
import { useKeyDown } from '../hooks/useKeyDown';
import { t } from '../i18n/pt-BR';
import { addAttempt, addRound, attemptsFor, db } from '../storage/db';
import { correctAnswerLabel, feedbackSound } from './feedback';
import { QuestionView } from './QuestionView';

/** How long "Certo!" stays before the next question. Wrong answers wait for "Próxima". */
const CORRECT_PAUSE_MS = 500;

interface Props {
  config: ExerciseConfig;
  levelId: string | null;
  mode: RoundMode;
  onFinished: (record: RoundRecord) => void;
  onQuit: () => void;
  rng?: Rng;
}

export function RoundScreen({ config, levelId, mode, onFinished, onQuit, rng = Math.random }: Props) {
  const [roundId] = useState(() => crypto.randomUUID());
  const [startedAt] = useState(() => new Date().toISOString());
  const history = useRef<Attempt[]>([]);
  const finished = useRef(false);
  const [state, setState] = useState<RoundState | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const keyboard = useMemo(
    () => (config.exercise === 'note-reading' && config.answerMode === 'piano' ? keyboardRange(config) : null),
    [config],
  );
  const generate = useCallback(
    (previousKey: string | null) => nextQuestion(config, history.current, previousKey, rng),
    [config, rng],
  );

  // Load past Attempts first so the very first question already adapts to them.
  useEffect(() => {
    let alive = true;
    attemptsFor(db, config.exercise).then((past) => {
      if (!alive) return;
      history.current = past;
      setState(startRound(mode, generate(null), Date.now()));
    });
    return () => {
      alive = false;
    };
  }, [config.exercise, mode, generate]);

  useEffect(() => {
    if (mode.kind !== 'timed') return;
    const id = setInterval(() => {
      const at = Date.now();
      setNow(at);
      setState((s) => (s ? tick(s, at) : s));
    }, 250);
    return () => clearInterval(id);
  }, [mode]);

  useEffect(() => {
    if (state?.status !== 'finished' || finished.current) return;
    finished.current = true;
    const record: RoundRecord = {
      id: roundId,
      exercise: config.exercise,
      levelId,
      answerMode: config.exercise === 'note-reading' ? config.answerMode : null,
      speed: mode.kind === 'timed',
      startedAt,
      finishedAt: new Date().toISOString(),
      answered: state.answered,
      correct: state.correct,
      totalMs: state.totalMs,
    };
    void addRound(db, record).then(() => onFinished(record));
  }, [state, roundId, config, levelId, mode, startedAt, onFinished]);

  const handleAnswer = useCallback(
    (answer: Answer) => {
      if (!state || state.status !== 'asking') return;
      const at = Date.now();
      const result = answerQuestion(state, answer, at);
      const attempt: Attempt = {
        id: crypto.randomUUID(),
        roundId,
        exercise: config.exercise,
        itemKey: state.question.itemKey,
        question: state.question,
        answer,
        correct: result.correct,
        ms: result.ms,
        answeredAt: new Date(at).toISOString(),
      };
      history.current = [...history.current, attempt];
      void addAttempt(db, attempt);
      setState(result.state);

      if (result.correct) {
        setTimeout(() => {
          setState((s) => (s && s.status === 'feedback' ? advance(s, Date.now(), () => generate(attempt.itemKey)) : s));
        }, CORRECT_PAUSE_MS);
      } else {
        const sound = feedbackSound(state.question);
        if (sound) void playMidi(sound.midi, sound.seconds);
      }
    },
    [state, roundId, config.exercise, generate],
  );

  const handleNext = useCallback(() => {
    setState((s) => (s && s.status === 'feedback' ? advance(s, Date.now(), () => generate(s.question.itemKey)) : s));
  }, [generate]);

  const waitingForNext = state?.status === 'feedback' && state.last?.correct === false;
  useKeyDown((event) => {
    if (event.key === 'Enter') handleNext();
  }, waitingForNext);

  if (!state) return <main className="screen round" aria-busy="true" />;

  const remaining = remainingMs(state, now);
  const shownNumber = state.status === 'asking' ? state.answered + 1 : state.answered;

  return (
    <main className="screen round">
      <header className="round__header">
        <button type="button" className="link" onClick={onQuit}>{t.round.quit}</button>
        <span>
          {mode.kind === 'count'
            ? t.round.progress(Math.min(shownNumber, mode.total), mode.total)
            : t.round.secondsLeft(Math.ceil((remaining ?? 0) / 1000))}
        </span>
      </header>

      <QuestionView
        question={state.question}
        keyboard={keyboard}
        feedback={state.status === 'feedback' ? state.last : null}
        onAnswer={handleAnswer}
      />

      <footer className="round__feedback" aria-live="polite">
        {state.status === 'feedback' && state.last?.correct && <p className="is-correct">{t.round.correct}</p>}
        {waitingForNext && (
          <>
            <p className="is-wrong">{t.round.wrongWas(correctAnswerLabel(state.question))}</p>
            <button type="button" className="primary" onClick={handleNext}>{t.round.next}</button>
          </>
        )}
      </footer>
    </main>
  );
}
