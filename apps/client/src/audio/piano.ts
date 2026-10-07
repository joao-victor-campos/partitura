import * as Tone from 'tone';
import { SAMPLE_NOTES, sampleFile } from './sampleNotes';

let sampler: Promise<Tone.Sampler> | null = null;

/** The first call must come from a click or tap: browsers only start audio after a user gesture. */
export async function loadPiano(): Promise<Tone.Sampler> {
  await Tone.start();
  if (!sampler) {
    let built: Tone.Sampler | undefined;
    const attempt = new Promise<Tone.Sampler>((resolve, reject) => {
      built = new Tone.Sampler({
        urls: Object.fromEntries(SAMPLE_NOTES.map((note) => [note, sampleFile(note)])),
        baseUrl: `${import.meta.env.BASE_URL}samples/piano/`,
        release: 1,
        onload: () => resolve(built as Tone.Sampler),
        onerror: (error) => reject(error),
      }).toDestination();
    });
    sampler = attempt;
    // A failed load must not be cached: drop the half-built Sampler so the next call retries.
    attempt.catch(() => {
      if (sampler === attempt) sampler = null;
      built?.dispose();
    });
  }
  return sampler;
}

/** Plays one piano note. Audio problems are logged, never thrown: a silent app beats a broken Round. */
export async function playMidi(midi: number, seconds = 1): Promise<void> {
  try {
    const piano = await loadPiano();
    piano.triggerAttackRelease(Tone.Frequency(midi, 'midi').toNote(), seconds);
  } catch (error) {
    console.warn('Piano unavailable', error);
  }
}
