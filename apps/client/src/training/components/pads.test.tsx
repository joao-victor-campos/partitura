import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ChoicePad } from './ChoicePad';
import { NamePad } from './NamePad';
import { PianoKeyboard } from './PianoKeyboard';

describe('NamePad', () => {
  it('answers by tapping a solfège name', () => {
    const onAnswer = vi.fn();
    render(<NamePad onAnswer={onAnswer} disabled={false} correct={null} wrong={null} />);
    fireEvent.click(screen.getByRole('button', { name: 'Ré' }));
    expect(onAnswer).toHaveBeenCalledWith('D');
  });

  it('answers with the letter keys, ignoring shortcuts with modifiers', () => {
    const onAnswer = vi.fn();
    render(<NamePad onAnswer={onAnswer} disabled={false} correct={null} wrong={null} />);
    fireEvent.keyDown(window, { key: 'g' });
    fireEvent.keyDown(window, { key: 'c', ctrlKey: true });
    expect(onAnswer).toHaveBeenCalledTimes(1);
    expect(onAnswer).toHaveBeenCalledWith('G');
  });

  it('ignores keys and marks the right and wrong answers during feedback', () => {
    const onAnswer = vi.fn();
    render(<NamePad onAnswer={onAnswer} disabled correct="A" wrong="B" />);
    fireEvent.keyDown(window, { key: 'a' });
    expect(onAnswer).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Lá' })).toHaveClass('is-correct');
    expect(screen.getByRole('button', { name: 'Si' })).toHaveClass('is-wrong');
  });
});

describe('PianoKeyboard', () => {
  it('draws one octave of white and black keys and answers with MIDI numbers', () => {
    const onAnswer = vi.fn();
    render(<PianoKeyboard lowMidi={60} highMidi={71} onAnswer={onAnswer} disabled={false} correct={null} wrong={null} />);
    expect(screen.getAllByRole('button')).toHaveLength(12);
    fireEvent.click(screen.getByRole('button', { name: 'Fá♯ 4' }));
    expect(onAnswer).toHaveBeenCalledWith(66);
    expect(screen.getByText('Dó central')).toBeInTheDocument();
  });
});

describe('ChoicePad', () => {
  it('answers by tapping or with the number keys', () => {
    const onAnswer = vi.fn();
    render(<ChoicePad options={['semibreve', 'mínima', 'semínima', 'colcheia']} onAnswer={onAnswer} disabled={false} correct={null} wrong={null} />);
    // Accessible names are "1semibreve", "2mínima", … ("mínima" alone would also match "semínima").
    fireEvent.click(screen.getByRole('button', { name: /^2/ }));
    fireEvent.keyDown(window, { key: '4' });
    fireEvent.keyDown(window, { key: '9' });
    expect(onAnswer.mock.calls).toEqual([[1], [3]]);
  });
});
