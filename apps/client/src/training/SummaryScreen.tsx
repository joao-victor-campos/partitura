import { recordAverageMs, type RoundRecord } from '@partitura/core';
import { formatSeconds } from '../i18n/format';
import { t } from '../i18n/pt-BR';

interface Props {
  record: RoundRecord;
  onAgain: () => void;
  onBack: () => void;
}

export function SummaryScreen({ record, onAgain, onBack }: Props) {
  return (
    <main className="screen">
      <h1>{t.summary.title}</h1>
      <p className="prompt">{t.summary.score(record.correct, record.answered)}</p>
      <p className="prompt">{t.summary.average(formatSeconds(recordAverageMs(record)))}</p>
      <button type="button" className="primary" onClick={onAgain}>{t.summary.again}</button>
      <button type="button" className="link" onClick={onBack}>{t.summary.back}</button>
    </main>
  );
}
