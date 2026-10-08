import type { ReactNode } from 'react';
import { useKeyDown } from '../../hooks/useKeyDown';

interface Props {
  options: ReactNode[];
  onAnswer: (index: number) => void;
  disabled: boolean;
  correct: number | null;
  wrong: number | null;
}

export function ChoicePad({ options, onAnswer, disabled, correct, wrong }: Props) {
  useKeyDown((event) => {
    const n = Number(event.key);
    if (Number.isInteger(n) && n >= 1 && n <= options.length) onAnswer(n - 1);
  }, !disabled);

  return (
    <div className="pad pad--choices">
      {options.map((option, index) => (
        <button
          key={index}
          type="button"
          disabled={disabled}
          className={index === correct ? 'is-correct' : index === wrong ? 'is-wrong' : undefined}
          onClick={() => onAnswer(index)}
        >
          <span className="pad__shortcut">{index + 1}</span>
          {option}
        </button>
      ))}
    </div>
  );
}
