// Downloads the Salamander Grand Piano samples (CC-BY 3.0) into public/ so the app works offline.
import { mkdir, writeFile } from 'node:fs/promises';

const BASE = 'https://tonejs.github.io/audio/salamander/';
const PER_OCTAVE = ['C', 'Ds', 'Fs', 'A'];
const files = ['A0', ...[1, 2, 3, 4, 5, 6, 7].flatMap((o) => PER_OCTAVE.map((n) => `${n}${o}`)), 'C8'].map((n) => `${n}.mp3`);
const dir = new URL('../public/samples/piano/', import.meta.url);

await mkdir(dir, { recursive: true });
for (const file of files) {
  const res = await fetch(BASE + file);
  if (!res.ok) throw new Error(`${file}: HTTP ${res.status}`);
  await writeFile(new URL(file, dir), Buffer.from(await res.arrayBuffer()));
  console.log('saved', file);
}
await writeFile(
  new URL('ATTRIBUTION.txt', dir),
  'Salamander Grand Piano by Alexander Holm, licensed CC-BY 3.0. Files from https://tonejs.github.io/audio/salamander/\n',
);
