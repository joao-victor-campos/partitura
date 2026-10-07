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

  it('ignores auto-repeated key events while a key is held', () => {
    const onAnswer = vi.fn();
    render(<NamePad onAnswer={onAnswer} disabled={false} correct={null} wrong={null} />);
    fireEvent.keyDown(window, { key: 'g' });
    fireEvent.keyDown(window, { key: 'g', repeat: true });
    fireEvent.keyDown(window, { key: 'g', repeat: true });
    expect(onAnswer).toHaveBeenCalledTimes(1);
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

  it('opens centred on middle C when it is in range, else on the middle of the range', () => {
    const scrolled: (string | null)[] = [];
    const original = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = function (this: Element) { scrolled.push(this.getAttribute('data-midi')); };
    try {
      const props = { onAnswer: () => {}, disabled: false, correct: null, wrong: null };
      render(<PianoKeyboard lowMidi={48} highMidi={72} {...props} />);
      render(<PianoKeyboard lowMidi={72} highMidi={83} {...props} />);
    } finally {
      Element.prototype.scrollIntoView = original;
    }
    // 72..83 has the white keys 72 74 76 77 79 81 83; the middle one is 77.
    expect(scrolled).toEqual(['60', '77']);
  });

  it('scrolls the correct key into view when the answer is revealed', () => {
    const scrolled: (string | null)[] = [];
    const original = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = function (this: Element) { scrolled.push(this.getAttribute('data-midi')); };
    try {
      const props = { onAnswer: () => {}, disabled: false, wrong: null };
      const { rerender } = render(<PianoKeyboard lowMidi={36} highMidi={96} correct={null} {...props} />);
      scrolled.length = 0; // ignore the opening scroll to middle C
      rerender(<PianoKeyboard lowMidi={36} highMidi={96} correct={88} {...props} disabled wrong={87} />);
    } finally {
      Element.prototype.scrollIntoView = original;
    }
    // 88 is a white key (E), so its slot is the scroll target.
    expect(scrolled).toEqual(['88']);
  });

  it('does not throw when scrollIntoView is missing (jsdom)', () => {
    expect(() => render(<PianoKeyboard lowMidi={60} highMidi={71} onAnswer={() => {}} disabled={false} correct={null} wrong={null} />)).not.toThrow();
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
