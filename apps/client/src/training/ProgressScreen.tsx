import { useEffect, useState } from 'react';
import {
  levelOrder, suggestNextLevel, weakItems,
  type Attempt, type Clef, type ExerciseKind, type Pitch, type Question, type RoundRecord, type WeakItem,
} from '@partitura/core';
import { Staff } from '../components/Staff';
import { formatPercent, pitchLabel, pluralValue, symbolLabel } from '../i18n/format';
import { t } from '../i18n/pt-BR';
import { pitchesMei } from '../render/mei';
import { attemptsFor, db, roundsFor } from '../storage/db';

const WEAK_COLOR = '#b3261e';
const RECENT_ROUNDS = 10;
const dateFormat = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

function weakLabel(q: Question): string {
  if (q.kind === 'note-reading') return `${pitchLabel(q.pitch)} (${t.clef[q.clef]})`;
  if (q.type === 'relation') return t.round.relation(pluralValue(q.part.value), symbolLabel(q.whole));
  return symbolLabel(q.symbol);
}

function WeakList({ items }: { items: WeakItem[] }) {
  const byClef = new Map<Clef, Pitch[]>();
  for (const item of items) {
    if (item.question.kind !== 'note-reading') continue;
    const list = byClef.get(item.question.clef) ?? [];
    list.push(item.question.pitch);
    byClef.set(item.question.clef, list);
  }
  return (
    <>
      {[...byClef].map(([clef, pitches]) => (
        <Staff key={clef} mei={pitchesMei(clef, pitches, WEAK_COLOR)} />
      ))}
      <ul className="weak-list">
        {items.map((item) => (
          <li key={item.itemKey}>{weakLabel(item.question)}: {formatPercent(item.accuracy)}</li>
        ))}
      </ul>
    </>
  );
}

interface Props {
  exercise: ExerciseKind;
  onBack: () => void;
}

export function ProgressScreen({ exercise, onBack }: Props) {
  const [data, setData] = useState<{ exercise: ExerciseKind; attempts: Attempt[]; rounds: RoundRecord[] } | null>(null);

  useEffect(() => {
    let alive = true;
    Promise.all([attemptsFor(db, exercise), roundsFor(db, exercise)])
      .then(([attempts, rounds]) => ({ exercise, attempts, rounds }))
      .catch((error: unknown) => {
        // Never leave the learner on an endless loading screen: show it empty instead.
        console.warn('ProgressScreen: could not load progress', error);
        return { exercise, attempts: [], rounds: [] };
      })
      .then((loaded) => {
        if (alive) setData(loaded);
      });
    return () => {
      alive = false;
    };
  }, [exercise]);

  // Data loaded for another exercise counts as still loading.
  if (!data || data.exercise !== exercise) return <main className="screen" aria-busy="true" />;

  const levels = levelOrder(exercise);
  const levelLabel = (id: string | null) => {
    const level = levels.find((l) => l.id === id);
    return level ? t.setup.level(level.number) : t.setup.custom;
  };
  const weak = weakItems(data.attempts);
  const next = levels.find((l) => l.id === suggestNextLevel(data.rounds, levels.map((l) => l.id)));
  const recent = [...data.rounds].reverse().slice(0, RECENT_ROUNDS);
  const title = exercise === 'note-reading' ? t.home.noteReading : t.home.noteValue;

  return (
    <main className="screen">
      <button type="button" className="link" onClick={onBack}>{t.progress.back}</button>
      <h1>{t.progress.title(title)}</h1>

      {next && <p className="callout">{t.progress.suggestion(next.number)}</p>}

      <section className="field">
        <h2>{t.progress.weak}</h2>
        {weak.length === 0 ? <p>{t.progress.noWeak}</p> : <WeakList items={weak} />}
      </section>

      <section className="field">
        <h2>{t.progress.recent}</h2>
        {recent.length === 0 ? (
          <p>{t.progress.noRounds}</p>
        ) : (
          <table>
            <thead>
              <tr><th>{t.progress.when}</th><th>{t.progress.level}</th><th>{t.progress.score}</th></tr>
            </thead>
            <tbody>
              {recent.map((r) => (
                <tr key={r.id}>
                  <td>{dateFormat.format(new Date(r.finishedAt))}</td>
                  <td>{levelLabel(r.levelId)}</td>
                  <td>{t.summary.score(r.correct, r.answered)} ({formatPercent(r.answered ? r.correct / r.answered : 0)})</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
