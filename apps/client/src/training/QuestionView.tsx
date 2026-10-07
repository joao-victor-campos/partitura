import type { ReactNode } from 'react';
import { midiNumber, type Answer, type Question } from '@partitura/core';
import { Staff } from '../components/Staff';
import { pluralValue, symbolLabel } from '../i18n/format';
import { t } from '../i18n/pt-BR';
import { noteReadingMei, symbolMei } from '../render/mei';
import { ChoicePad } from './components/ChoicePad';
import { NamePad } from './components/NamePad';
import { PianoKeyboard } from './components/PianoKeyboard';

export interface Feedback {
  answer: Answer;
  correct: boolean;
}

interface Props {
  question: Question;
  keyboard: { lowMidi: number; highMidi: number } | null;
  feedback: Feedback | null;
  onAnswer: (answer: Answer) => void;
}

export function QuestionView({ question, keyboard, feedback, onAnswer }: Props) {
  const disabled = feedback !== null;
  const given = feedback && !feedback.correct ? feedback.answer : null;

  if (question.kind === 'note-reading') {
    return (
      <>
        <p className="prompt">{t.round.whichNote}</p>
        <Staff mei={noteReadingMei(question)} />
        {question.answerMode === 'piano' && keyboard ? (
          <PianoKeyboard
            {...keyboard}
            disabled={disabled}
            correct={disabled ? midiNumber(question.pitch) : null}
            wrong={given?.kind === 'midi' ? given.midi : null}
            onAnswer={(midi) => onAnswer({ kind: 'midi', midi })}
          />
        ) : (
          <NamePad
            disabled={disabled}
            correct={disabled ? question.pitch.step : null}
            wrong={given?.kind === 'step' ? given.step : null}
            onAnswer={(step) => onAnswer({ kind: 'step', step })}
          />
        )}
      </>
    );
  }

  let prompt: string;
  let visual: ReactNode = null;
  let options: ReactNode[];
  if (question.type === 'relation') {
    prompt = t.round.relation(pluralValue(question.part.value), symbolLabel(question.whole));
    options = question.options.map(String);
  } else if (question.type === 'symbol-to-name') {
    prompt = t.round.whichValue;
    visual = <Staff mei={symbolMei(question.symbol)} />;
    options = question.options.map(symbolLabel);
  } else {
    prompt = t.round.findValue(symbolLabel(question.symbol));
    options = question.options.map((s) => <Staff key={symbolLabel(s)} className="staff staff--small" mei={symbolMei(s)} />);
  }

  return (
    <>
      <p className="prompt">{prompt}</p>
      {visual}
      <ChoicePad
        options={options}
        disabled={disabled}
        correct={disabled ? question.correctIndex : null}
        wrong={given?.kind === 'option' ? given.index : null}
        onAnswer={(index) => onAnswer({ kind: 'option', index })}
      />
    </>
  );
}
