import { describe, expect, it } from 'vitest';
import { seededRng } from '../src/random';
import { checkAnswer, isConfigValid, nextQuestion, type ExerciseConfig } from '../src/training/exercise';
import { NOTE_READING_LEVELS, NOTE_VALUE_LEVELS, levelOrder } from '../src/training/levels';

describe('nextQuestion', () => {
  it('builds note-reading questions from the pool', () => {
    const config: ExerciseConfig = { exercise: 'note-reading', answerMode: 'name', ...NOTE_READING_LEVELS[0].settings };
    const q = nextQuestion(config, [], null, seededRng(1));
    expect(q.kind).toBe('note-reading');
    expect(q.itemKey.startsWith('nr:treble:')).toBe(true);
  });

  it('builds note-value questions with options', () => {
    const config: ExerciseConfig = { exercise: 'note-value', ...NOTE_VALUE_LEVELS[0].settings };
    const q = nextQuestion(config, [], null, seededRng(1));
    if (q.kind !== 'note-value') throw new Error('expected note-value');
    expect(q.options).toHaveLength(4);
    expect(checkAnswer(q, { kind: 'option', index: q.correctIndex })).toBe(true);
  });
});

describe('isConfigValid', () => {
  it('rejects custom setups that cannot produce a question', () => {
    expect(isConfigValid({ exercise: 'note-value', values: [], types: ['symbol-to-name'], rests: false, dotted: false })).toBe(false);
    expect(isConfigValid({ exercise: 'note-value', values: ['whole'], types: [], rests: false, dotted: false })).toBe(false);
  });
});

describe('levels', () => {
  it('are all valid, uniquely named and numbered from 1', () => {
    NOTE_READING_LEVELS.forEach((l, i) => {
      expect(l.number).toBe(i + 1);
      expect(isConfigValid({ exercise: 'note-reading', answerMode: 'name', ...l.settings })).toBe(true);
    });
    NOTE_VALUE_LEVELS.forEach((l, i) => {
      expect(l.number).toBe(i + 1);
      expect(isConfigValid({ exercise: 'note-value', ...l.settings })).toBe(true);
    });
    const ids = [...levelOrder('note-reading'), ...levelOrder('note-value')].map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('keeps the semifusa for the top note-value Level only', () => {
    const withSemifusa = NOTE_VALUE_LEVELS.filter((l) => l.settings.values.includes('sixty-fourth'));
    expect(withSemifusa.map((l) => l.id)).toEqual(['nv-6']);
  });
});
