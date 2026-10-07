import type { ExerciseKind } from '@partitura/core';
import { exerciseTitle } from '../i18n/format';
import { t } from '../i18n/pt-BR';

interface Props {
  onPick: (exercise: ExerciseKind) => void;
  onProgress: (exercise: ExerciseKind) => void;
}

const CARDS: { exercise: ExerciseKind; title: string; hint: string }[] = [
  { exercise: 'note-reading', title: exerciseTitle('note-reading'), hint: t.home.noteReadingHint },
  { exercise: 'note-value', title: exerciseTitle('note-value'), hint: t.home.noteValueHint },
];

export function HomeScreen({ onPick, onProgress }: Props) {
  return (
    <main className="screen">
      <h1>{t.home.title}</h1>
      <div className="cards">
        {CARDS.map((card) => (
          <div key={card.exercise} className="card-wrap">
            <button type="button" className="card" onClick={() => onPick(card.exercise)}>
              <span className="card__title">{card.title}</span>
              <span className="card__hint">{card.hint}</span>
            </button>
            <button type="button" className="link" onClick={() => onProgress(card.exercise)}>{t.home.progress}</button>
          </div>
        ))}
      </div>
    </main>
  );
}
