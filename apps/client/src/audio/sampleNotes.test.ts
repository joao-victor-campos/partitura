import { describe, expect, it } from 'vitest';
import { SAMPLE_NOTES, sampleFile } from './sampleNotes';

describe('piano samples', () => {
  it('has a sample every minor third from A0 to C8', () => {
    expect(SAMPLE_NOTES).toHaveLength(30);
    expect(SAMPLE_NOTES[0]).toBe('A0');
    expect(SAMPLE_NOTES).toContain('D#4');
    expect(SAMPLE_NOTES.at(-1)).toBe('C8');
  });

  it('maps note names to file names', () => {
    expect(sampleFile('F#3')).toBe('Fs3.mp3');
    expect(sampleFile('C4')).toBe('C4.mp3');
  });
});
