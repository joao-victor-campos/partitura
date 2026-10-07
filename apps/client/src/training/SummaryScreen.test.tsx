import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SummaryScreen } from './SummaryScreen';

describe('SummaryScreen', () => {
  it('shows the score and the average time', () => {
    const onAgain = vi.fn();
    render(
      <SummaryScreen
        record={{ id: 'r', exercise: 'note-reading', levelId: 'nr-1', answerMode: 'name', speed: false, startedAt: '', finishedAt: '', answered: 20, correct: 17, totalMs: 42_000 }}
        onAgain={onAgain}
        onBack={() => {}}
      />,
    );
    expect(screen.getByText('17 de 20')).toBeInTheDocument();
    expect(screen.getByText('2,1 s por resposta')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'De novo' }));
    expect(onAgain).toHaveBeenCalled();
  });
});
