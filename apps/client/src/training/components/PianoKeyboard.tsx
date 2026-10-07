import { isWhiteKey, pitchFromMidi } from '@partitura/core';
import { pitchAriaLabel } from '../../i18n/format';
import { t } from '../../i18n/pt-BR';

const MIDDLE_C = 60;

interface Props {
  lowMidi: number;
  highMidi: number;
  onAnswer: (midi: number) => void;
  disabled: boolean;
  correct: number | null;
  wrong: number | null;
}

export function PianoKeyboard({ lowMidi, highMidi, onAnswer, disabled, correct, wrong }: Props) {
  const whites: number[] = [];
  for (let midi = lowMidi; midi <= highMidi; midi++) if (isWhiteKey(midi)) whites.push(midi);

  const renderKey = (midi: number, base: string) => (
    <button
      type="button"
      className={[base, midi === correct && 'is-correct', midi === wrong && 'is-wrong'].filter(Boolean).join(' ')}
      disabled={disabled}
      aria-label={pitchAriaLabel(pitchFromMidi(midi))}
      onClick={() => onAnswer(midi)}
    >
      {midi === MIDDLE_C && <span className="piano__middle-c">{t.round.middleC}</span>}
    </button>
  );

  return (
    <div className="piano" role="group" aria-label={t.round.piano}>
      {whites.map((midi) => (
        <div key={midi} className="piano__slot">
          {renderKey(midi, 'piano__white')}
          {midi + 1 <= highMidi && !isWhiteKey(midi + 1) && renderKey(midi + 1, 'piano__black')}
        </div>
      ))}
    </div>
  );
}
