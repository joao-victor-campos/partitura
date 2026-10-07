const PER_OCTAVE = ['C', 'D#', 'F#', 'A'];

/** Salamander Grand Piano samples, one every minor third; Tone.Sampler repitches between them. */
export const SAMPLE_NOTES: string[] = [
  'A0',
  ...[1, 2, 3, 4, 5, 6, 7].flatMap((octave) => PER_OCTAVE.map((name) => `${name}${octave}`)),
  'C8',
];

export function sampleFile(note: string): string {
  return `${note.replace('#', 's')}.mp3`;
}
