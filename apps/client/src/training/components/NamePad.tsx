import { STEPS, type Step } from '@partitura/core';
import { useKeyDown } from '../../hooks/useKeyDown';
import { t } from '../../i18n/pt-BR';

interface Props {
  onAnswer: (step: Step) => void;
  disabled: boolean;
  correct: Step | null;
  wrong: Step | null;
}

export function NamePad({ onAnswer, disabled, correct, wrong }: Props) {
  useKeyDown((event) => {
    const step = STEPS.find((s) => s === event.key.toUpperCase());
    if (step) onAnswer(step);
  }, !disabled);

  return (
    <div className="pad pad--names">
      {STEPS.map((step) => (
        <button
          key={step}
          type="button"
          disabled={disabled}
          className={step === correct ? 'is-correct' : step === wrong ? 'is-wrong' : undefined}
          onClick={() => onAnswer(step)}
        >
          {t.pitch[step]}
        </button>
      ))}
    </div>
  );
}
