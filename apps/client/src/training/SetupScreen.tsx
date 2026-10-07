import { useState } from 'react';
import {
  DEFAULT_ROUND, NOTE_READING_LEVELS, NOTE_VALUES, NOTE_VALUE_LEVELS, SPEED_ROUND, isConfigValid, levelOrder,
  type AnswerMode, type ExerciseConfig, type ExerciseKind, type LedgerLines, type NoteReadingSettings,
  type NoteValueQuestionType, type NoteValueSettings, type RoundMode, type StaffChoice,
} from '@partitura/core';
import { loadPiano } from '../audio/piano';
import { preloadNotation } from '../render/verovio';
import { t } from '../i18n/pt-BR';

export interface RoundStart {
  config: ExerciseConfig;
  levelId: string | null;
  mode: RoundMode;
}

const CUSTOM = 'custom';
const STAFF_CHOICES: StaffChoice[] = ['treble', 'bass', 'mixed', 'grand'];
const LEDGER_LINES: LedgerLines[] = [0, 1, 2, 3];
const QUESTION_TYPES: NoteValueQuestionType[] = ['symbol-to-name', 'name-to-symbol', 'relation'];

function toggle<T>(list: T[], item: T): T[] {
  return list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
}

interface Props {
  exercise: ExerciseKind;
  onStart: (start: RoundStart) => void;
  onBack: () => void;
}

export function SetupScreen({ exercise, onStart, onBack }: Props) {
  const levels = levelOrder(exercise);
  const [selected, setSelected] = useState<string>(levels[0].id);
  const [answerMode, setAnswerMode] = useState<AnswerMode>('name');
  const [speed, setSpeed] = useState(false);
  const [reading, setReading] = useState<NoteReadingSettings>({ staves: 'treble', ledgerLines: 0, accidentals: false });
  const [values, setValues] = useState<NoteValueSettings>({
    values: ['whole', 'half', 'quarter', 'eighth'], types: ['symbol-to-name'], rests: false, dotted: false,
  });

  const config: ExerciseConfig = exercise === 'note-reading'
    ? { exercise, answerMode, ...(selected === CUSTOM ? reading : NOTE_READING_LEVELS.find((l) => l.id === selected)!.settings) }
    : { exercise, ...(selected === CUSTOM ? values : NOTE_VALUE_LEVELS.find((l) => l.id === selected)!.settings) };
  const valid = isConfigValid(config);

  const start = () => {
    // Called from a tap, so the browser lets the piano start.
    loadPiano().catch((error: unknown) => console.warn('Could not load the piano', error));
    preloadNotation();
    onStart({ config, levelId: selected === CUSTOM ? null : selected, mode: speed ? SPEED_ROUND : DEFAULT_ROUND });
  };

  return (
    <main className="screen">
      <button type="button" className="link" onClick={onBack}>{t.setup.back}</button>
      <h1>{exercise === 'note-reading' ? t.home.noteReading : t.home.noteValue}</h1>

      <section className="levels" aria-label={t.setup.levels}>
        {levels.map((level) => (
          <button key={level.id} type="button" aria-pressed={selected === level.id} onClick={() => setSelected(level.id)}>
            {t.setup.level(level.number)}
          </button>
        ))}
        <button type="button" aria-pressed={selected === CUSTOM} onClick={() => setSelected(CUSTOM)}>{t.setup.custom}</button>
      </section>

      {exercise === 'note-reading' && (
        <section className="field">
          <span>{t.setup.answerMode}</span>
          <div className="segmented">
            <button type="button" aria-pressed={answerMode === 'name'} onClick={() => setAnswerMode('name')}>{t.setup.byName}</button>
            <button type="button" aria-pressed={answerMode === 'piano'} onClick={() => setAnswerMode('piano')}>{t.setup.byPiano}</button>
          </div>
        </section>
      )}

      {selected === CUSTOM && exercise === 'note-reading' && (
        <ReadingCustom value={reading} onChange={setReading} answerMode={answerMode} />
      )}
      {selected === CUSTOM && exercise === 'note-value' && <ValuesCustom value={values} onChange={setValues} />}

      <label className="field field--inline">
        <input type="checkbox" checked={speed} onChange={(e) => setSpeed(e.target.checked)} />
        {t.setup.speed}
      </label>

      {!valid && <p className="is-wrong">{t.setup.invalid}</p>}
      <button type="button" className="primary" disabled={!valid} onClick={start}>{t.setup.start}</button>
    </main>
  );
}

function ReadingCustom({ value, onChange, answerMode }: {
  value: NoteReadingSettings;
  onChange: (v: NoteReadingSettings) => void;
  answerMode: AnswerMode;
}) {
  return (
    <section className="field">
      <label className="field">
        {t.setup.staves}
        <select value={value.staves} onChange={(e) => onChange({ ...value, staves: e.target.value as StaffChoice })}>
          {STAFF_CHOICES.map((s) => <option key={s} value={s}>{t.setup.staveChoice[s]}</option>)}
        </select>
      </label>
      <label className="field">
        {t.setup.ledgerLines}
        <select value={value.ledgerLines} onChange={(e) => onChange({ ...value, ledgerLines: Number(e.target.value) as LedgerLines })}>
          {LEDGER_LINES.map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
      </label>
      <label className="field field--inline">
        <input
          type="checkbox"
          checked={value.accidentals}
          disabled={answerMode !== 'piano'}
          onChange={(e) => onChange({ ...value, accidentals: e.target.checked })}
        />
        {t.setup.accidentals} <small>{t.setup.accidentalsHint}</small>
      </label>
    </section>
  );
}

function ValuesCustom({ value, onChange }: { value: NoteValueSettings; onChange: (v: NoteValueSettings) => void }) {
  return (
    <section className="field">
      <fieldset className="checks">
        <legend>{t.setup.values}</legend>
        {NOTE_VALUES.map((v) => (
          <label key={v}>
            <input type="checkbox" checked={value.values.includes(v)} onChange={() => onChange({ ...value, values: toggle(value.values, v) })} />
            {t.noteValue[v]}
          </label>
        ))}
      </fieldset>
      <fieldset className="checks">
        <legend>{t.setup.types}</legend>
        {QUESTION_TYPES.map((q) => (
          <label key={q}>
            <input type="checkbox" checked={value.types.includes(q)} onChange={() => onChange({ ...value, types: toggle(value.types, q) })} />
            {t.setup.typeChoice[q]}
          </label>
        ))}
      </fieldset>
      <label className="field field--inline">
        <input type="checkbox" checked={value.rests} onChange={(e) => onChange({ ...value, rests: e.target.checked })} />
        {t.setup.rests}
      </label>
      <label className="field field--inline">
        <input type="checkbox" checked={value.dotted} onChange={(e) => onChange({ ...value, dotted: e.target.checked })} />
        {t.setup.dottedValues}
      </label>
    </section>
  );
}
