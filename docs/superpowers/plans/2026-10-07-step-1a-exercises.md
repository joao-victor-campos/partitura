# Step 1a — Exercises (local-only) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A Portuguese-language music-reading trainer (note reading on clave de Sol and clave de Fá, plus note values) that runs in the browser and as an Android app, stores every Attempt locally, and adapts to the user's weak notes.

**Architecture:**
- **`packages/core`:** a pnpm workspace package of pure, DOM-free TypeScript that holds all training rules: question generation, answer checking, adaptive selection, the Round state machine and progress analysis. The Step 1b server will reuse it.
- **`apps/client`:** a Vite + React app that draws the staff with Verovio (MEI generated on the fly), plays notes with a sampled piano (Tone.js), stores Attempts and Rounds in IndexedDB (Dexie), and is wrapped for Android with Capacitor.
- **Out of scope here:** the server, sign-in and sync (Step 1b).

**Tech Stack:** pnpm workspaces, TypeScript (strict), Vitest, React, Vite, @testing-library/react, Verovio (npm `verovio`), Tone.js, Dexie, fake-indexeddb (tests), Capacitor (Android).

**Spec:** `docs/superpowers/specs/2026-10-07-sheet-music-app-design.md`. The glossary in `CONTEXT.md` defines Exercise, Level, Round, Attempt, Answer mode, Pitch name, Note value and Clef. Use those names in code.

## Global Constraints

- **Language:**
  - Every on-screen string comes from `apps/client/src/i18n/pt-BR.ts`. Components contain no Portuguese literals except numbers.
  - Pitch names on screen are solfège: Dó Ré Mi Fá Sol Lá Si. Letter names (C–B) are used only as keyboard shortcuts.
  - **Octave numbers are never shown on screen.** Brazilian usage often calls middle C "Dó3", not "C4". Octave numbers may appear only in `aria-label`s.
  - Note values on screen: semibreve, mínima, semínima, colcheia, semicolcheia, fusa, semifusa. Dotted values read "<name> pontuada", and rests read "pausa de <name>".
- **Code:**
  - `packages/core` has no runtime dependencies, no DOM APIs and no on-screen text.
  - Pitches use scientific numbering inside code: C4 = middle C = MIDI 60.
  - TypeScript `strict`, `verbatimModuleSyntax` (use `import type`), `erasableSyntaxOnly` (no enums or namespaces), `noUnusedLocals`.
- **Training rules:**
  - Attempts are append-only. Never update or delete one.
  - Accidentals appear only when the answer mode is `piano`.
  - Rounds are 20 questions by default. Speed mode lasts 60 seconds.
  - After a wrong answer, the app shows the correct answer and plays the note.
- **UI:**
  - Touch targets are at least 48 px tall.
  - The theme follows the system light/dark setting.
- **Working name:** "Partitura", package scope `@partitura`, app id `dev.partitura.app`.

---

## File map

```
package.json, pnpm-workspace.yaml, tsconfig.base.json, .gitignore
packages/core/
  package.json, tsconfig.json
  src/index.ts                     re-exports everything below
  src/random.ts                    seeded RNG, weighted pick, shuffle
  src/music/pitch.ts               Pitch, MIDI, diatonic index
  src/music/noteValue.ts           NoteValue, ValueSymbol, lengths
  src/training/answer.ts           Answer union
  src/training/noteReading.ts      note-reading pool, questions, checking, keyboard range
  src/training/noteValues.ts       note-value pool, questions, checking
  src/training/exercise.ts         ExerciseConfig, Question, checkAnswer, nextQuestion, isConfigValid
  src/training/attempt.ts          Attempt
  src/training/selection.ts        adaptive item selection
  src/training/levels.ts           Level presets
  src/training/round.ts            Round state machine
  src/training/progress.ts         RoundRecord, weak items, Level suggestion
  test/*.test.ts
apps/client/
  index.html, vite.config.ts, package.json, capacitor.config.ts, android/
  scripts/fetch-piano-samples.mjs
  public/samples/piano/*.mp3
  src/main.tsx, src/App.tsx, src/App.test.tsx, src/styles.css
  src/test/setup.ts
  src/i18n/pt-BR.ts, src/i18n/format.ts (+ test)
  src/hooks/useKeyDown.ts
  src/render/mei.ts (+ test), src/render/verovio.ts (+ test)
  src/components/Staff.tsx (+ test)
  src/audio/sampleNotes.ts (+ test), src/audio/piano.ts
  src/storage/db.ts (+ test)
  src/training/components/NamePad.tsx, PianoKeyboard.tsx, ChoicePad.tsx (+ tests)
  src/training/feedback.ts (+ test)
  src/training/QuestionView.tsx
  src/training/RoundScreen.tsx (+ test)
  src/training/SummaryScreen.tsx (+ test)
  src/training/ProgressScreen.tsx (+ test)
  src/training/HomeScreen.tsx
  src/training/SetupScreen.tsx (+ test)
```

---

### Task 1: Repository, core package, random helpers and Pitch

**Files:**
- Create: `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `.gitignore`
- Create: `packages/core/package.json`, `packages/core/tsconfig.json`, `packages/core/src/index.ts`
- Create: `packages/core/src/random.ts`, `packages/core/src/music/pitch.ts`
- Test: `packages/core/test/random.test.ts`, `packages/core/test/pitch.test.ts`

**Interfaces:**
- Produces:
  - `type Rng = () => number`
  - `seededRng(seed: number): Rng`
  - `pickWeighted<T>(items: readonly T[], weights: readonly number[], rng: Rng): T`
  - `shuffle<T>(items: readonly T[], rng: Rng): T[]`
  - `STEPS`, `type Step`, `type Alter`, `interface Pitch { step; octave; alter }`
  - `diatonicIndex(p): number`, `fromDiatonicIndex(i, alter?): Pitch`
  - `midiNumber(p): number`, `pitchFromMidi(midi): Pitch` (sharp spelling), `isWhiteKey(midi): boolean`
  - `pitchKey(p): string`, e.g. `"F#3"`

- [ ] **Step 1: Create the repository and workspace files**

```bash
git init
mkdir -p packages/core/src/music packages/core/test apps
```

`package.json`:
```json
{
  "name": "partitura",
  "private": true,
  "scripts": {
    "test": "pnpm -r test",
    "typecheck": "pnpm -r typecheck",
    "dev": "pnpm --filter @partitura/client dev"
  }
}
```

`pnpm-workspace.yaml`:
```yaml
packages:
  - apps/*
  - packages/*
```

`tsconfig.base.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": true,
    "erasableSyntaxOnly": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noEmit": true
  }
}
```

`.gitignore`:
```
node_modules/
dist/
coverage/
.DS_Store
spikes/conversion/input/
spikes/conversion/out/
```

`packages/core/package.json`:
```json
{
  "name": "@partitura/core",
  "private": true,
  "type": "module",
  "exports": { ".": "./src/index.ts" },
  "scripts": {
    "test": "vitest run",
    "typecheck": "tsc -p tsconfig.json"
  }
}
```

`packages/core/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "lib": ["ES2022"], "types": [] },
  "include": ["src", "test"]
}
```

Then:
```bash
pnpm --filter @partitura/core add -D vitest typescript
```

- [ ] **Step 2: Write the failing tests**

`packages/core/test/random.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { pickWeighted, seededRng, shuffle } from '../src/random';

describe('random', () => {
  it('seededRng is deterministic and stays in [0, 1)', () => {
    const a = seededRng(42);
    const b = seededRng(42);
    const xs = Array.from({ length: 5 }, () => a());
    expect(Array.from({ length: 5 }, () => b())).toEqual(xs);
    for (const x of xs) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
  });

  it('pickWeighted never picks a zero-weight item', () => {
    const rng = seededRng(1);
    for (let i = 0; i < 200; i++) expect(pickWeighted(['a', 'b', 'c'], [1, 0, 1], rng)).not.toBe('b');
  });

  it('pickWeighted favours heavier items', () => {
    const rng = seededRng(7);
    let heavy = 0;
    for (let i = 0; i < 1000; i++) if (pickWeighted(['light', 'heavy'], [1, 9], rng) === 'heavy') heavy++;
    expect(heavy).toBeGreaterThan(800);
  });

  it('pickWeighted rejects an empty list', () => {
    expect(() => pickWeighted([], [], seededRng(1))).toThrow();
  });

  it('shuffle keeps every item', () => {
    expect(shuffle([1, 2, 3, 4, 5], seededRng(3)).sort()).toEqual([1, 2, 3, 4, 5]);
  });
});
```

`packages/core/test/pitch.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { diatonicIndex, fromDiatonicIndex, isWhiteKey, midiNumber, pitchFromMidi, pitchKey } from '../src/music/pitch';

describe('pitch', () => {
  it('uses C4 = middle C = MIDI 60', () => {
    expect(midiNumber({ step: 'C', octave: 4, alter: 0 })).toBe(60);
    expect(midiNumber({ step: 'A', octave: 4, alter: 0 })).toBe(69);
    expect(midiNumber({ step: 'B', octave: 3, alter: -1 })).toBe(58);
    expect(midiNumber({ step: 'F', octave: 3, alter: 1 })).toBe(54);
  });

  it('round-trips diatonic indexes', () => {
    expect(diatonicIndex({ step: 'E', octave: 4, alter: 0 })).toBe(30);
    expect(fromDiatonicIndex(30)).toEqual({ step: 'E', octave: 4, alter: 0 });
    expect(fromDiatonicIndex(18)).toEqual({ step: 'G', octave: 2, alter: 0 });
    expect(fromDiatonicIndex(31, 1)).toEqual({ step: 'F', octave: 4, alter: 1 });
  });

  it('spells MIDI numbers with sharps', () => {
    expect(pitchFromMidi(61)).toEqual({ step: 'C', octave: 4, alter: 1 });
    expect(pitchFromMidi(59)).toEqual({ step: 'B', octave: 3, alter: 0 });
    expect(pitchFromMidi(21)).toEqual({ step: 'A', octave: 0, alter: 0 });
  });

  it('knows white keys', () => {
    expect(isWhiteKey(60)).toBe(true);
    expect(isWhiteKey(61)).toBe(false);
    expect(isWhiteKey(64)).toBe(true);
  });

  it('builds stable keys', () => {
    expect(pitchKey({ step: 'F', octave: 3, alter: 1 })).toBe('F#3');
    expect(pitchKey({ step: 'B', octave: 3, alter: -1 })).toBe('Bb3');
    expect(pitchKey({ step: 'C', octave: 4, alter: 0 })).toBe('C4');
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `pnpm --filter @partitura/core test`
Expected: FAIL, "Failed to resolve import ../src/random".

- [ ] **Step 4: Implement**

`packages/core/src/random.ts`:
```ts
/** Returns a number in [0, 1), like Math.random. */
export type Rng = () => number;

/** Deterministic RNG (mulberry32) so tests can reproduce question sequences. */
export function seededRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pickWeighted<T>(items: readonly T[], weights: readonly number[], rng: Rng): T {
  if (items.length === 0) throw new Error('pickWeighted: no items');
  const total = weights.reduce((sum, w) => sum + w, 0);
  let r = rng() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r < 0) return items[i];
  }
  return items[items.length - 1];
}

export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
```

`packages/core/src/music/pitch.ts`:
```ts
export const STEPS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as const;
export type Step = (typeof STEPS)[number];
export type Alter = -1 | 0 | 1;

/** A written pitch. Octaves use scientific numbering: C4 is middle C. */
export interface Pitch {
  step: Step;
  octave: number;
  alter: Alter;
}

const SEMITONE_OF_STEP: Record<Step, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const SHARP_SPELLING: ReadonlyArray<readonly [Step, Alter]> = [
  ['C', 0], ['C', 1], ['D', 0], ['D', 1], ['E', 0], ['F', 0],
  ['F', 1], ['G', 0], ['G', 1], ['A', 0], ['A', 1], ['B', 0],
];

/** Counts lines and spaces: each step up the staff is +1. */
export function diatonicIndex(p: Pitch): number {
  return p.octave * 7 + STEPS.indexOf(p.step);
}

export function fromDiatonicIndex(index: number, alter: Alter = 0): Pitch {
  const octave = Math.floor(index / 7);
  return { step: STEPS[index - octave * 7], octave, alter };
}

export function midiNumber(p: Pitch): number {
  return (p.octave + 1) * 12 + SEMITONE_OF_STEP[p.step] + p.alter;
}

export function pitchFromMidi(midi: number): Pitch {
  const octave = Math.floor(midi / 12) - 1;
  const [step, alter] = SHARP_SPELLING[midi - (octave + 1) * 12];
  return { step, octave, alter };
}

export function isWhiteKey(midi: number): boolean {
  return pitchFromMidi(midi).alter === 0;
}

export function pitchKey(p: Pitch): string {
  const accidental = p.alter === 1 ? '#' : p.alter === -1 ? 'b' : '';
  return `${p.step}${accidental}${p.octave}`;
}
```

`packages/core/src/index.ts`:
```ts
export * from './random';
export * from './music/pitch';
```

- [ ] **Step 5: Run the tests and typecheck**

Run: `pnpm --filter @partitura/core test && pnpm --filter @partitura/core typecheck`
Expected: PASS (10 tests), and no type errors.

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "feat(core): workspace, seeded random helpers and Pitch"
```

---

### Task 2: Note values

**Files:**
- Create: `packages/core/src/music/noteValue.ts`
- Modify: `packages/core/src/index.ts`
- Test: `packages/core/test/noteValue.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `NOTE_VALUES`: ordered longest to shortest: `'whole' | 'half' | 'quarter' | 'eighth' | 'sixteenth' | 'thirty-second' | 'sixty-fourth'`
  - `type NoteValue`
  - `interface ValueSymbol { value: NoteValue; rest: boolean; dotted: boolean }`
  - `denominator(value): number` (1, 2, 4 …, the MEI `dur`)
  - `lengthInWholes(s: ValueSymbol): number`
  - `symbolKey(s): string`, e.g. `"rest-half"`, `"dotted-quarter"`

- [ ] **Step 1: Write the failing test**

`packages/core/test/noteValue.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { denominator, lengthInWholes, symbolKey } from '../src/music/noteValue';

describe('note values', () => {
  it('maps values to MEI denominators', () => {
    expect(denominator('whole')).toBe(1);
    expect(denominator('quarter')).toBe(4);
    expect(denominator('sixty-fourth')).toBe(64);
  });

  it('measures lengths in whole notes, including dots', () => {
    expect(lengthInWholes({ value: 'half', rest: false, dotted: false })).toBe(0.5);
    expect(lengthInWholes({ value: 'half', rest: false, dotted: true })).toBe(0.75);
    expect(lengthInWholes({ value: 'eighth', rest: true, dotted: false })).toBe(0.125);
  });

  it('builds stable keys', () => {
    expect(symbolKey({ value: 'half', rest: true, dotted: false })).toBe('rest-half');
    expect(symbolKey({ value: 'quarter', rest: false, dotted: true })).toBe('dotted-quarter');
    expect(symbolKey({ value: 'whole', rest: false, dotted: false })).toBe('whole');
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm --filter @partitura/core test`
Expected: FAIL, "Failed to resolve import ../src/music/noteValue".

- [ ] **Step 3: Implement**

`packages/core/src/music/noteValue.ts`:
```ts
/** Ordered from longest to shortest. On screen: semibreve … semifusa. */
export const NOTE_VALUES = ['whole', 'half', 'quarter', 'eighth', 'sixteenth', 'thirty-second', 'sixty-fourth'] as const;
export type NoteValue = (typeof NOTE_VALUES)[number];

/** A written note or rest symbol, possibly dotted. */
export interface ValueSymbol {
  value: NoteValue;
  rest: boolean;
  dotted: boolean;
}

/** 1 for whole, 2 for half, 4 for quarter … (the number MEI writes as `dur`). */
export function denominator(value: NoteValue): number {
  return 2 ** NOTE_VALUES.indexOf(value);
}

export function lengthInWholes(s: ValueSymbol): number {
  return (s.dotted ? 1.5 : 1) / denominator(s.value);
}

export function symbolKey(s: ValueSymbol): string {
  return `${s.rest ? 'rest-' : ''}${s.dotted ? 'dotted-' : ''}${s.value}`;
}
```

`packages/core/src/index.ts`:
```ts
export * from './random';
export * from './music/pitch';
export * from './music/noteValue';
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm --filter @partitura/core test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/core
git commit -m "feat(core): note values"
```

---

### Task 3: Note-reading questions

**Files:**
- Create: `packages/core/src/training/answer.ts`, `packages/core/src/training/noteReading.ts`
- Modify: `packages/core/src/index.ts`
- Test: `packages/core/test/noteReading.test.ts`

**Interfaces:**
- Consumes: `Pitch`, `fromDiatonicIndex`, `midiNumber`, `pitchKey` (Task 1).
- Produces:
  - `type Answer = { kind: 'step'; step: Step } | { kind: 'midi'; midi: number } | { kind: 'option'; index: number }`
  - `type Clef = 'treble' | 'bass'`, `type StaffChoice = 'treble' | 'bass' | 'mixed' | 'grand'`
  - `type LedgerLines = 0 | 1 | 2 | 3`, `type AnswerMode = 'name' | 'piano'`
  - `interface NoteReadingSettings { staves; ledgerLines; accidentals }`
  - `interface NoteReadingConfig extends NoteReadingSettings { exercise: 'note-reading'; answerMode }`
  - `interface NoteReadingItem { itemKey; clef; pitch }`
  - `interface NoteReadingQuestion { kind: 'note-reading'; itemKey; clef; layout: 'single' | 'grand'; pitch; answerMode }`
  - `readableRange(clef, ledgerLines): { low: number; high: number }` (diatonic indexes)
  - `clefsFor(staves): Clef[]`, `usesAccidentals(config): boolean`
  - `noteReadingPool(config): NoteReadingItem[]`
  - `toNoteReadingQuestion(item, config): NoteReadingQuestion`
  - `checkNoteReading(q, a): boolean`
  - `keyboardRange(config): { lowMidi: number; highMidi: number }` (whole octaves, C to B)

- [ ] **Step 1: Write the failing test**

`packages/core/test/noteReading.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import {
  checkNoteReading, keyboardRange, noteReadingPool, readableRange, toNoteReadingQuestion,
  type NoteReadingConfig,
} from '../src/training/noteReading';

const config = (over: Partial<NoteReadingConfig> = {}): NoteReadingConfig => ({
  exercise: 'note-reading', staves: 'treble', ledgerLines: 0, accidentals: false, answerMode: 'name', ...over,
});

describe('readableRange', () => {
  it('covers only the five lines and four spaces with no ledger lines', () => {
    expect(readableRange('treble', 0)).toEqual({ low: 30, high: 38 }); // E4–F5
    expect(readableRange('bass', 0)).toEqual({ low: 18, high: 26 }); // G2–A3
  });

  it('adds the notes on and just beyond each ledger line', () => {
    expect(readableRange('treble', 1)).toEqual({ low: 27, high: 41 }); // B3–B5
    expect(readableRange('bass', 1)).toEqual({ low: 15, high: 29 }); // D2–D4
    expect(readableRange('bass', 3)).toEqual({ low: 11, high: 33 });
  });
});

describe('noteReadingPool', () => {
  it('lists every natural note of the staff', () => {
    const pool = noteReadingPool(config());
    expect(pool).toHaveLength(9);
    expect(pool[0].itemKey).toBe('nr:treble:E4');
    expect(pool[8].itemKey).toBe('nr:treble:F5');
  });

  it('uses both clefs for mixed and grand staves', () => {
    expect(noteReadingPool(config({ staves: 'mixed' }))).toHaveLength(18);
    expect(noteReadingPool(config({ staves: 'grand' })).some((i) => i.clef === 'bass')).toBe(true);
  });

  it('ignores accidentals when answering by name', () => {
    expect(noteReadingPool(config({ accidentals: true }))).toHaveLength(9);
  });

  it('adds sharps and flats, but never E#, B#, Cb or Fb, when answering on the piano', () => {
    const pool = noteReadingPool(config({ accidentals: true, answerMode: 'piano' }));
    expect(pool).toHaveLength(21);
    const keys = pool.map((i) => i.itemKey);
    expect(keys).toContain('nr:treble:F#4');
    expect(keys).toContain('nr:treble:Bb4');
    expect(keys).not.toContain('nr:treble:E#4');
    expect(keys).not.toContain('nr:treble:Cb5');
  });
});

describe('questions and answers', () => {
  const d5 = { itemKey: 'nr:treble:D5', clef: 'treble' as const, pitch: { step: 'D' as const, octave: 5, alter: 0 as const } };

  it('uses the grand-staff layout only for grand staves', () => {
    expect(toNoteReadingQuestion(d5, config()).layout).toBe('single');
    expect(toNoteReadingQuestion(d5, config({ staves: 'grand' })).layout).toBe('grand');
  });

  it('ignores the octave when answering by name', () => {
    const q = toNoteReadingQuestion(d5, config());
    expect(checkNoteReading(q, { kind: 'step', step: 'D' })).toBe(true);
    expect(checkNoteReading(q, { kind: 'step', step: 'C' })).toBe(false);
    expect(checkNoteReading(q, { kind: 'midi', midi: 74 })).toBe(false);
  });

  it('requires the exact key when answering on the piano', () => {
    const q = toNoteReadingQuestion(d5, config({ answerMode: 'piano' }));
    expect(checkNoteReading(q, { kind: 'midi', midi: 74 })).toBe(true);
    expect(checkNoteReading(q, { kind: 'midi', midi: 62 })).toBe(false);
  });

  it('sizes the on-screen keyboard to whole octaves around the pool', () => {
    expect(keyboardRange(config({ answerMode: 'piano' }))).toEqual({ lowMidi: 60, highMidi: 83 });
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm --filter @partitura/core test`
Expected: FAIL, "Failed to resolve import ../src/training/noteReading".

- [ ] **Step 3: Implement**

`packages/core/src/training/answer.ts`:
```ts
import type { Step } from '../music/pitch';

/** What the user gave: a Pitch name, a piano key, or the index of a multiple-choice option. */
export type Answer =
  | { kind: 'step'; step: Step }
  | { kind: 'midi'; midi: number }
  | { kind: 'option'; index: number };
```

`packages/core/src/training/noteReading.ts`:
```ts
import { fromDiatonicIndex, midiNumber, pitchKey, type Alter, type Pitch } from '../music/pitch';
import type { Answer } from './answer';

export type Clef = 'treble' | 'bass';
/** Which staff or staves a note-reading Exercise uses. "mixed" alternates single staves; "grand" shows both. */
export type StaffChoice = 'treble' | 'bass' | 'mixed' | 'grand';
export type LedgerLines = 0 | 1 | 2 | 3;
export type AnswerMode = 'name' | 'piano';

export interface NoteReadingSettings {
  staves: StaffChoice;
  ledgerLines: LedgerLines;
  accidentals: boolean;
}

export interface NoteReadingConfig extends NoteReadingSettings {
  exercise: 'note-reading';
  answerMode: AnswerMode;
}

export interface NoteReadingItem {
  itemKey: string;
  clef: Clef;
  pitch: Pitch;
}

export interface NoteReadingQuestion {
  kind: 'note-reading';
  itemKey: string;
  clef: Clef;
  layout: 'single' | 'grand';
  pitch: Pitch;
  answerMode: AnswerMode;
}

/** Diatonic indexes of the bottom and top staff lines: E4–F5 and G2–A3. */
const STAFF_LINES: Record<Clef, { bottom: number; top: number }> = {
  treble: { bottom: 30, top: 38 },
  bass: { bottom: 18, top: 26 },
};

/**
 * With 0 ledger lines: only the five lines and four spaces.
 * With n ≥ 1: also every note on the first n ledger lines, plus the note just beyond the nth.
 */
export function readableRange(clef: Clef, ledgerLines: LedgerLines): { low: number; high: number } {
  const { bottom, top } = STAFF_LINES[clef];
  const extra = ledgerLines === 0 ? 0 : 2 * ledgerLines + 1;
  return { low: bottom - extra, high: top + extra };
}

export function clefsFor(staves: StaffChoice): Clef[] {
  if (staves === 'treble') return ['treble'];
  if (staves === 'bass') return ['bass'];
  return ['treble', 'bass'];
}

/** Accidentals appear only when answering on the piano. */
export function usesAccidentals(config: NoteReadingConfig): boolean {
  return config.accidentals && config.answerMode === 'piano';
}

const NO_SHARP = new Set(['E', 'B']);
const NO_FLAT = new Set(['C', 'F']);

export function noteReadingPool(config: NoteReadingConfig): NoteReadingItem[] {
  const alters: Alter[] = usesAccidentals(config) ? [0, 1, -1] : [0];
  const items: NoteReadingItem[] = [];
  for (const clef of clefsFor(config.staves)) {
    const { low, high } = readableRange(clef, config.ledgerLines);
    for (let index = low; index <= high; index++) {
      for (const alter of alters) {
        const pitch = fromDiatonicIndex(index, alter);
        if (alter === 1 && NO_SHARP.has(pitch.step)) continue;
        if (alter === -1 && NO_FLAT.has(pitch.step)) continue;
        items.push({ itemKey: `nr:${clef}:${pitchKey(pitch)}`, clef, pitch });
      }
    }
  }
  return items;
}

export function toNoteReadingQuestion(item: NoteReadingItem, config: NoteReadingConfig): NoteReadingQuestion {
  return {
    kind: 'note-reading',
    itemKey: item.itemKey,
    clef: item.clef,
    layout: config.staves === 'grand' ? 'grand' : 'single',
    pitch: item.pitch,
    answerMode: config.answerMode,
  };
}

export function checkNoteReading(q: NoteReadingQuestion, a: Answer): boolean {
  if (q.answerMode === 'name') return a.kind === 'step' && a.step === q.pitch.step;
  return a.kind === 'midi' && a.midi === midiNumber(q.pitch);
}

/** The on-screen piano covers whole octaves (C to B) around every note the Exercise can ask. */
export function keyboardRange(config: NoteReadingConfig): { lowMidi: number; highMidi: number } {
  const midis = noteReadingPool(config).map((item) => midiNumber(item.pitch));
  const low = Math.min(...midis);
  const high = Math.max(...midis);
  return { lowMidi: low - (low % 12), highMidi: high + (11 - (high % 12)) };
}
```

`packages/core/src/index.ts`:
```ts
export * from './random';
export * from './music/pitch';
export * from './music/noteValue';
export * from './training/answer';
export * from './training/noteReading';
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm --filter @partitura/core test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/core
git commit -m "feat(core): note-reading pool, questions and answer checking"
```

---

### Task 4: Note-value questions

**Files:**
- Create: `packages/core/src/training/noteValues.ts`
- Modify: `packages/core/src/index.ts`
- Test: `packages/core/test/noteValues.test.ts`

**Interfaces:**
- Consumes: `NOTE_VALUES`, `NoteValue`, `ValueSymbol`, `lengthInWholes`, `symbolKey` (Task 2); `shuffle`, `Rng` (Task 1); `Answer` (Task 3).
- Produces:
  - `type NoteValueQuestionType = 'symbol-to-name' | 'name-to-symbol' | 'relation'`
  - `interface NoteValueSettings { values: NoteValue[]; types: NoteValueQuestionType[]; rests: boolean; dotted: boolean }`
  - `interface NoteValueConfig extends NoteValueSettings { exercise: 'note-value' }`
  - `type NoteValueItem`
  - `type NoteValueQuestion`:
    - `{ kind: 'note-value'; type: 'symbol-to-name' | 'name-to-symbol'; itemKey; symbol: ValueSymbol; options: ValueSymbol[]; correctIndex: number }`
    - or `{ kind: 'note-value'; type: 'relation'; itemKey; whole: ValueSymbol; part: ValueSymbol; options: number[]; correctIndex: number }`
  - `symbolPool(settings): ValueSymbol[]`
  - `noteValuePool(settings): NoteValueItem[]`
  - `relationAnswer(whole, part): number`
  - `toNoteValueQuestion(item, settings, rng): NoteValueQuestion`
  - `checkNoteValue(q, a): boolean`

- [ ] **Step 1: Write the failing test**

`packages/core/test/noteValues.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { symbolKey } from '../src/music/noteValue';
import { seededRng } from '../src/random';
import {
  checkNoteValue, noteValuePool, relationAnswer, symbolPool, toNoteValueQuestion,
  type NoteValueSettings,
} from '../src/training/noteValues';

const basic: NoteValueSettings = {
  values: ['whole', 'half', 'quarter', 'eighth'], types: ['symbol-to-name'], rests: false, dotted: false,
};

describe('symbolPool', () => {
  it('lists the chosen values', () => {
    expect(symbolPool(basic).map(symbolKey)).toEqual(['whole', 'half', 'quarter', 'eighth']);
  });

  it('adds dotted notes and rests when asked', () => {
    const pool = symbolPool({ ...basic, values: ['half', 'quarter'], rests: true, dotted: true });
    expect(pool.map(symbolKey)).toEqual(['half', 'dotted-half', 'rest-half', 'quarter', 'dotted-quarter', 'rest-quarter']);
  });

  it('never dots sixteenths or shorter', () => {
    expect(symbolPool({ ...basic, values: ['sixteenth'], dotted: true }).map(symbolKey)).toEqual(['sixteenth']);
  });
});

describe('noteValuePool', () => {
  it('builds one item per symbol and question type', () => {
    const pool = noteValuePool({ ...basic, types: ['symbol-to-name', 'name-to-symbol'] });
    expect(pool).toHaveLength(8);
    expect(pool[0].itemKey).toBe('nv:symbol-to-name:whole');
  });

  it('builds relations only where the answer is a whole number from 2 to 16', () => {
    const pool = noteValuePool({ ...basic, types: ['relation'] });
    expect(pool.map((i) => i.itemKey)).toEqual([
      'nv:relation:whole/half', 'nv:relation:whole/quarter', 'nv:relation:whole/eighth',
      'nv:relation:half/quarter', 'nv:relation:half/eighth', 'nv:relation:quarter/eighth',
    ]);
  });

  it('includes dotted relations such as "mínima pontuada = 3 semínimas"', () => {
    const pool = noteValuePool({ ...basic, types: ['relation'], dotted: true });
    expect(pool).toHaveLength(12);
    const item = pool.find((i) => i.itemKey === 'nv:relation:dotted-half/quarter');
    expect(item && item.type === 'relation' && relationAnswer(item.whole, item.part)).toBe(3);
  });

  it('is empty when nothing can be asked', () => {
    expect(noteValuePool({ ...basic, values: [] })).toHaveLength(0);
    expect(noteValuePool({ ...basic, values: ['whole'], types: ['relation'] })).toHaveLength(0);
  });
});

describe('toNoteValueQuestion', () => {
  it('offers four distinct symbols including the right one', () => {
    const [item] = noteValuePool(basic);
    const q = toNoteValueQuestion(item, basic, seededRng(5));
    if (q.type === 'relation') throw new Error('expected a symbol question');
    expect(q.options).toHaveLength(4);
    expect(new Set(q.options.map(symbolKey)).size).toBe(4);
    expect(symbolKey(q.options[q.correctIndex])).toBe(symbolKey(q.symbol));
  });

  it('draws distractors of the same kind (rest vs note) when there are enough', () => {
    const settings = { ...basic, rests: true };
    const item = noteValuePool(settings).find((i) => i.itemKey === 'nv:symbol-to-name:rest-half')!;
    const q = toNoteValueQuestion(item, settings, seededRng(9));
    if (q.type === 'relation') throw new Error('expected a symbol question');
    expect(q.options.every((s) => s.rest)).toBe(true);
  });

  it('offers four distinct numbers for a relation', () => {
    const settings = { ...basic, types: ['relation' as const] };
    for (const item of noteValuePool(settings)) {
      const q = toNoteValueQuestion(item, settings, seededRng(2));
      if (q.type !== 'relation') throw new Error('expected a relation');
      expect(q.options).toHaveLength(4);
      expect(new Set(q.options).size).toBe(4);
      expect(q.options[q.correctIndex]).toBe(relationAnswer(q.whole, q.part));
      expect(q.options.every((n) => Number.isInteger(n) && n >= 1)).toBe(true);
    }
  });

  it('checks answers by option index', () => {
    const [item] = noteValuePool(basic);
    const q = toNoteValueQuestion(item, basic, seededRng(1));
    expect(checkNoteValue(q, { kind: 'option', index: q.correctIndex })).toBe(true);
    expect(checkNoteValue(q, { kind: 'option', index: (q.correctIndex + 1) % 4 })).toBe(false);
    expect(checkNoteValue(q, { kind: 'step', step: 'C' })).toBe(false);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm --filter @partitura/core test`
Expected: FAIL, "Failed to resolve import ../src/training/noteValues".

- [ ] **Step 3: Implement**

`packages/core/src/training/noteValues.ts`:
```ts
import { NOTE_VALUES, lengthInWholes, symbolKey, type NoteValue, type ValueSymbol } from '../music/noteValue';
import { shuffle, type Rng } from '../random';
import type { Answer } from './answer';

export type NoteValueQuestionType = 'symbol-to-name' | 'name-to-symbol' | 'relation';

export interface NoteValueSettings {
  values: NoteValue[];
  types: NoteValueQuestionType[];
  rests: boolean;
  dotted: boolean;
}

export interface NoteValueConfig extends NoteValueSettings {
  exercise: 'note-value';
}

export type NoteValueItem =
  | { itemKey: string; type: 'symbol-to-name' | 'name-to-symbol'; symbol: ValueSymbol }
  | { itemKey: string; type: 'relation'; whole: ValueSymbol; part: ValueSymbol };

export type NoteValueQuestion =
  | {
      kind: 'note-value';
      type: 'symbol-to-name' | 'name-to-symbol';
      itemKey: string;
      symbol: ValueSymbol;
      options: ValueSymbol[];
      correctIndex: number;
    }
  | {
      kind: 'note-value';
      type: 'relation';
      itemKey: string;
      whole: ValueSymbol;
      part: ValueSymbol;
      options: number[];
      correctIndex: number;
    };

const DOTTABLE: ReadonlySet<NoteValue> = new Set<NoteValue>(['whole', 'half', 'quarter', 'eighth']);
const note = (value: NoteValue, dotted = false): ValueSymbol => ({ value, rest: false, dotted });

export function symbolPool(settings: NoteValueSettings): ValueSymbol[] {
  const out: ValueSymbol[] = [];
  for (const value of NOTE_VALUES) {
    if (!settings.values.includes(value)) continue;
    out.push(note(value));
    if (settings.dotted && DOTTABLE.has(value)) out.push(note(value, true));
    if (settings.rests) out.push({ value, rest: true, dotted: false });
  }
  return out;
}

/** "How many <part> fit in one <whole>?" */
export function relationAnswer(whole: ValueSymbol, part: ValueSymbol): number {
  return lengthInWholes(whole) / lengthInWholes(part);
}

export function noteValuePool(settings: NoteValueSettings): NoteValueItem[] {
  const symbols = symbolPool(settings);
  const items: NoteValueItem[] = [];
  for (const type of settings.types) {
    if (type === 'relation') {
      for (const whole of symbols.filter((s) => !s.rest)) {
        for (const value of NOTE_VALUES) {
          if (!settings.values.includes(value)) continue;
          const part = note(value);
          const answer = relationAnswer(whole, part);
          if (Number.isInteger(answer) && answer >= 2 && answer <= 16) {
            items.push({ itemKey: `nv:relation:${symbolKey(whole)}/${value}`, type, whole, part });
          }
        }
      }
    } else {
      for (const symbol of symbols) items.push({ itemKey: `nv:${type}:${symbolKey(symbol)}`, type, symbol });
    }
  }
  return items;
}

function relationDistractors(answer: number): number[] {
  const out: number[] = [];
  for (const candidate of [answer * 2, answer / 2, answer + 1, answer - 1, answer + 2]) {
    if (out.length < 3 && Number.isInteger(candidate) && candidate >= 1 && candidate !== answer && !out.includes(candidate)) {
      out.push(candidate);
    }
  }
  return out;
}

export function toNoteValueQuestion(item: NoteValueItem, settings: NoteValueSettings, rng: Rng): NoteValueQuestion {
  if (item.type === 'relation') {
    const answer = relationAnswer(item.whole, item.part);
    const options = shuffle([answer, ...relationDistractors(answer)], rng);
    return {
      kind: 'note-value', type: 'relation', itemKey: item.itemKey,
      whole: item.whole, part: item.part, options, correctIndex: options.indexOf(answer),
    };
  }
  const key = symbolKey(item.symbol);
  const others = symbolPool(settings).filter((s) => symbolKey(s) !== key);
  const sameKind = others.filter((s) => s.rest === item.symbol.rest);
  const distractors = shuffle(sameKind.length >= 3 ? sameKind : others, rng).slice(0, 3);
  const options = shuffle([item.symbol, ...distractors], rng);
  return {
    kind: 'note-value', type: item.type, itemKey: item.itemKey,
    symbol: item.symbol, options, correctIndex: options.findIndex((s) => symbolKey(s) === key),
  };
}

export function checkNoteValue(q: NoteValueQuestion, a: Answer): boolean {
  return a.kind === 'option' && a.index === q.correctIndex;
}
```

`packages/core/src/index.ts`: add the line `export * from './training/noteValues';` at the end.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm --filter @partitura/core test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/core
git commit -m "feat(core): note-value pool, questions and answer checking"
```

---

### Task 5: Exercises, Attempts, adaptive selection and Levels

**Files:**
- Create: `packages/core/src/training/exercise.ts`, `attempt.ts`, `selection.ts`, `levels.ts` (all in `packages/core/src/training/`)
- Modify: `packages/core/src/index.ts`
- Test: `packages/core/test/selection.test.ts`, `packages/core/test/exercise.test.ts`

**Interfaces:**
- Consumes: Tasks 1–4.
- Produces:
  - `type ExerciseKind = 'note-reading' | 'note-value'`
  - `type ExerciseConfig = NoteReadingConfig | NoteValueConfig`
  - `type Question = NoteReadingQuestion | NoteValueQuestion`
  - `checkAnswer(q: Question, a: Answer): boolean`
  - `isConfigValid(config): boolean`
  - `nextQuestion(config, history: readonly Attempt[], previousKey: string | null, rng): Question`
  - `interface Attempt { id; roundId; exercise; itemKey; question; answer; correct; ms; answeredAt }` (ISO string)
  - `interface ItemStats { n; wrong; medianMs }`, `itemStats(attempts): Map<string, ItemStats>`, `itemWeight(stats | undefined): number`
  - `pickItem<T extends { itemKey: string }>(pool, history, previousKey, rng): T`
  - `interface Level<S> { id; number; settings: S }`
  - `NOTE_READING_LEVELS: Level<NoteReadingSettings>[]` (ids `nr-1` … `nr-6`)
  - `NOTE_VALUE_LEVELS: Level<NoteValueSettings>[]` (ids `nv-1` … `nv-6`)
  - `levelOrder(exercise): { id: string; number: number }[]`

- [ ] **Step 1: Write the failing tests**

`packages/core/test/selection.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { seededRng } from '../src/random';
import type { Attempt } from '../src/training/attempt';
import type { Question } from '../src/training/exercise';
import { itemStats, itemWeight, pickItem } from '../src/training/selection';

let seq = 0;
const attempt = (itemKey: string, correct: boolean, ms = 1000): Attempt => ({
  id: `a${seq++}`, roundId: 'r', exercise: 'note-reading', itemKey, question: {} as Question,
  answer: { kind: 'step', step: 'C' }, correct, ms, answeredAt: '2026-10-07T10:00:00.000Z',
});

describe('itemWeight', () => {
  it('gives unseen items a coverage bonus', () => expect(itemWeight(undefined)).toBe(2));
  it('gives mastered items the base weight', () => expect(itemWeight({ n: 5, wrong: 0, medianMs: 900 })).toBe(1));
  it('grows with the error rate', () => expect(itemWeight({ n: 4, wrong: 2, medianMs: 900 })).toBe(3));
  it('adds one for slow answers', () => expect(itemWeight({ n: 4, wrong: 0, medianMs: 3500 })).toBe(2));
});

describe('itemStats', () => {
  it('only looks at the 10 most recent attempts of an item', () => {
    const history = [
      ...Array.from({ length: 10 }, () => attempt('x', false)),
      ...Array.from({ length: 10 }, () => attempt('x', true, 500)),
    ];
    expect(itemStats(history).get('x')).toEqual({ n: 10, wrong: 0, medianMs: 500 });
  });
});

describe('pickItem', () => {
  const pool = [{ itemKey: 'a' }, { itemKey: 'b' }, { itemKey: 'c' }];

  it('never repeats the previous item when there is a choice', () => {
    const rng = seededRng(4);
    for (let i = 0; i < 100; i++) expect(pickItem(pool, [], 'b', rng).itemKey).not.toBe('b');
  });

  it('can repeat when the pool has one item', () => {
    expect(pickItem([{ itemKey: 'a' }], [], 'a', seededRng(1)).itemKey).toBe('a');
  });

  it('asks more often about items the user gets wrong', () => {
    const history = [
      ...Array.from({ length: 5 }, () => attempt('a', true)),
      ...Array.from({ length: 5 }, () => attempt('b', false)),
      ...Array.from({ length: 5 }, () => attempt('c', true)),
    ];
    const rng = seededRng(11);
    const counts: Record<string, number> = { a: 0, b: 0, c: 0 };
    for (let i = 0; i < 1000; i++) counts[pickItem(pool, history, null, rng).itemKey]++;
    expect(counts.b).toBeGreaterThan(600);
  });
});
```

`packages/core/test/exercise.test.ts`:
```ts
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
```

- [ ] **Step 2: Run them to verify they fail**

Run: `pnpm --filter @partitura/core test`
Expected: FAIL, "Failed to resolve import ../src/training/selection".

- [ ] **Step 3: Implement**

`packages/core/src/training/attempt.ts`:
```ts
import type { Answer } from './answer';
import type { ExerciseKind, Question } from './exercise';

/** One answered question. Attempts are only ever added, never changed. */
export interface Attempt {
  id: string;
  roundId: string;
  exercise: ExerciseKind;
  itemKey: string;
  question: Question;
  answer: Answer;
  correct: boolean;
  ms: number;
  /** ISO 8601 timestamp. */
  answeredAt: string;
}
```

`packages/core/src/training/selection.ts`:
```ts
import { pickWeighted, type Rng } from '../random';
import type { Attempt } from './attempt';

export interface ItemStats {
  n: number;
  wrong: number;
  medianMs: number;
}

export const STATS_WINDOW = 10;
export const SLOW_MS = 3000;

/** Stats per itemKey over its most recent attempts. Expects attempts oldest first. */
export function itemStats(attempts: readonly Attempt[]): Map<string, ItemStats> {
  const byKey = new Map<string, Attempt[]>();
  for (const a of attempts) {
    const list = byKey.get(a.itemKey) ?? [];
    list.push(a);
    byKey.set(a.itemKey, list);
  }
  const stats = new Map<string, ItemStats>();
  for (const [key, list] of byKey) {
    const recent = list.slice(-STATS_WINDOW);
    const times = recent.map((a) => a.ms).sort((x, y) => x - y);
    stats.set(key, {
      n: recent.length,
      wrong: recent.filter((a) => !a.correct).length,
      medianMs: times[Math.floor(times.length / 2)],
    });
  }
  return stats;
}

/** Unseen items get a coverage bonus; missed and slow items come up more often. */
export function itemWeight(stats: ItemStats | undefined): number {
  if (!stats) return 2;
  return 1 + 4 * (stats.wrong / stats.n) + (stats.medianMs > SLOW_MS ? 1 : 0);
}

export function pickItem<T extends { itemKey: string }>(
  pool: readonly T[],
  history: readonly Attempt[],
  previousKey: string | null,
  rng: Rng,
): T {
  const candidates = pool.length > 1 ? pool.filter((item) => item.itemKey !== previousKey) : pool;
  const stats = itemStats(history);
  return pickWeighted(candidates, candidates.map((item) => itemWeight(stats.get(item.itemKey))), rng);
}
```

`packages/core/src/training/exercise.ts`:
```ts
import type { Rng } from '../random';
import type { Answer } from './answer';
import type { Attempt } from './attempt';
import {
  checkNoteReading, noteReadingPool, toNoteReadingQuestion,
  type NoteReadingConfig, type NoteReadingQuestion,
} from './noteReading';
import {
  checkNoteValue, noteValuePool, toNoteValueQuestion,
  type NoteValueConfig, type NoteValueQuestion,
} from './noteValues';
import { pickItem } from './selection';

export type ExerciseKind = 'note-reading' | 'note-value';
export type ExerciseConfig = NoteReadingConfig | NoteValueConfig;
export type Question = NoteReadingQuestion | NoteValueQuestion;

export function checkAnswer(q: Question, a: Answer): boolean {
  return q.kind === 'note-reading' ? checkNoteReading(q, a) : checkNoteValue(q, a);
}

export function isConfigValid(config: ExerciseConfig): boolean {
  return config.exercise === 'note-reading'
    ? noteReadingPool(config).length > 0
    : noteValuePool(config).length > 0;
}

/** Picks the next question, favouring items with poor Attempts and never repeating the previous one. */
export function nextQuestion(
  config: ExerciseConfig,
  history: readonly Attempt[],
  previousKey: string | null,
  rng: Rng,
): Question {
  if (config.exercise === 'note-reading') {
    return toNoteReadingQuestion(pickItem(noteReadingPool(config), history, previousKey, rng), config);
  }
  return toNoteValueQuestion(pickItem(noteValuePool(config), history, previousKey, rng), config, rng);
}
```

`packages/core/src/training/levels.ts`:
```ts
import { NOTE_VALUES, type NoteValue } from '../music/noteValue';
import type { ExerciseKind } from './exercise';
import type { NoteReadingSettings } from './noteReading';
import type { NoteValueQuestionType, NoteValueSettings } from './noteValues';

export interface Level<S> {
  id: string;
  number: number;
  settings: S;
}

export const NOTE_READING_LEVELS: Level<NoteReadingSettings>[] = [
  { id: 'nr-1', number: 1, settings: { staves: 'treble', ledgerLines: 0, accidentals: false } },
  { id: 'nr-2', number: 2, settings: { staves: 'bass', ledgerLines: 0, accidentals: false } },
  { id: 'nr-3', number: 3, settings: { staves: 'grand', ledgerLines: 0, accidentals: false } },
  { id: 'nr-4', number: 4, settings: { staves: 'grand', ledgerLines: 1, accidentals: false } },
  { id: 'nr-5', number: 5, settings: { staves: 'grand', ledgerLines: 2, accidentals: false } },
  { id: 'nr-6', number: 6, settings: { staves: 'grand', ledgerLines: 3, accidentals: true } },
];

const BASIC: NoteValue[] = ['whole', 'half', 'quarter', 'eighth'];
const WITH_SIXTEENTH: NoteValue[] = [...BASIC, 'sixteenth'];
const NAMING: NoteValueQuestionType[] = ['symbol-to-name', 'name-to-symbol'];
const ALL_TYPES: NoteValueQuestionType[] = [...NAMING, 'relation'];

export const NOTE_VALUE_LEVELS: Level<NoteValueSettings>[] = [
  { id: 'nv-1', number: 1, settings: { values: BASIC, types: ['symbol-to-name'], rests: false, dotted: false } },
  { id: 'nv-2', number: 2, settings: { values: WITH_SIXTEENTH, types: NAMING, rests: false, dotted: false } },
  { id: 'nv-3', number: 3, settings: { values: WITH_SIXTEENTH, types: NAMING, rests: true, dotted: false } },
  { id: 'nv-4', number: 4, settings: { values: WITH_SIXTEENTH, types: ALL_TYPES, rests: true, dotted: false } },
  { id: 'nv-5', number: 5, settings: { values: [...WITH_SIXTEENTH, 'thirty-second'], types: ALL_TYPES, rests: true, dotted: true } },
  { id: 'nv-6', number: 6, settings: { values: [...NOTE_VALUES], types: ALL_TYPES, rests: true, dotted: true } },
];

export function levelOrder(exercise: ExerciseKind): { id: string; number: number }[] {
  const levels: readonly { id: string; number: number }[] =
    exercise === 'note-reading' ? NOTE_READING_LEVELS : NOTE_VALUE_LEVELS;
  return levels.map(({ id, number }) => ({ id, number }));
}
```

`packages/core/src/index.ts`:
```ts
export * from './random';
export * from './music/pitch';
export * from './music/noteValue';
export * from './training/answer';
export * from './training/noteReading';
export * from './training/noteValues';
export * from './training/attempt';
export * from './training/selection';
export * from './training/exercise';
export * from './training/levels';
```

- [ ] **Step 4: Run the tests and typecheck**

Run: `pnpm --filter @partitura/core test && pnpm --filter @partitura/core typecheck`
Expected: PASS, and no type errors.

- [ ] **Step 5: Commit**

```bash
git add packages/core
git commit -m "feat(core): adaptive question selection, Attempts and Levels"
```

---

### Task 6: Round state machine

**Files:**
- Create: `packages/core/src/training/round.ts`
- Modify: `packages/core/src/index.ts`
- Test: `packages/core/test/round.test.ts`

**Interfaces:**
- Consumes: `Question`, `checkAnswer` (Task 5); `Answer` (Task 3).
- Produces:
  - `type RoundMode = { kind: 'count'; total: number } | { kind: 'timed'; durationMs: number }`
  - `DEFAULT_ROUND` (20 questions), `SPEED_ROUND` (60 000 ms)
  - `interface RoundState { mode; startedAt; question; questionShownAt; status: 'asking' | 'feedback' | 'finished'; answered; correct; totalMs; last: { answer; correct } | null }`
  - `startRound(mode, first, now): RoundState`
  - `answerQuestion(state, answer, now): { state; correct; ms }` (throws unless asking)
  - `isRoundOver(state, now): boolean`
  - `advance(state, now, makeNext: () => Question): RoundState`
  - `tick(state, now): RoundState`
  - `remainingMs(state, now): number | null`
  - `averageMs(state): number`

- [ ] **Step 1: Write the failing test**

`packages/core/test/round.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import type { Question } from '../src/training/exercise';
import { advance, answerQuestion, averageMs, remainingMs, startRound, tick } from '../src/training/round';

const question = (step: 'C' | 'D'): Question => ({
  kind: 'note-reading', itemKey: `nr:treble:${step}5`, clef: 'treble', layout: 'single',
  pitch: { step, octave: 5, alter: 0 }, answerMode: 'name',
});

describe('count rounds', () => {
  it('asks, gives feedback, advances and finishes after the last question', () => {
    let s = startRound({ kind: 'count', total: 2 }, question('D'), 1000);
    expect(s.status).toBe('asking');

    const first = answerQuestion(s, { kind: 'step', step: 'D' }, 2500);
    expect(first.correct).toBe(true);
    expect(first.ms).toBe(1500);
    s = first.state;
    expect(s.status).toBe('feedback');
    expect(s.answered).toBe(1);

    s = advance(s, 3000, () => question('C'));
    expect(s.status).toBe('asking');
    expect(s.question.itemKey).toBe('nr:treble:C5');
    expect(s.last).toBeNull();

    s = answerQuestion(s, { kind: 'step', step: 'E' }, 5000).state;
    expect(s.last).toEqual({ answer: { kind: 'step', step: 'E' }, correct: false });

    s = advance(s, 5100, () => { throw new Error('must not ask again'); });
    expect(s.status).toBe('finished');
    expect(s.correct).toBe(1);
    expect(averageMs(s)).toBe(1750);
  });

  it('refuses a second answer to the same question', () => {
    const s = answerQuestion(startRound({ kind: 'count', total: 2 }, question('D'), 0), { kind: 'step', step: 'D' }, 10).state;
    expect(() => answerQuestion(s, { kind: 'step', step: 'D' }, 20)).toThrow();
  });
});

describe('timed rounds', () => {
  it('finishes on a tick once time is up', () => {
    const s = startRound({ kind: 'timed', durationMs: 60_000 }, question('D'), 0);
    expect(tick(s, 59_999)).toBe(s);
    expect(remainingMs(s, 59_000)).toBe(1000);
    const done = tick(s, 60_000);
    expect(done.status).toBe('finished');
    expect(done.answered).toBe(0);
  });

  it('finishes instead of advancing when time ran out during feedback', () => {
    let s = startRound({ kind: 'timed', durationMs: 1000 }, question('D'), 0);
    s = answerQuestion(s, { kind: 'step', step: 'D' }, 900).state;
    expect(advance(s, 1200, () => question('C')).status).toBe('finished');
  });

  it('has no remaining time in count mode', () => {
    expect(remainingMs(startRound({ kind: 'count', total: 20 }, question('D'), 0), 5)).toBeNull();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm --filter @partitura/core test`
Expected: FAIL, "Failed to resolve import ../src/training/round".

- [ ] **Step 3: Implement**

`packages/core/src/training/round.ts`:
```ts
import type { Answer } from './answer';
import { checkAnswer, type Question } from './exercise';

export type RoundMode = { kind: 'count'; total: number } | { kind: 'timed'; durationMs: number };
export const DEFAULT_ROUND: RoundMode = { kind: 'count', total: 20 };
export const SPEED_ROUND: RoundMode = { kind: 'timed', durationMs: 60_000 };

export type RoundStatus = 'asking' | 'feedback' | 'finished';

export interface RoundState {
  mode: RoundMode;
  startedAt: number;
  question: Question;
  questionShownAt: number;
  status: RoundStatus;
  answered: number;
  correct: number;
  totalMs: number;
  last: { answer: Answer; correct: boolean } | null;
}

export function startRound(mode: RoundMode, first: Question, now: number): RoundState {
  return {
    mode, startedAt: now, question: first, questionShownAt: now,
    status: 'asking', answered: 0, correct: 0, totalMs: 0, last: null,
  };
}

export function answerQuestion(
  state: RoundState,
  answer: Answer,
  now: number,
): { state: RoundState; correct: boolean; ms: number } {
  if (state.status !== 'asking') throw new Error(`answerQuestion: round is ${state.status}`);
  const correct = checkAnswer(state.question, answer);
  const ms = now - state.questionShownAt;
  return {
    correct,
    ms,
    state: {
      ...state,
      status: 'feedback',
      answered: state.answered + 1,
      correct: state.correct + (correct ? 1 : 0),
      totalMs: state.totalMs + ms,
      last: { answer, correct },
    },
  };
}

export function isRoundOver(state: RoundState, now: number): boolean {
  return state.mode.kind === 'count'
    ? state.answered >= state.mode.total
    : now - state.startedAt >= state.mode.durationMs;
}

/** Moves from feedback to the next question, or finishes the Round. */
export function advance(state: RoundState, now: number, makeNext: () => Question): RoundState {
  if (state.status === 'finished') return state;
  if (isRoundOver(state, now)) return { ...state, status: 'finished' };
  return { ...state, status: 'asking', question: makeNext(), questionShownAt: now, last: null };
}

/** In speed mode, ends the Round when time runs out while a question is open. */
export function tick(state: RoundState, now: number): RoundState {
  if (state.status === 'asking' && state.mode.kind === 'timed' && isRoundOver(state, now)) {
    return { ...state, status: 'finished' };
  }
  return state;
}

export function remainingMs(state: RoundState, now: number): number | null {
  if (state.mode.kind !== 'timed') return null;
  return Math.max(0, state.mode.durationMs - (now - state.startedAt));
}

export function averageMs(state: RoundState): number {
  return state.answered === 0 ? 0 : state.totalMs / state.answered;
}
```

`packages/core/src/index.ts`: add the line `export * from './training/round';` at the end.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm --filter @partitura/core test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/core
git commit -m "feat(core): Round state machine with count and speed modes"
```

---

### Task 7: Progress analysis

**Files:**
- Create: `packages/core/src/training/progress.ts`
- Modify: `packages/core/src/index.ts`
- Test: `packages/core/test/progress.test.ts`

**Interfaces:**
- Consumes: `Attempt`, `itemStats` (Task 5); `ExerciseKind`, `Question` (Task 5); `AnswerMode` (Task 3).
- Produces:
  - `interface RoundRecord { id; exercise; levelId: string | null; answerMode: AnswerMode | null; speed: boolean; startedAt; finishedAt; answered; correct; totalMs }` (ISO timestamps)
  - `interface WeakItem { itemKey; accuracy; n; question }`
  - `weakItems(attempts, minAttempts = 3, threshold = 0.8): WeakItem[]` (worst first)
  - `suggestNextLevel(rounds, orderedLevelIds): string | null`

- [ ] **Step 1: Write the failing test**

`packages/core/test/progress.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import type { Attempt } from '../src/training/attempt';
import type { Question } from '../src/training/exercise';
import { suggestNextLevel, weakItems, type RoundRecord } from '../src/training/progress';

let seq = 0;
const q = (itemKey: string): Question => ({
  kind: 'note-reading', itemKey, clef: 'bass', layout: 'single', pitch: { step: 'A', octave: 2, alter: 0 }, answerMode: 'name',
});
const attempt = (itemKey: string, correct: boolean): Attempt => ({
  id: `a${seq++}`, roundId: 'r', exercise: 'note-reading', itemKey, question: q(itemKey),
  answer: { kind: 'step', step: 'C' }, correct, ms: 1000, answeredAt: `2026-10-07T10:00:${String(seq).padStart(2, '0')}.000Z`,
});
const round = (levelId: string | null, correct: number, minute: number): RoundRecord => ({
  id: `r${minute}`, exercise: 'note-reading', levelId, answerMode: 'name', speed: false,
  startedAt: `2026-10-07T10:${String(minute).padStart(2, '0')}:00.000Z`,
  finishedAt: `2026-10-07T10:${String(minute).padStart(2, '0')}:30.000Z`,
  answered: 20, correct, totalMs: 40_000,
});

describe('weakItems', () => {
  it('lists items below 80% with at least 3 attempts, worst first', () => {
    const attempts = [
      attempt('nr:bass:A2', false), attempt('nr:bass:A2', false), attempt('nr:bass:A2', true),
      attempt('nr:bass:B2', false), attempt('nr:bass:B2', true), attempt('nr:bass:B2', true), attempt('nr:bass:B2', true),
      attempt('nr:bass:C3', true), attempt('nr:bass:C3', true), attempt('nr:bass:C3', true),
      attempt('nr:bass:D3', false), attempt('nr:bass:D3', false),
    ];
    const weak = weakItems(attempts);
    expect(weak.map((w) => w.itemKey)).toEqual(['nr:bass:A2', 'nr:bass:B2']);
    expect(weak[0].accuracy).toBeCloseTo(1 / 3);
    expect(weak[0].question.itemKey).toBe('nr:bass:A2');
  });
});

describe('suggestNextLevel', () => {
  const order = ['nr-1', 'nr-2', 'nr-3'];

  it('suggests the next Level after 3 Rounds at 90% or better on the current Level', () => {
    expect(suggestNextLevel([round('nr-2', 18, 1), round('nr-2', 19, 2), round('nr-2', 20, 3)], order)).toBe('nr-3');
  });

  it('waits while any of the last 3 Rounds is below 90%', () => {
    expect(suggestNextLevel([round('nr-2', 17, 1), round('nr-2', 19, 2), round('nr-2', 20, 3)], order)).toBeNull();
  });

  it('waits until there are 3 Rounds', () => {
    expect(suggestNextLevel([round('nr-2', 20, 1), round('nr-2', 20, 2)], order)).toBeNull();
  });

  it('uses the most recently played Level and ignores custom Rounds', () => {
    const rounds = [round('nr-1', 20, 1), round('nr-1', 20, 2), round('nr-1', 20, 3), round('nr-2', 10, 4), round(null, 20, 5)];
    expect(suggestNextLevel(rounds, order)).toBeNull();
  });

  it('has nothing to suggest after the top Level', () => {
    expect(suggestNextLevel([round('nr-3', 20, 1), round('nr-3', 20, 2), round('nr-3', 20, 3)], order)).toBeNull();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm --filter @partitura/core test`
Expected: FAIL, "Failed to resolve import ../src/training/progress".

- [ ] **Step 3: Implement**

`packages/core/src/training/progress.ts`:
```ts
import type { Attempt } from './attempt';
import type { ExerciseKind, Question } from './exercise';
import type { AnswerMode } from './noteReading';
import { itemStats } from './selection';

/** The stored result of one Round. Timestamps are ISO 8601. */
export interface RoundRecord {
  id: string;
  exercise: ExerciseKind;
  /** null for a custom setup. */
  levelId: string | null;
  answerMode: AnswerMode | null;
  speed: boolean;
  startedAt: string;
  finishedAt: string;
  answered: number;
  correct: number;
  totalMs: number;
}

export interface WeakItem {
  itemKey: string;
  accuracy: number;
  n: number;
  /** The most recent question asked for this item, used to show it. */
  question: Question;
}

export function weakItems(attempts: readonly Attempt[], minAttempts = 3, threshold = 0.8): WeakItem[] {
  const stats = itemStats(attempts);
  const latest = new Map<string, Question>();
  for (const a of attempts) latest.set(a.itemKey, a.question);
  const out: WeakItem[] = [];
  for (const [itemKey, s] of stats) {
    const accuracy = 1 - s.wrong / s.n;
    const question = latest.get(itemKey);
    if (question && s.n >= minAttempts && accuracy < threshold) out.push({ itemKey, accuracy, n: s.n, question });
  }
  return out.sort((a, b) => a.accuracy - b.accuracy);
}

export const PROMOTION_ACCURACY = 0.9;
export const PROMOTION_ROUNDS = 3;

/** Suggests the Level after the most recently played one once its last 3 Rounds were all ≥ 90%. */
export function suggestNextLevel(rounds: readonly RoundRecord[], orderedLevelIds: readonly string[]): string | null {
  const levelled = rounds
    .filter((r) => r.levelId !== null)
    .sort((a, b) => a.finishedAt.localeCompare(b.finishedAt));
  const current = levelled.at(-1)?.levelId;
  if (!current) return null;
  const index = orderedLevelIds.indexOf(current);
  if (index < 0 || index === orderedLevelIds.length - 1) return null;
  const recent = levelled.filter((r) => r.levelId === current).slice(-PROMOTION_ROUNDS);
  if (recent.length < PROMOTION_ROUNDS) return null;
  const allGood = recent.every((r) => r.answered > 0 && r.correct / r.answered >= PROMOTION_ACCURACY);
  return allGood ? orderedLevelIds[index + 1] : null;
}
```

`packages/core/src/index.ts`: add the line `export * from './training/progress';` at the end.

- [ ] **Step 4: Run the tests and typecheck**

Run: `pnpm --filter @partitura/core test && pnpm --filter @partitura/core typecheck`
Expected: PASS, and no type errors.

- [ ] **Step 5: Commit**

```bash
git add packages/core
git commit -m "feat(core): weak items and Level suggestions"
```

---

### Task 8: Client scaffold, Portuguese messages and theme

**Files:**
- Create (by template): `apps/client/` (Vite react-ts)
- Delete: `apps/client/src/App.css`, `apps/client/src/index.css`, `apps/client/src/assets/`, `apps/client/public/vite.svg`
- Create/replace: `apps/client/vite.config.ts`, `apps/client/index.html`, `apps/client/src/main.tsx`, `apps/client/src/App.tsx`, `apps/client/src/styles.css`, `apps/client/src/test/setup.ts`
- Create: `apps/client/src/i18n/pt-BR.ts`, `apps/client/src/i18n/format.ts`
- Test: `apps/client/src/i18n/format.test.ts`

**Interfaces:**
- Consumes: `Step`, `NoteValue`, `Clef`, `StaffChoice`, `NoteValueQuestionType`, `Pitch`, `ValueSymbol` from `@partitura/core`.
- Produces:
  - `t`: the message object (see the code below for every key)
  - `pitchLabel(p): string`, e.g. "Fá♯"
  - `pitchAriaLabel(p): string`, e.g. "Fá♯ 4" (aria only)
  - `symbolLabel(s): string`, e.g. "pausa de mínima", "semínima pontuada"
  - `pluralValue(v): string`
  - `formatSeconds(ms): string`, e.g. "2,1"
  - `formatPercent(ratio): string`, e.g. "90%"

- [ ] **Step 1: Scaffold the app**

```bash
pnpm create vite apps/client --template react-ts
```

If it asks questions, answer: do not use rolldown-vite, and do not install or start now. Then:

```bash
cd apps/client
pnpm pkg set name=@partitura/client
pnpm add @partitura/core@workspace:*
pnpm add -D vitest jsdom @testing-library/react @testing-library/jest-dom fake-indexeddb
pnpm pkg set scripts.test="vitest run" scripts.typecheck="tsc -b"
rm -rf src/App.css src/index.css src/assets public/vite.svg
cd ../..
```

- [ ] **Step 2: Configure Vite, Vitest and the page**

`apps/client/vite.config.ts`:
```ts
/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Relative asset paths so the same build works inside the Capacitor Android shell.
  base: './',
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
});
```

`apps/client/src/test/setup.ts`:
```ts
import '@testing-library/jest-dom/vitest';
import 'fake-indexeddb/auto';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => cleanup());
```

`apps/client/index.html`:
```html
<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <title>Partitura</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`apps/client/src/main.tsx`:
```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

`apps/client/src/App.tsx` (temporary; Task 15 replaces it):
```tsx
import { t } from './i18n/pt-BR';

export default function App() {
  return (
    <main className="screen">
      <h1>{t.home.title}</h1>
    </main>
  );
}
```

- [ ] **Step 3: Write the theme**

`apps/client/src/styles.css`:
```css
:root {
  color-scheme: light dark;
  --bg: #fbf8f1;
  --surface: #ffffff;
  --ink: #1d1b16;
  --muted: #6b665c;
  --line: #e3ddd0;
  --accent: #2f5d8a;
  --accent-ink: #ffffff;
  --good: #2e7d4f;
  --bad: #b3261e;
  --radius: 14px;
  --tap: 48px;
  font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
}

@media (prefers-color-scheme: dark) {
  :root {
    --bg: #14130f;
    --surface: #1f1d18;
    --ink: #f1ece1;
    --muted: #a39d90;
    --line: #34312a;
    --accent: #8fb4dc;
    --accent-ink: #0d1620;
    --good: #6fcf97;
    --bad: #f28b82;
  }
}

* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--ink); }
h1, h2 { margin: 0; }

button {
  font: inherit;
  color: inherit;
  min-height: var(--tap);
  border-radius: var(--radius);
  border: 1px solid var(--line);
  background: var(--surface);
  cursor: pointer;
}
button:disabled { cursor: default; }
button.primary { background: var(--accent); color: var(--accent-ink); border-color: transparent; padding: 0 24px; font-weight: 600; }
button.primary:disabled { opacity: 0.5; }
button.link { border: none; background: none; color: var(--accent); min-height: auto; padding: 8px 0; align-self: flex-start; }
button[aria-pressed='true'] { border-color: var(--accent); box-shadow: inset 0 0 0 2px var(--accent); }
select, input { font: inherit; min-height: var(--tap); }
input[type='checkbox'] { width: 24px; min-height: 24px; height: 24px; }

.screen { max-width: 960px; margin: 0 auto; padding: 24px 16px; display: flex; flex-direction: column; gap: 24px; min-height: 100dvh; }
.cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px; }
.card-wrap { display: flex; flex-direction: column; gap: 4px; }
.card { text-align: left; padding: 24px; display: flex; flex-direction: column; gap: 8px; }
.card__title { font-size: 1.4rem; font-weight: 600; }
.card__hint { color: var(--muted); }
.levels { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 12px; }
.segmented { display: flex; gap: 8px; }
.segmented button { flex: 1; }
.field { display: flex; flex-direction: column; gap: 8px; }
.field--inline { flex-direction: row; align-items: center; gap: 12px; min-height: var(--tap); }
.checks { display: flex; flex-wrap: wrap; gap: 8px 16px; border: 1px solid var(--line); border-radius: var(--radius); padding: 12px 16px; }
.checks label { display: flex; align-items: center; gap: 8px; min-height: var(--tap); }
.callout { padding: 16px; border-radius: var(--radius); background: var(--surface); border: 1px solid var(--accent); margin: 0; }

.round { justify-content: space-between; }
.round__header { display: flex; justify-content: space-between; align-items: center; color: var(--muted); }
.prompt { font-size: 1.3rem; text-align: center; margin: 0; }
.staff { display: flex; justify-content: center; color: var(--ink); min-height: 180px; }
.staff svg { max-width: 100%; height: auto; max-height: 40vh; }
.staff--small { min-height: 0; }
.staff--small svg { max-height: 90px; }
.round__feedback { min-height: 104px; display: flex; flex-direction: column; align-items: center; gap: 12px; }
.round__feedback p { margin: 0; font-size: 1.2rem; font-weight: 600; }

.pad { display: grid; gap: 10px; }
.pad--names { grid-template-columns: repeat(7, 1fr); }
.pad--names button { font-size: 1.15rem; min-height: 64px; }
.pad--choices { grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); }
.pad--choices button { min-height: 72px; position: relative; padding: 8px 16px; font-size: 1.1rem; }
.pad__shortcut { position: absolute; top: 6px; left: 10px; font-size: 0.75rem; color: var(--muted); }
.is-correct { border-color: var(--good) !important; box-shadow: inset 0 0 0 3px var(--good); color: var(--good); }
.is-wrong { border-color: var(--bad) !important; box-shadow: inset 0 0 0 3px var(--bad); color: var(--bad); }

/* The on-screen piano keeps real piano colours in both themes. */
.piano { display: flex; overflow-x: auto; padding-bottom: 8px; touch-action: pan-x; }
.piano__slot { position: relative; flex: 0 0 auto; }
.piano__white {
  width: 40px; height: 180px; border-radius: 0 0 8px 8px; background: #fffdf8; color: #1d1b16;
  border: 1px solid #b9b2a3; display: flex; align-items: flex-end; justify-content: center; padding: 0 0 8px;
}
.piano__black {
  position: absolute; top: 0; right: -13px; width: 26px; height: 110px; min-height: 0; z-index: 1;
  border-radius: 0 0 6px 6px; background: #1d1b16; border: 1px solid #000; padding: 0;
}
.piano__middle-c { font-size: 0.65rem; color: #6b665c; }
.piano .is-correct { background: var(--good); }
.piano .is-wrong { background: var(--bad); }

table { width: 100%; border-collapse: collapse; }
th, td { text-align: left; padding: 8px; border-bottom: 1px solid var(--line); }
.weak-list { margin: 0; padding-left: 20px; display: flex; flex-direction: column; gap: 4px; }
```

- [ ] **Step 4: Write the failing test for the labels**

`apps/client/src/i18n/format.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { formatPercent, formatSeconds, pitchAriaLabel, pitchLabel, pluralValue, symbolLabel } from './format';

describe('format', () => {
  it('names pitches in solfège', () => {
    expect(pitchLabel({ step: 'C', octave: 4, alter: 0 })).toBe('Dó');
    expect(pitchLabel({ step: 'F', octave: 3, alter: 1 })).toBe('Fá♯');
    expect(pitchLabel({ step: 'B', octave: 3, alter: -1 })).toBe('Si♭');
    expect(pitchAriaLabel({ step: 'A', octave: 2, alter: 0 })).toBe('Lá 2');
  });

  it('names note values, rests and dotted values in Portuguese', () => {
    expect(symbolLabel({ value: 'quarter', rest: false, dotted: false })).toBe('semínima');
    expect(symbolLabel({ value: 'half', rest: true, dotted: false })).toBe('pausa de mínima');
    expect(symbolLabel({ value: 'quarter', rest: false, dotted: true })).toBe('semínima pontuada');
    expect(pluralValue('eighth')).toBe('colcheias');
  });

  it('formats numbers the Brazilian way', () => {
    expect(formatSeconds(2100)).toBe('2,1');
    expect(formatPercent(0.9)).toBe('90%');
  });
});
```

- [ ] **Step 5: Run it to verify it fails**

Run: `pnpm --filter @partitura/client test`
Expected: FAIL, "Failed to resolve import ./format".

- [ ] **Step 6: Implement the messages and labels**

`apps/client/src/i18n/pt-BR.ts`:
```ts
import type { Clef, NoteValue, NoteValueQuestionType, StaffChoice, Step } from '@partitura/core';

const pitch: Record<Step, string> = { C: 'Dó', D: 'Ré', E: 'Mi', F: 'Fá', G: 'Sol', A: 'Lá', B: 'Si' };

const noteValue: Record<NoteValue, string> = {
  whole: 'semibreve', half: 'mínima', quarter: 'semínima', eighth: 'colcheia',
  sixteenth: 'semicolcheia', 'thirty-second': 'fusa', 'sixty-fourth': 'semifusa',
};

const noteValuePlural: Record<NoteValue, string> = {
  whole: 'semibreves', half: 'mínimas', quarter: 'semínimas', eighth: 'colcheias',
  sixteenth: 'semicolcheias', 'thirty-second': 'fusas', 'sixty-fourth': 'semifusas',
};

const clef: Record<Clef, string> = { treble: 'clave de Sol', bass: 'clave de Fá' };

const staveChoice: Record<StaffChoice, string> = {
  treble: 'Clave de Sol', bass: 'Clave de Fá', mixed: 'Sol e Fá alternadas', grand: 'Pauta dupla (piano)',
};

const typeChoice: Record<NoteValueQuestionType, string> = {
  'symbol-to-name': 'Figura → nome', 'name-to-symbol': 'Nome → figura', relation: 'Quantas cabem',
};

/** Every on-screen string. Components must not contain Portuguese literals. */
export const t = {
  pitch,
  noteValue,
  noteValuePlural,
  clef,
  sharp: '♯',
  flat: '♭',
  dotted: 'pontuada',
  restOf: 'pausa de',
  home: {
    title: 'Treino',
    noteReading: 'Leitura de notas',
    noteReadingHint: 'Clave de Sol e clave de Fá',
    noteValue: 'Figuras musicais',
    noteValueHint: 'Semibreve, mínima, semínima…',
    progress: 'Ver progresso',
  },
  setup: {
    levels: 'Níveis',
    level: (n: number) => `Nível ${n}`,
    custom: 'Personalizado',
    answerMode: 'Responder com',
    byName: 'Nome da nota',
    byPiano: 'Teclado',
    speed: 'Modo velocidade (60 segundos)',
    start: 'Começar',
    back: 'Voltar',
    staves: 'Pauta',
    staveChoice,
    ledgerLines: 'Linhas suplementares',
    accidentals: 'Sustenidos e bemóis',
    accidentalsHint: '(só ao responder com o teclado)',
    values: 'Figuras',
    types: 'Perguntas',
    typeChoice,
    rests: 'Incluir pausas',
    dottedValues: 'Incluir figuras pontuadas',
    invalid: 'Escolha pelo menos uma figura e um tipo de pergunta que funcionem juntos.',
  },
  round: {
    progress: (n: number, total: number) => `${n} de ${total}`,
    secondsLeft: (s: number) => `${s} s`,
    whichNote: 'Qual é esta nota?',
    whichValue: 'Qual é esta figura?',
    findValue: (name: string) => `Onde está a ${name}?`,
    relation: (part: string, whole: string) => `Quantas ${part} cabem em uma ${whole}?`,
    correct: 'Certo!',
    wrongWas: (answer: string) => `Era ${answer}`,
    next: 'Próxima',
    quit: 'Sair',
    middleC: 'Dó central',
    piano: 'Teclado',
  },
  summary: {
    title: 'Fim da rodada',
    score: (correct: number, answered: number) => `${correct} de ${answered}`,
    average: (seconds: string) => `${seconds} s por resposta`,
    again: 'De novo',
    back: 'Voltar',
  },
  progress: {
    title: (exercise: string) => `Progresso: ${exercise}`,
    weak: 'Para reforçar',
    noWeak: 'Nada para reforçar ainda. Faça algumas rodadas!',
    suggestion: (n: number) => `Você passou de 90% nas últimas rodadas. Experimente o Nível ${n}.`,
    recent: 'Últimas rodadas',
    noRounds: 'Nenhuma rodada ainda.',
    when: 'Quando',
    level: 'Nível',
    score: 'Acertos',
    back: 'Voltar',
  },
};
```

`apps/client/src/i18n/format.ts`:
```ts
import type { NoteValue, Pitch, ValueSymbol } from '@partitura/core';
import { t } from './pt-BR';

export function pitchLabel(p: Pitch): string {
  return t.pitch[p.step] + (p.alter === 1 ? t.sharp : p.alter === -1 ? t.flat : '');
}

/** Only for aria-labels: octave numbers are never shown on screen. */
export function pitchAriaLabel(p: Pitch): string {
  return `${pitchLabel(p)} ${p.octave}`;
}

export function symbolLabel(s: ValueSymbol): string {
  const name = t.noteValue[s.value];
  if (s.rest) return `${t.restOf} ${name}`;
  if (s.dotted) return `${name} ${t.dotted}`;
  return name;
}

export function pluralValue(value: NoteValue): string {
  return t.noteValuePlural[value];
}

const seconds = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const percent = new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 0 });

export function formatSeconds(ms: number): string {
  return seconds.format(ms / 1000);
}

export function formatPercent(ratio: number): string {
  return percent.format(ratio);
}
```

- [ ] **Step 7: Run the tests, typecheck and the dev server**

Run: `pnpm --filter @partitura/client test && pnpm --filter @partitura/client typecheck`
Expected: PASS, and no type errors.

Run: `pnpm dev`, then open the printed URL.
Expected: a warm off-white page showing "Treino", which turns dark when the OS is in dark mode. Stop the server.

- [ ] **Step 8: Commit**

```bash
git add .
git commit -m "feat(client): scaffold app with Portuguese messages and theme"
```

---

### Task 9: Staff rendering with Verovio

**Files:**
- Create: `apps/client/src/render/mei.ts`, `apps/client/src/render/verovio.ts`, `apps/client/src/components/Staff.tsx`
- Test: `apps/client/src/render/mei.test.ts`, `apps/client/src/render/verovio.test.ts`, `apps/client/src/components/Staff.test.tsx`

**Interfaces:**
- Consumes: `NoteReadingQuestion`, `ValueSymbol`, `Pitch`, `Clef`, `denominator` from `@partitura/core`.
- Produces:
  - `noteReadingMei(q: NoteReadingQuestion): string`
  - `symbolMei(s: ValueSymbol): string`
  - `pitchesMei(clef: Clef, pitches: Pitch[], color: string): string`
  - `renderMei(mei: string): Promise<string>` (an SVG string)
  - `<Staff mei={string} className?={string} />`

- [ ] **Step 1: Install Verovio**

```bash
pnpm --filter @partitura/client add verovio
```

- [ ] **Step 2: Write the failing tests**

`apps/client/src/render/mei.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import type { NoteReadingQuestion } from '@partitura/core';
import { noteReadingMei, pitchesMei, symbolMei } from './mei';

const question = (over: Partial<NoteReadingQuestion> = {}): NoteReadingQuestion => ({
  kind: 'note-reading', itemKey: 'nr:treble:D5', clef: 'treble', layout: 'single',
  pitch: { step: 'D', octave: 5, alter: 0 }, answerMode: 'name', ...over,
});

describe('MEI builders', () => {
  it('writes one note on a single treble staff', () => {
    const mei = noteReadingMei(question());
    expect(mei).toContain('<clef shape="G" line="2"/>');
    expect(mei).toContain('<note pname="d" oct="5" dur="1"/>');
    expect(mei).not.toContain('shape="F"');
  });

  it('writes accidentals', () => {
    expect(noteReadingMei(question({ pitch: { step: 'F', octave: 4, alter: 1 } }))).toContain('accid="s"');
    expect(noteReadingMei(question({ pitch: { step: 'B', octave: 4, alter: -1 } }))).toContain('accid="f"');
  });

  it('puts a bass note on the lower staff of a grand staff', () => {
    const mei = noteReadingMei(question({ clef: 'bass', layout: 'grand', pitch: { step: 'A', octave: 2, alter: 0 } }));
    expect(mei).toContain('symbol="brace"');
    expect(mei).toMatch(/<staff n="1"><layer n="1"><mSpace\/><\/layer><\/staff>/);
    expect(mei).toMatch(/<staff n="2"><layer n="1"><note pname="a" oct="2" dur="1"\/><\/layer><\/staff>/);
  });

  it('writes note-value symbols, rests and dots', () => {
    expect(symbolMei({ value: 'quarter', rest: false, dotted: false })).toContain('<note pname="b" oct="4" dur="4"/>');
    expect(symbolMei({ value: 'half', rest: true, dotted: false })).toContain('<rest dur="2"/>');
    expect(symbolMei({ value: 'half', rest: false, dotted: true })).toContain('dots="1"');
  });

  it('colours a row of notes, one per measure', () => {
    const mei = pitchesMei('bass', [{ step: 'A', octave: 2, alter: 0 }, { step: 'B', octave: 2, alter: 0 }], '#b3261e');
    expect(mei.match(/<measure /g)).toHaveLength(2);
    expect(mei).toContain('color="#b3261e"');
    expect(mei).toContain('shape="F"');
  });
});
```

`apps/client/src/render/verovio.test.ts`:
```ts
// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { noteReadingMei } from './mei';
import { renderMei } from './verovio';

describe('renderMei', () => {
  it('renders generated MEI to SVG', async () => {
    const svg = await renderMei(noteReadingMei({
      kind: 'note-reading', itemKey: 'nr:treble:D5', clef: 'treble', layout: 'grand',
      pitch: { step: 'D', octave: 5, alter: 0 }, answerMode: 'name',
    }));
    expect(svg).toContain('<svg');
    expect(svg).toContain('class="note"');
  }, 20_000);
});
```

`apps/client/src/components/Staff.test.tsx`:
```tsx
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Staff } from './Staff';

vi.mock('../render/verovio', () => ({
  renderMei: vi.fn(async (mei: string) => `<svg data-length="${mei.length}"></svg>`),
}));

describe('Staff', () => {
  it('shows the rendered SVG', async () => {
    render(<Staff mei="<mei/>" />);
    await waitFor(() => expect(screen.getByTestId('staff').querySelector('svg')).toHaveAttribute('data-length', '6'));
  });
});
```

- [ ] **Step 3: Run them to verify they fail**

Run: `pnpm --filter @partitura/client test`
Expected: FAIL, "Failed to resolve import ./mei" (and the same for `./verovio` and `./Staff`).

- [ ] **Step 4: Implement**

`apps/client/src/render/mei.ts`:
```ts
import { denominator, type Clef, type NoteReadingQuestion, type Pitch, type ValueSymbol } from '@partitura/core';

// Builds tiny MEI documents for Verovio. Exercises never touch MusicXML (see ADR 0005).

const CLEF: Record<Clef, string> = {
  treble: '<clef shape="G" line="2"/>',
  bass: '<clef shape="F" line="4"/>',
};

function staffDef(n: number, clef: Clef): string {
  return `<staffDef n="${n}" lines="5">${CLEF[clef]}</staffDef>`;
}

function staff(n: number, content: string): string {
  return `<staff n="${n}"><layer n="1">${content}</layer></staff>`;
}

function measure(content: string, n = 1): string {
  return `<measure n="${n}" right="invis">${content}</measure>`;
}

function noteXml(p: Pitch, color?: string): string {
  const accid = p.alter === 1 ? ' accid="s"' : p.alter === -1 ? ' accid="f"' : '';
  const colour = color ? ` color="${color}"` : '';
  return `<note pname="${p.step.toLowerCase()}" oct="${p.octave}" dur="1"${accid}${colour}/>`;
}

function meiDocument(staffGrp: string, measures: string): string {
  return '<?xml version="1.0" encoding="UTF-8"?>'
    + '<mei xmlns="http://www.music-encoding.org/ns/mei" meiversion="5.0"><music><body><mdiv><score>'
    + `<scoreDef>${staffGrp}</scoreDef><section>${measures}</section>`
    + '</score></mdiv></body></music></mei>';
}

export function noteReadingMei(q: NoteReadingQuestion): string {
  if (q.layout === 'single') {
    return meiDocument(`<staffGrp>${staffDef(1, q.clef)}</staffGrp>`, measure(staff(1, noteXml(q.pitch))));
  }
  const upper = q.clef === 'treble' ? noteXml(q.pitch) : '<mSpace/>';
  const lower = q.clef === 'bass' ? noteXml(q.pitch) : '<mSpace/>';
  return meiDocument(
    `<staffGrp symbol="brace" bar.thru="true">${staffDef(1, 'treble')}${staffDef(2, 'bass')}</staffGrp>`,
    measure(staff(1, upper) + staff(2, lower)),
  );
}

/** A Note value on the middle line (Si4) of a treble staff. */
export function symbolMei(s: ValueSymbol): string {
  const dots = s.dotted ? ' dots="1"' : '';
  const dur = denominator(s.value);
  const body = s.rest ? `<rest dur="${dur}"${dots}/>` : `<note pname="b" oct="4" dur="${dur}"${dots}/>`;
  return meiDocument(`<staffGrp>${staffDef(1, 'treble')}</staffGrp>`, measure(staff(1, body)));
}

/** A row of coloured whole notes, one per measure: used to show weak notes. */
export function pitchesMei(clef: Clef, pitches: Pitch[], color: string): string {
  const measures = pitches.map((p, i) => measure(staff(1, noteXml(p, color)), i + 1)).join('');
  return meiDocument(`<staffGrp>${staffDef(1, clef)}</staffGrp>`, measures);
}
```

`apps/client/src/render/verovio.ts`:
```ts
import createVerovioModule from 'verovio/wasm';
import { VerovioToolkit } from 'verovio/esm';

let toolkit: Promise<VerovioToolkit> | null = null;

function getToolkit(): Promise<VerovioToolkit> {
  toolkit ??= createVerovioModule().then((module) => {
    const tk = new VerovioToolkit(module);
    tk.setOptions({
      scale: 50,
      adjustPageHeight: true,
      adjustPageWidth: true,
      header: 'none',
      footer: 'none',
      svgViewBox: true,
      pageMarginTop: 20,
      pageMarginBottom: 20,
      pageMarginLeft: 20,
      pageMarginRight: 20,
    });
    return tk;
  });
  return toolkit;
}

/** Renders a one-page MEI document to an SVG string. */
export async function renderMei(mei: string): Promise<string> {
  const tk = await getToolkit();
  tk.loadData(mei);
  return tk.renderToSVG(1);
}
```

If `pnpm --filter @partitura/client typecheck` later reports that `verovio/wasm` or `verovio/esm` has no type declarations, create `apps/client/src/types/verovio.d.ts`:
```ts
declare module 'verovio/wasm' {
  const createVerovioModule: () => Promise<unknown>;
  export default createVerovioModule;
}
declare module 'verovio/esm' {
  export class VerovioToolkit {
    constructor(module: unknown);
    setOptions(options: Record<string, unknown>): void;
    loadData(data: string): boolean;
    renderToSVG(page?: number): string;
    getPageCount(): number;
  }
}
```

`apps/client/src/components/Staff.tsx`:
```tsx
import { useEffect, useState } from 'react';
import { renderMei } from '../render/verovio';

interface Props {
  mei: string;
  className?: string;
}

export function Staff({ mei, className = 'staff' }: Props) {
  const [svg, setSvg] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    renderMei(mei).then((result) => {
      if (alive) setSvg(result);
    });
    return () => {
      alive = false;
    };
  }, [mei]);

  return (
    <div
      className={className}
      data-testid="staff"
      aria-hidden="true"
      dangerouslySetInnerHTML={svg ? { __html: svg } : undefined}
    />
  );
}
```

- [ ] **Step 5: Run the tests and typecheck**

Run: `pnpm --filter @partitura/client test && pnpm --filter @partitura/client typecheck`
Expected: PASS, and no type errors.

- [ ] **Step 6: Commit**

```bash
git add apps/client
git commit -m "feat(client): render exercise staves with Verovio"
```

---

### Task 10: Piano sound

**Files:**
- Create: `apps/client/scripts/fetch-piano-samples.mjs`, `apps/client/src/audio/sampleNotes.ts`, `apps/client/src/audio/piano.ts`
- Create (by script): `apps/client/public/samples/piano/*.mp3`, `apps/client/public/samples/piano/ATTRIBUTION.txt`
- Test: `apps/client/src/audio/sampleNotes.test.ts`

**Interfaces:**
- Produces:
  - `SAMPLE_NOTES: string[]` (30 notes, A0 … C8), `sampleFile(note): string`
  - `loadPiano(): Promise<Sampler>`: the first call must come from a click or tap
  - `playMidi(midi: number, seconds?: number): Promise<void>`: never throws

- [ ] **Step 1: Write the failing test**

`apps/client/src/audio/sampleNotes.test.ts`:
```ts
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
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm --filter @partitura/client test`
Expected: FAIL, "Failed to resolve import ./sampleNotes".

- [ ] **Step 3: Implement**

```bash
pnpm --filter @partitura/client add tone
```

`apps/client/src/audio/sampleNotes.ts`:
```ts
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
```

`apps/client/src/audio/piano.ts`:
```ts
import * as Tone from 'tone';
import { SAMPLE_NOTES, sampleFile } from './sampleNotes';

let sampler: Promise<Tone.Sampler> | null = null;

/** The first call must come from a click or tap: browsers only start audio after a user gesture. */
export async function loadPiano(): Promise<Tone.Sampler> {
  await Tone.start();
  sampler ??= new Promise<Tone.Sampler>((resolve, reject) => {
    const s: Tone.Sampler = new Tone.Sampler({
      urls: Object.fromEntries(SAMPLE_NOTES.map((note) => [note, sampleFile(note)])),
      baseUrl: `${import.meta.env.BASE_URL}samples/piano/`,
      release: 1,
      onload: () => resolve(s),
      onerror: (error) => reject(error),
    }).toDestination();
  });
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
```

`apps/client/scripts/fetch-piano-samples.mjs`:
```js
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
```

Run it once and commit the files, because the app must play offline:

```bash
node apps/client/scripts/fetch-piano-samples.mjs
ls apps/client/public/samples/piano | wc -l
```
Expected: `31` (30 mp3 files plus ATTRIBUTION.txt).

- [ ] **Step 4: Run the tests and typecheck**

Run: `pnpm --filter @partitura/client test && pnpm --filter @partitura/client typecheck`
Expected: PASS, and no type errors. The sound itself is checked by hand in Task 13, Step 7.

- [ ] **Step 5: Commit**

```bash
git add apps/client
git commit -m "feat(client): offline sampled piano"
```

---

### Task 11: Local storage for Attempts and Rounds

**Files:**
- Create: `apps/client/src/storage/db.ts`
- Test: `apps/client/src/storage/db.test.ts`

**Interfaces:**
- Consumes: `Attempt`, `RoundRecord`, `ExerciseKind` from `@partitura/core`.
- Produces:
  - `class TrainingDb` (Dexie)
  - `db: TrainingDb`
  - `addAttempt(database, attempt): Promise<void>`
  - `attemptsFor(database, exercise): Promise<Attempt[]>` (oldest first)
  - `addRound(database, round): Promise<void>`
  - `roundsFor(database, exercise): Promise<RoundRecord[]>` (oldest first)

- [ ] **Step 1: Write the failing test**

```bash
pnpm --filter @partitura/client add dexie
```

`apps/client/src/storage/db.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import type { Attempt, RoundRecord } from '@partitura/core';
import { TrainingDb, addAttempt, addRound, attemptsFor, roundsFor } from './db';

const attempt = (id: string, exercise: Attempt['exercise'], answeredAt: string): Attempt => ({
  id, roundId: 'r1', exercise, itemKey: 'nr:treble:C5',
  question: { kind: 'note-reading', itemKey: 'nr:treble:C5', clef: 'treble', layout: 'single', pitch: { step: 'C', octave: 5, alter: 0 }, answerMode: 'name' },
  answer: { kind: 'step', step: 'C' }, correct: true, ms: 900, answeredAt,
});

const round = (id: string, finishedAt: string): RoundRecord => ({
  id, exercise: 'note-value', levelId: 'nv-1', answerMode: null, speed: false,
  startedAt: finishedAt, finishedAt, answered: 20, correct: 18, totalMs: 30_000,
});

describe('TrainingDb', () => {
  it('returns Attempts for one Exercise, oldest first', async () => {
    const db = new TrainingDb(`test-${crypto.randomUUID()}`);
    await addAttempt(db, attempt('b', 'note-reading', '2026-10-07T10:00:02.000Z'));
    await addAttempt(db, attempt('a', 'note-reading', '2026-10-07T10:00:01.000Z'));
    await addAttempt(db, attempt('c', 'note-value', '2026-10-07T10:00:00.000Z'));
    expect((await attemptsFor(db, 'note-reading')).map((x) => x.id)).toEqual(['a', 'b']);
  });

  it('refuses to overwrite an Attempt', async () => {
    const db = new TrainingDb(`test-${crypto.randomUUID()}`);
    await addAttempt(db, attempt('a', 'note-reading', '2026-10-07T10:00:01.000Z'));
    await expect(addAttempt(db, attempt('a', 'note-reading', '2026-10-07T10:00:09.000Z'))).rejects.toThrow();
  });

  it('returns Rounds for one Exercise, oldest first', async () => {
    const db = new TrainingDb(`test-${crypto.randomUUID()}`);
    await addRound(db, round('r2', '2026-10-07T11:00:00.000Z'));
    await addRound(db, round('r1', '2026-10-07T10:00:00.000Z'));
    expect((await roundsFor(db, 'note-value')).map((r) => r.id)).toEqual(['r1', 'r2']);
    expect(await roundsFor(db, 'note-reading')).toEqual([]);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm --filter @partitura/client test`
Expected: FAIL, "Failed to resolve import ./db".

- [ ] **Step 3: Implement**

`apps/client/src/storage/db.ts`:
```ts
import Dexie, { type Table } from 'dexie';
import type { Attempt, ExerciseKind, RoundRecord } from '@partitura/core';

export class TrainingDb extends Dexie {
  declare attempts: Table<Attempt, string>;
  declare rounds: Table<RoundRecord, string>;

  constructor(name = 'partitura') {
    super(name);
    this.version(1).stores({
      attempts: 'id, exercise, itemKey, answeredAt, roundId',
      rounds: 'id, exercise, levelId, finishedAt',
    });
  }
}

export const db = new TrainingDb();

/** Attempts are only ever added, never changed (CONTEXT.md, "Attempt"). `add` rejects a duplicate id. */
export async function addAttempt(database: TrainingDb, attempt: Attempt): Promise<void> {
  await database.attempts.add(attempt);
}

export async function attemptsFor(database: TrainingDb, exercise: ExerciseKind): Promise<Attempt[]> {
  return database.attempts.where('exercise').equals(exercise).sortBy('answeredAt');
}

export async function addRound(database: TrainingDb, round: RoundRecord): Promise<void> {
  await database.rounds.add(round);
}

export async function roundsFor(database: TrainingDb, exercise: ExerciseKind): Promise<RoundRecord[]> {
  return database.rounds.where('exercise').equals(exercise).sortBy('finishedAt');
}
```

- [ ] **Step 4: Run the tests and typecheck**

Run: `pnpm --filter @partitura/client test && pnpm --filter @partitura/client typecheck`
Expected: PASS, and no type errors.

- [ ] **Step 5: Commit**

```bash
git add apps/client
git commit -m "feat(client): store Attempts and Rounds in IndexedDB"
```

---

### Task 12: Answer pads

**Files:**
- Create: `apps/client/src/hooks/useKeyDown.ts`
- Create: `apps/client/src/training/components/NamePad.tsx`, `PianoKeyboard.tsx`, `ChoicePad.tsx`
- Test: `apps/client/src/training/components/pads.test.tsx`

**Interfaces:**
- Consumes: `STEPS`, `Step`, `isWhiteKey`, `pitchFromMidi` from `@partitura/core`; `t`, `pitchAriaLabel` (Task 8).
- Produces:
  - `useKeyDown(handler: (e: KeyboardEvent) => void, enabled: boolean): void`
  - `<NamePad onAnswer={(step: Step) => void} disabled correct={Step | null} wrong={Step | null} />` (keys C–B answer)
  - `<PianoKeyboard lowMidi highMidi onAnswer={(midi: number) => void} disabled correct={number | null} wrong={number | null} />`
  - `<ChoicePad options={ReactNode[]} onAnswer={(index: number) => void} disabled correct={number | null} wrong={number | null} />` (keys 1–n answer)

- [ ] **Step 1: Write the failing test**

`apps/client/src/training/components/pads.test.tsx`:
```tsx
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
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm --filter @partitura/client test`
Expected: FAIL, "Failed to resolve import ./ChoicePad".

- [ ] **Step 3: Implement**

`apps/client/src/hooks/useKeyDown.ts`:
```ts
import { useEffect, useRef } from 'react';

/** Listens for key presses on the whole window while `enabled`. */
export function useKeyDown(handler: (event: KeyboardEvent) => void, enabled: boolean): void {
  const latest = useRef(handler);
  useEffect(() => {
    latest.current = handler;
  });
  useEffect(() => {
    if (!enabled) return;
    const listener = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      latest.current(event);
    };
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, [enabled]);
}
```

`apps/client/src/training/components/NamePad.tsx`:
```tsx
import { STEPS, type Step } from '@partitura/core';
import { useKeyDown } from '../../hooks/useKeyDown';
import { t } from '../../i18n/pt-BR';

interface Props {
  onAnswer: (step: Step) => void;
  disabled: boolean;
  correct: Step | null;
  wrong: Step | null;
}

export function NamePad({ onAnswer, disabled, correct, wrong }: Props) {
  useKeyDown((event) => {
    const step = STEPS.find((s) => s === event.key.toUpperCase());
    if (step) onAnswer(step);
  }, !disabled);

  return (
    <div className="pad pad--names">
      {STEPS.map((step) => (
        <button
          key={step}
          type="button"
          disabled={disabled}
          className={step === correct ? 'is-correct' : step === wrong ? 'is-wrong' : undefined}
          onClick={() => onAnswer(step)}
        >
          {t.pitch[step]}
        </button>
      ))}
    </div>
  );
}
```

`apps/client/src/training/components/PianoKeyboard.tsx`:
```tsx
import { isWhiteKey, pitchFromMidi } from '@partitura/core';
import { pitchAriaLabel } from '../../i18n/format';
import { t } from '../../i18n/pt-BR';

const MIDDLE_C = 60;

interface Props {
  lowMidi: number;
  highMidi: number;
  onAnswer: (midi: number) => void;
  disabled: boolean;
  correct: number | null;
  wrong: number | null;
}

export function PianoKeyboard({ lowMidi, highMidi, onAnswer, disabled, correct, wrong }: Props) {
  const whites: number[] = [];
  for (let midi = lowMidi; midi <= highMidi; midi++) if (isWhiteKey(midi)) whites.push(midi);

  const renderKey = (midi: number, base: string) => (
    <button
      type="button"
      className={[base, midi === correct && 'is-correct', midi === wrong && 'is-wrong'].filter(Boolean).join(' ')}
      disabled={disabled}
      aria-label={pitchAriaLabel(pitchFromMidi(midi))}
      onClick={() => onAnswer(midi)}
    >
      {midi === MIDDLE_C && <span className="piano__middle-c">{t.round.middleC}</span>}
    </button>
  );

  return (
    <div className="piano" role="group" aria-label={t.round.piano}>
      {whites.map((midi) => (
        <div key={midi} className="piano__slot">
          {renderKey(midi, 'piano__white')}
          {midi + 1 <= highMidi && !isWhiteKey(midi + 1) && renderKey(midi + 1, 'piano__black')}
        </div>
      ))}
    </div>
  );
}
```

`apps/client/src/training/components/ChoicePad.tsx`:
```tsx
import type { ReactNode } from 'react';
import { useKeyDown } from '../../hooks/useKeyDown';

interface Props {
  options: ReactNode[];
  onAnswer: (index: number) => void;
  disabled: boolean;
  correct: number | null;
  wrong: number | null;
}

export function ChoicePad({ options, onAnswer, disabled, correct, wrong }: Props) {
  useKeyDown((event) => {
    const n = Number(event.key);
    if (Number.isInteger(n) && n >= 1 && n <= options.length) onAnswer(n - 1);
  }, !disabled);

  return (
    <div className="pad pad--choices">
      {options.map((option, index) => (
        <button
          key={index}
          type="button"
          disabled={disabled}
          className={index === correct ? 'is-correct' : index === wrong ? 'is-wrong' : undefined}
          onClick={() => onAnswer(index)}
        >
          <span className="pad__shortcut">{index + 1}</span>
          {option}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Run the tests and typecheck**

Run: `pnpm --filter @partitura/client test && pnpm --filter @partitura/client typecheck`
Expected: PASS, and no type errors.

- [ ] **Step 5: Commit**

```bash
git add apps/client
git commit -m "feat(client): name, piano and multiple-choice answer pads"
```

---

### Task 13: Playing a Round

**Files:**
- Create: `apps/client/src/training/feedback.ts`, `apps/client/src/training/QuestionView.tsx`, `apps/client/src/training/RoundScreen.tsx`, `apps/client/src/training/SummaryScreen.tsx`
- Test: `apps/client/src/training/feedback.test.ts`, `apps/client/src/training/RoundScreen.test.tsx`, `apps/client/src/training/SummaryScreen.test.tsx`

**Interfaces:**
- Consumes: from `@partitura/core`: `advance`, `answerQuestion`, `startRound`, `tick`, `remainingMs`, `nextQuestion`, `keyboardRange`, `midiNumber`, `lengthInWholes` and their types. From the client: `Staff`, `noteReadingMei`, `symbolMei`, `playMidi`, `db`, `addAttempt`, `addRound`, `attemptsFor`, the pads, `useKeyDown`, `t`, and the formatters.
- Produces:
  - `correctAnswerLabel(q: Question): string`
  - `feedbackSound(q: Question): { midi: number; seconds: number } | null`
  - `<QuestionView question keyboard feedback onAnswer />`
  - `<RoundScreen config levelId mode onFinished={(r: RoundRecord) => void} onQuit rng? />`
  - `<SummaryScreen record onAgain onBack />`

- [ ] **Step 1: Write the failing tests**

`apps/client/src/training/feedback.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import type { Question } from '@partitura/core';
import { correctAnswerLabel, feedbackSound } from './feedback';

const reading: Question = {
  kind: 'note-reading', itemKey: 'nr:bass:F#3', clef: 'bass', layout: 'single',
  pitch: { step: 'F', octave: 3, alter: 1 }, answerMode: 'piano',
};
const quarter = { value: 'quarter' as const, rest: false, dotted: false };
const symbol: Question = {
  kind: 'note-value', type: 'symbol-to-name', itemKey: 'nv:symbol-to-name:quarter', symbol: quarter,
  options: [quarter, { value: 'half', rest: false, dotted: false }], correctIndex: 0,
};
const relation: Question = {
  kind: 'note-value', type: 'relation', itemKey: 'nv:relation:half/quarter',
  whole: { value: 'half', rest: false, dotted: false }, part: quarter, options: [4, 2, 1, 3], correctIndex: 1,
};

describe('feedback', () => {
  it('names the right answer without octave numbers', () => {
    expect(correctAnswerLabel(reading)).toBe('Fá♯');
    expect(correctAnswerLabel(symbol)).toBe('semínima');
    expect(correctAnswerLabel(relation)).toBe('2');
  });

  it('plays the asked note, or a note as long as the asked value at quarter = 90', () => {
    expect(feedbackSound(reading)).toEqual({ midi: 54, seconds: 1 });
    expect(feedbackSound(symbol)?.seconds).toBeCloseTo(60 / 90);
    expect(feedbackSound(relation)).toBeNull();
  });

  it('stays silent for rests', () => {
    const rest = { value: 'half' as const, rest: true, dotted: false };
    expect(feedbackSound({ ...symbol, symbol: rest, options: [rest] })).toBeNull();
  });
});
```

`apps/client/src/training/RoundScreen.test.tsx`:
```tsx
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { seededRng, type ExerciseConfig } from '@partitura/core';
import { addAttempt, addRound } from '../storage/db';
import { playMidi } from '../audio/piano';
import { RoundScreen } from './RoundScreen';

vi.mock('../storage/db', () => ({
  db: {},
  attemptsFor: vi.fn(async () => []),
  addAttempt: vi.fn(async () => undefined),
  addRound: vi.fn(async () => undefined),
}));
vi.mock('../audio/piano', () => ({ playMidi: vi.fn(async () => undefined), loadPiano: vi.fn() }));
vi.mock('../render/verovio', () => ({
  // Exposes the rendered note (e.g. "d5") so the test knows the right answer.
  renderMei: vi.fn(async (mei: string) => {
    const m = /pname="(\w)" oct="(\d)"/.exec(mei);
    return `<svg data-note="${m ? m[1] + m[2] : ''}"></svg>`;
  }),
}));

const LABEL: Record<string, string> = { c: 'Dó', d: 'Ré', e: 'Mi', f: 'Fá', g: 'Sol', a: 'Lá', b: 'Si' };
const config: ExerciseConfig = { exercise: 'note-reading', staves: 'treble', ledgerLines: 0, accidentals: false, answerMode: 'name' };

async function shownNote(previous: string | null): Promise<string> {
  let note = '';
  await waitFor(() => {
    note = screen.getByTestId('staff').querySelector('svg')?.getAttribute('data-note') ?? '';
    expect(note).not.toBe('');
    expect(note).not.toBe(previous);
  });
  return note;
}

describe('RoundScreen', () => {
  it('records each Attempt, explains wrong answers and finishes the Round', async () => {
    const onFinished = vi.fn();
    render(<RoundScreen config={config} levelId="nr-1" mode={{ kind: 'count', total: 2 }} onFinished={onFinished} onQuit={() => {}} rng={seededRng(3)} />);

    expect(await screen.findByText('1 de 2')).toBeInTheDocument();
    const first = await shownNote(null);
    fireEvent.click(screen.getByRole('button', { name: first[0] === 'c' ? 'Ré' : 'Dó' }));
    expect(screen.getByText(`Era ${LABEL[first[0]]}`)).toBeInTheDocument();
    expect(playMidi).toHaveBeenCalled();
    expect(addAttempt).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({ correct: false, roundId: expect.any(String) }));

    fireEvent.click(screen.getByRole('button', { name: 'Próxima' }));
    expect(await screen.findByText('2 de 2')).toBeInTheDocument();
    const second = await shownNote(first);
    fireEvent.click(screen.getByRole('button', { name: LABEL[second[0]] }));
    expect(screen.getByText('Certo!')).toBeInTheDocument();

    await waitFor(() => expect(onFinished).toHaveBeenCalledTimes(1));
    expect(onFinished.mock.calls[0][0]).toMatchObject({ exercise: 'note-reading', levelId: 'nr-1', answered: 2, correct: 1, speed: false });
    expect(addRound).toHaveBeenCalledTimes(1);
    expect(addAttempt).toHaveBeenCalledTimes(2);
  });
});
```

`apps/client/src/training/SummaryScreen.test.tsx`:
```tsx
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
```

- [ ] **Step 2: Run them to verify they fail**

Run: `pnpm --filter @partitura/client test`
Expected: FAIL, "Failed to resolve import ./feedback" (and the same for `./RoundScreen` and `./SummaryScreen`).

- [ ] **Step 3: Implement the feedback helpers**

`apps/client/src/training/feedback.ts`:
```ts
import { lengthInWholes, midiNumber, type Question } from '@partitura/core';
import { pitchLabel, symbolLabel } from '../i18n/format';

const SECONDS_PER_QUARTER = 60 / 90;
/** Si4, the middle line of clave de Sol: where note-value symbols are drawn. */
const VALUE_PITCH = 71;

export function correctAnswerLabel(q: Question): string {
  if (q.kind === 'note-reading') return pitchLabel(q.pitch);
  if (q.type === 'relation') return String(q.options[q.correctIndex]);
  return symbolLabel(q.symbol);
}

/** What to play after a wrong answer: the note itself, or a note as long as the asked value. */
export function feedbackSound(q: Question): { midi: number; seconds: number } | null {
  if (q.kind === 'note-reading') return { midi: midiNumber(q.pitch), seconds: 1 };
  if (q.type === 'relation' || q.symbol.rest) return null;
  return { midi: VALUE_PITCH, seconds: lengthInWholes(q.symbol) * 4 * SECONDS_PER_QUARTER };
}
```

- [ ] **Step 4: Implement the question view**

`apps/client/src/training/QuestionView.tsx`:
```tsx
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
```

- [ ] **Step 5: Implement the Round and summary screens**

`apps/client/src/training/RoundScreen.tsx`:
```tsx
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  advance, answerQuestion, keyboardRange, nextQuestion, remainingMs, startRound, tick,
  type Answer, type Attempt, type ExerciseConfig, type Rng, type RoundMode, type RoundRecord, type RoundState,
} from '@partitura/core';
import { playMidi } from '../audio/piano';
import { useKeyDown } from '../hooks/useKeyDown';
import { t } from '../i18n/pt-BR';
import { addAttempt, addRound, attemptsFor, db } from '../storage/db';
import { correctAnswerLabel, feedbackSound } from './feedback';
import { QuestionView } from './QuestionView';

/** How long "Certo!" stays before the next question. Wrong answers wait for "Próxima". */
const CORRECT_PAUSE_MS = 500;

interface Props {
  config: ExerciseConfig;
  levelId: string | null;
  mode: RoundMode;
  onFinished: (record: RoundRecord) => void;
  onQuit: () => void;
  rng?: Rng;
}

export function RoundScreen({ config, levelId, mode, onFinished, onQuit, rng = Math.random }: Props) {
  const [roundId] = useState(() => crypto.randomUUID());
  const [startedAt] = useState(() => new Date().toISOString());
  const history = useRef<Attempt[]>([]);
  const finished = useRef(false);
  const [state, setState] = useState<RoundState | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const keyboard = useMemo(
    () => (config.exercise === 'note-reading' && config.answerMode === 'piano' ? keyboardRange(config) : null),
    [config],
  );
  const generate = useCallback(
    (previousKey: string | null) => nextQuestion(config, history.current, previousKey, rng),
    [config, rng],
  );

  // Load past Attempts first so the very first question already adapts to them.
  useEffect(() => {
    let alive = true;
    attemptsFor(db, config.exercise).then((past) => {
      if (!alive) return;
      history.current = past;
      setState(startRound(mode, generate(null), Date.now()));
    });
    return () => {
      alive = false;
    };
  }, [config.exercise, mode, generate]);

  useEffect(() => {
    if (mode.kind !== 'timed') return;
    const id = setInterval(() => {
      const at = Date.now();
      setNow(at);
      setState((s) => (s ? tick(s, at) : s));
    }, 250);
    return () => clearInterval(id);
  }, [mode]);

  useEffect(() => {
    if (state?.status !== 'finished' || finished.current) return;
    finished.current = true;
    const record: RoundRecord = {
      id: roundId,
      exercise: config.exercise,
      levelId,
      answerMode: config.exercise === 'note-reading' ? config.answerMode : null,
      speed: mode.kind === 'timed',
      startedAt,
      finishedAt: new Date().toISOString(),
      answered: state.answered,
      correct: state.correct,
      totalMs: state.totalMs,
    };
    void addRound(db, record).then(() => onFinished(record));
  }, [state, roundId, config, levelId, mode, startedAt, onFinished]);

  const handleAnswer = useCallback(
    (answer: Answer) => {
      if (!state || state.status !== 'asking') return;
      const at = Date.now();
      const result = answerQuestion(state, answer, at);
      const attempt: Attempt = {
        id: crypto.randomUUID(),
        roundId,
        exercise: config.exercise,
        itemKey: state.question.itemKey,
        question: state.question,
        answer,
        correct: result.correct,
        ms: result.ms,
        answeredAt: new Date(at).toISOString(),
      };
      history.current = [...history.current, attempt];
      void addAttempt(db, attempt);
      setState(result.state);

      if (result.correct) {
        setTimeout(() => {
          setState((s) => (s && s.status === 'feedback' ? advance(s, Date.now(), () => generate(attempt.itemKey)) : s));
        }, CORRECT_PAUSE_MS);
      } else {
        const sound = feedbackSound(state.question);
        if (sound) void playMidi(sound.midi, sound.seconds);
      }
    },
    [state, roundId, config.exercise, generate],
  );

  const handleNext = useCallback(() => {
    setState((s) => (s && s.status === 'feedback' ? advance(s, Date.now(), () => generate(s.question.itemKey)) : s));
  }, [generate]);

  const waitingForNext = state?.status === 'feedback' && state.last?.correct === false;
  useKeyDown((event) => {
    if (event.key === 'Enter') handleNext();
  }, waitingForNext);

  if (!state) return <main className="screen round" aria-busy="true" />;

  const remaining = remainingMs(state, now);
  const shownNumber = state.status === 'asking' ? state.answered + 1 : state.answered;

  return (
    <main className="screen round">
      <header className="round__header">
        <button type="button" className="link" onClick={onQuit}>{t.round.quit}</button>
        <span>
          {mode.kind === 'count'
            ? t.round.progress(Math.min(shownNumber, mode.total), mode.total)
            : t.round.secondsLeft(Math.ceil((remaining ?? 0) / 1000))}
        </span>
      </header>

      <QuestionView
        question={state.question}
        keyboard={keyboard}
        feedback={state.status === 'feedback' ? state.last : null}
        onAnswer={handleAnswer}
      />

      <footer className="round__feedback" aria-live="polite">
        {state.status === 'feedback' && state.last?.correct && <p className="is-correct">{t.round.correct}</p>}
        {waitingForNext && (
          <>
            <p className="is-wrong">{t.round.wrongWas(correctAnswerLabel(state.question))}</p>
            <button type="button" className="primary" onClick={handleNext}>{t.round.next}</button>
          </>
        )}
      </footer>
    </main>
  );
}
```

`apps/client/src/training/SummaryScreen.tsx`:
```tsx
import type { RoundRecord } from '@partitura/core';
import { formatSeconds } from '../i18n/format';
import { t } from '../i18n/pt-BR';

interface Props {
  record: RoundRecord;
  onAgain: () => void;
  onBack: () => void;
}

export function SummaryScreen({ record, onAgain, onBack }: Props) {
  const average = record.answered === 0 ? 0 : record.totalMs / record.answered;
  return (
    <main className="screen">
      <h1>{t.summary.title}</h1>
      <p className="prompt">{t.summary.score(record.correct, record.answered)}</p>
      <p className="prompt">{t.summary.average(formatSeconds(average))}</p>
      <button type="button" className="primary" onClick={onAgain}>{t.summary.again}</button>
      <button type="button" className="link" onClick={onBack}>{t.summary.back}</button>
    </main>
  );
}
```

- [ ] **Step 6: Run the tests and typecheck**

Run: `pnpm --filter @partitura/client test && pnpm --filter @partitura/client typecheck`
Expected: PASS, and no type errors.

- [ ] **Step 7: Check sound and rendering by hand**

Temporarily replace the body of `App` in `apps/client/src/App.tsx` with the code below. Do not commit this change.
```tsx
import { useState } from 'react';
import { DEFAULT_ROUND } from '@partitura/core';
import { loadPiano } from './audio/piano';
import { RoundScreen } from './training/RoundScreen';

export default function App() {
  const [go, setGo] = useState(false);
  if (!go) return <button type="button" onClick={() => { void loadPiano(); setGo(true); }}>start</button>;
  return <RoundScreen config={{ exercise: 'note-reading', staves: 'grand', ledgerLines: 1, accidentals: false, answerMode: 'name' }} levelId={null} mode={DEFAULT_ROUND} onFinished={console.log} onQuit={() => setGo(false)} />;
}
```
Run `pnpm dev`, click **start**, and answer a few notes. Expected:
- A grand staff with one note.
- A wrong answer shows "Era …" and you hear the piano.
- Enter moves to the next note.
- The letter keys answer.
- In OS dark mode, the staff is drawn in light ink. If it stays black, add `.staff svg { filter: invert(1) hue-rotate(180deg); }` inside the dark-mode media query in `styles.css`, recheck, and commit that CSS change.

Then restore `App.tsx` with `git checkout apps/client/src/App.tsx`.

- [ ] **Step 8: Commit**

```bash
git add apps/client
git commit -m "feat(client): play a Round with feedback, sound and stored Attempts"
```

---

### Task 14: Progress screen

**Files:**
- Create: `apps/client/src/training/ProgressScreen.tsx`
- Test: `apps/client/src/training/ProgressScreen.test.tsx`

**Interfaces:**
- Consumes: `weakItems`, `suggestNextLevel`, `levelOrder`, and the types `WeakItem`, `Question`, `Clef`, `Pitch`, `ExerciseKind` from `@partitura/core`. From the client: `attemptsFor`, `roundsFor`, `db`, `Staff`, `pitchesMei`, `t`, and the formatters.
- Produces: `<ProgressScreen exercise={ExerciseKind} onBack={() => void} />`

- [ ] **Step 1: Write the failing test**

`apps/client/src/training/ProgressScreen.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Attempt, RoundRecord } from '@partitura/core';
import { ProgressScreen } from './ProgressScreen';

const weakAttempt = (i: number): Attempt => ({
  id: `a${i}`, roundId: 'r', exercise: 'note-reading', itemKey: 'nr:bass:A2',
  question: { kind: 'note-reading', itemKey: 'nr:bass:A2', clef: 'bass', layout: 'single', pitch: { step: 'A', octave: 2, alter: 0 }, answerMode: 'name' },
  answer: { kind: 'step', step: 'C' }, correct: false, ms: 2000, answeredAt: `2026-10-07T10:00:0${i}.000Z`,
});
const goodRound = (i: number): RoundRecord => ({
  id: `r${i}`, exercise: 'note-reading', levelId: 'nr-2', answerMode: 'name', speed: false,
  startedAt: `2026-10-07T1${i}:00:00.000Z`, finishedAt: `2026-10-07T1${i}:01:00.000Z`, answered: 20, correct: 19, totalMs: 30_000,
});

vi.mock('../storage/db', () => ({
  db: {},
  attemptsFor: vi.fn(async () => [weakAttempt(1), weakAttempt(2), weakAttempt(3)]),
  roundsFor: vi.fn(async () => [goodRound(1), goodRound(2), goodRound(3)]),
}));
vi.mock('../render/verovio', () => ({ renderMei: vi.fn(async () => '<svg></svg>') }));

describe('ProgressScreen', () => {
  it('shows weak notes, the Level suggestion and recent Rounds', async () => {
    render(<ProgressScreen exercise="note-reading" onBack={() => {}} />);
    expect(await screen.findByText(/Lá \(clave de Fá\)/)).toBeInTheDocument();
    expect(screen.getByText(/Experimente o Nível 3/)).toBeInTheDocument();
    expect(screen.getAllByText(/19 de 20/)).toHaveLength(3);
    expect(screen.getByTestId('staff')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm --filter @partitura/client test`
Expected: FAIL, "Failed to resolve import ./ProgressScreen".

- [ ] **Step 3: Implement**

`apps/client/src/training/ProgressScreen.tsx`:
```tsx
import { useEffect, useState } from 'react';
import {
  levelOrder, suggestNextLevel, weakItems,
  type Attempt, type Clef, type ExerciseKind, type Pitch, type Question, type RoundRecord, type WeakItem,
} from '@partitura/core';
import { Staff } from '../components/Staff';
import { formatPercent, pitchLabel, pluralValue, symbolLabel } from '../i18n/format';
import { t } from '../i18n/pt-BR';
import { pitchesMei } from '../render/mei';
import { attemptsFor, db, roundsFor } from '../storage/db';

const WEAK_COLOR = '#b3261e';
const RECENT_ROUNDS = 10;
const dateFormat = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

function weakLabel(q: Question): string {
  if (q.kind === 'note-reading') return `${pitchLabel(q.pitch)} (${t.clef[q.clef]})`;
  if (q.type === 'relation') return t.round.relation(pluralValue(q.part.value), symbolLabel(q.whole));
  return symbolLabel(q.symbol);
}

function WeakList({ items }: { items: WeakItem[] }) {
  const byClef = new Map<Clef, Pitch[]>();
  for (const item of items) {
    if (item.question.kind !== 'note-reading') continue;
    const list = byClef.get(item.question.clef) ?? [];
    list.push(item.question.pitch);
    byClef.set(item.question.clef, list);
  }
  return (
    <>
      {[...byClef].map(([clef, pitches]) => (
        <Staff key={clef} mei={pitchesMei(clef, pitches, WEAK_COLOR)} />
      ))}
      <ul className="weak-list">
        {items.map((item) => (
          <li key={item.itemKey}>{weakLabel(item.question)}: {formatPercent(item.accuracy)}</li>
        ))}
      </ul>
    </>
  );
}

interface Props {
  exercise: ExerciseKind;
  onBack: () => void;
}

export function ProgressScreen({ exercise, onBack }: Props) {
  const [data, setData] = useState<{ attempts: Attempt[]; rounds: RoundRecord[] } | null>(null);

  useEffect(() => {
    let alive = true;
    Promise.all([attemptsFor(db, exercise), roundsFor(db, exercise)]).then(([attempts, rounds]) => {
      if (alive) setData({ attempts, rounds });
    });
    return () => {
      alive = false;
    };
  }, [exercise]);

  if (!data) return <main className="screen" aria-busy="true" />;

  const levels = levelOrder(exercise);
  const levelLabel = (id: string | null) => {
    const level = levels.find((l) => l.id === id);
    return level ? t.setup.level(level.number) : t.setup.custom;
  };
  const weak = weakItems(data.attempts);
  const next = levels.find((l) => l.id === suggestNextLevel(data.rounds, levels.map((l) => l.id)));
  const recent = [...data.rounds].reverse().slice(0, RECENT_ROUNDS);
  const title = exercise === 'note-reading' ? t.home.noteReading : t.home.noteValue;

  return (
    <main className="screen">
      <button type="button" className="link" onClick={onBack}>{t.progress.back}</button>
      <h1>{t.progress.title(title)}</h1>

      {next && <p className="callout">{t.progress.suggestion(next.number)}</p>}

      <section className="field">
        <h2>{t.progress.weak}</h2>
        {weak.length === 0 ? <p>{t.progress.noWeak}</p> : <WeakList items={weak} />}
      </section>

      <section className="field">
        <h2>{t.progress.recent}</h2>
        {recent.length === 0 ? (
          <p>{t.progress.noRounds}</p>
        ) : (
          <table>
            <thead>
              <tr><th>{t.progress.when}</th><th>{t.progress.level}</th><th>{t.progress.score}</th></tr>
            </thead>
            <tbody>
              {recent.map((r) => (
                <tr key={r.id}>
                  <td>{dateFormat.format(new Date(r.finishedAt))}</td>
                  <td>{levelLabel(r.levelId)}</td>
                  <td>{t.summary.score(r.correct, r.answered)} ({formatPercent(r.answered ? r.correct / r.answered : 0)})</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
```

- [ ] **Step 4: Run the tests and typecheck**

Run: `pnpm --filter @partitura/client test && pnpm --filter @partitura/client typecheck`
Expected: PASS, and no type errors.

- [ ] **Step 5: Commit**

```bash
git add apps/client
git commit -m "feat(client): progress screen with weak notes and Level suggestion"
```

---

### Task 15: Home, setup and navigation

**Files:**
- Create: `apps/client/src/training/HomeScreen.tsx`, `apps/client/src/training/SetupScreen.tsx`
- Replace: `apps/client/src/App.tsx`
- Test: `apps/client/src/training/SetupScreen.test.tsx`, `apps/client/src/App.test.tsx`

**Interfaces:**
- Consumes: `DEFAULT_ROUND`, `SPEED_ROUND`, `NOTE_READING_LEVELS`, `NOTE_VALUE_LEVELS`, `NOTE_VALUES`, `levelOrder`, `isConfigValid` and the types from `@partitura/core`. From the client: `loadPiano`, `RoundScreen`, `SummaryScreen`, `ProgressScreen`, `t`.
- Produces:
  - `interface RoundStart { config: ExerciseConfig; levelId: string | null; mode: RoundMode }`
  - `<HomeScreen onPick onProgress />`
  - `<SetupScreen exercise onStart={(s: RoundStart) => void} onBack />`
  - `App` (default export)

- [ ] **Step 1: Write the failing tests**

`apps/client/src/training/SetupScreen.test.tsx`:
```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_ROUND, SPEED_ROUND } from '@partitura/core';
import { SetupScreen } from './SetupScreen';

vi.mock('../audio/piano', () => ({ loadPiano: vi.fn(async () => undefined), playMidi: vi.fn() }));

describe('SetupScreen', () => {
  it('starts a note-reading Level with the chosen answer mode', () => {
    const onStart = vi.fn();
    render(<SetupScreen exercise="note-reading" onStart={onStart} onBack={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Nível 3' }));
    fireEvent.click(screen.getByRole('button', { name: 'Teclado' }));
    fireEvent.click(screen.getByRole('button', { name: 'Começar' }));
    expect(onStart).toHaveBeenCalledWith({
      config: { exercise: 'note-reading', answerMode: 'piano', staves: 'grand', ledgerLines: 0, accidentals: false },
      levelId: 'nr-3',
      mode: DEFAULT_ROUND,
    });
  });

  it('starts a speed Round', () => {
    const onStart = vi.fn();
    render(<SetupScreen exercise="note-value" onStart={onStart} onBack={() => {}} />);
    fireEvent.click(screen.getByLabelText('Modo velocidade (60 segundos)'));
    fireEvent.click(screen.getByRole('button', { name: 'Começar' }));
    expect(onStart.mock.calls[0][0]).toMatchObject({ levelId: 'nv-1', mode: SPEED_ROUND });
  });

  it('refuses a custom setup that cannot ask anything', () => {
    render(<SetupScreen exercise="note-value" onStart={() => {}} onBack={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Personalizado' }));
    for (const name of ['semibreve', 'mínima', 'semínima', 'colcheia']) fireEvent.click(screen.getByLabelText(name));
    expect(screen.getByRole('button', { name: 'Começar' })).toBeDisabled();
    expect(screen.getByText(/Escolha pelo menos uma figura/)).toBeInTheDocument();
  });

  it('allows accidentals only when answering on the piano', () => {
    render(<SetupScreen exercise="note-reading" onStart={() => {}} onBack={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Personalizado' }));
    expect(screen.getByLabelText(/Sustenidos e bemóis/)).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Teclado' }));
    expect(screen.getByLabelText(/Sustenidos e bemóis/)).toBeEnabled();
  });
});
```

`apps/client/src/App.test.tsx`:
```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import App from './App';

vi.mock('./audio/piano', () => ({ loadPiano: vi.fn(async () => undefined), playMidi: vi.fn() }));
vi.mock('./render/verovio', () => ({ renderMei: vi.fn(async () => '<svg></svg>') }));

describe('App', () => {
  it('goes from the training home to an Exercise setup and back', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Treino' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Leitura de notas/ }));
    expect(screen.getByRole('button', { name: 'Nível 1' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Voltar' }));
    expect(screen.getByRole('heading', { name: 'Treino' })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `pnpm --filter @partitura/client test`
Expected: FAIL, "Failed to resolve import ./SetupScreen", and the App test fails because the temporary App has no buttons.

- [ ] **Step 3: Implement**

`apps/client/src/training/HomeScreen.tsx`:
```tsx
import type { ExerciseKind } from '@partitura/core';
import { t } from '../i18n/pt-BR';

interface Props {
  onPick: (exercise: ExerciseKind) => void;
  onProgress: (exercise: ExerciseKind) => void;
}

const CARDS: { exercise: ExerciseKind; title: string; hint: string }[] = [
  { exercise: 'note-reading', title: t.home.noteReading, hint: t.home.noteReadingHint },
  { exercise: 'note-value', title: t.home.noteValue, hint: t.home.noteValueHint },
];

export function HomeScreen({ onPick, onProgress }: Props) {
  return (
    <main className="screen">
      <h1>{t.home.title}</h1>
      <div className="cards">
        {CARDS.map((card) => (
          <div key={card.exercise} className="card-wrap">
            <button type="button" className="card" onClick={() => onPick(card.exercise)}>
              <span className="card__title">{card.title}</span>
              <span className="card__hint">{card.hint}</span>
            </button>
            <button type="button" className="link" onClick={() => onProgress(card.exercise)}>{t.home.progress}</button>
          </div>
        ))}
      </div>
    </main>
  );
}
```

`apps/client/src/training/SetupScreen.tsx`:
```tsx
import { useState } from 'react';
import {
  DEFAULT_ROUND, NOTE_READING_LEVELS, NOTE_VALUES, NOTE_VALUE_LEVELS, SPEED_ROUND, isConfigValid, levelOrder,
  type AnswerMode, type ExerciseConfig, type ExerciseKind, type LedgerLines, type NoteReadingSettings,
  type NoteValueQuestionType, type NoteValueSettings, type RoundMode, type StaffChoice,
} from '@partitura/core';
import { loadPiano } from '../audio/piano';
import { t } from '../i18n/pt-BR';

export interface RoundStart {
  config: ExerciseConfig;
  levelId: string | null;
  mode: RoundMode;
}

const CUSTOM = 'custom';
const STAFF_CHOICES: StaffChoice[] = ['treble', 'bass', 'mixed', 'grand'];
const LEDGER_LINES: LedgerLines[] = [0, 1, 2, 3];
const QUESTION_TYPES: NoteValueQuestionType[] = ['symbol-to-name', 'name-to-symbol', 'relation'];

function toggle<T>(list: T[], item: T): T[] {
  return list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
}

interface Props {
  exercise: ExerciseKind;
  onStart: (start: RoundStart) => void;
  onBack: () => void;
}

export function SetupScreen({ exercise, onStart, onBack }: Props) {
  const levels = levelOrder(exercise);
  const [selected, setSelected] = useState<string>(levels[0].id);
  const [answerMode, setAnswerMode] = useState<AnswerMode>('name');
  const [speed, setSpeed] = useState(false);
  const [reading, setReading] = useState<NoteReadingSettings>({ staves: 'treble', ledgerLines: 0, accidentals: false });
  const [values, setValues] = useState<NoteValueSettings>({
    values: ['whole', 'half', 'quarter', 'eighth'], types: ['symbol-to-name'], rests: false, dotted: false,
  });

  const config: ExerciseConfig = exercise === 'note-reading'
    ? { exercise, answerMode, ...(selected === CUSTOM ? reading : NOTE_READING_LEVELS.find((l) => l.id === selected)!.settings) }
    : { exercise, ...(selected === CUSTOM ? values : NOTE_VALUE_LEVELS.find((l) => l.id === selected)!.settings) };
  const valid = isConfigValid(config);

  const start = () => {
    // Called from a tap, so the browser lets the piano start.
    void loadPiano();
    onStart({ config, levelId: selected === CUSTOM ? null : selected, mode: speed ? SPEED_ROUND : DEFAULT_ROUND });
  };

  return (
    <main className="screen">
      <button type="button" className="link" onClick={onBack}>{t.setup.back}</button>
      <h1>{exercise === 'note-reading' ? t.home.noteReading : t.home.noteValue}</h1>

      <section className="levels" aria-label={t.setup.levels}>
        {levels.map((level) => (
          <button key={level.id} type="button" aria-pressed={selected === level.id} onClick={() => setSelected(level.id)}>
            {t.setup.level(level.number)}
          </button>
        ))}
        <button type="button" aria-pressed={selected === CUSTOM} onClick={() => setSelected(CUSTOM)}>{t.setup.custom}</button>
      </section>

      {exercise === 'note-reading' && (
        <section className="field">
          <span>{t.setup.answerMode}</span>
          <div className="segmented">
            <button type="button" aria-pressed={answerMode === 'name'} onClick={() => setAnswerMode('name')}>{t.setup.byName}</button>
            <button type="button" aria-pressed={answerMode === 'piano'} onClick={() => setAnswerMode('piano')}>{t.setup.byPiano}</button>
          </div>
        </section>
      )}

      {selected === CUSTOM && exercise === 'note-reading' && (
        <ReadingCustom value={reading} onChange={setReading} answerMode={answerMode} />
      )}
      {selected === CUSTOM && exercise === 'note-value' && <ValuesCustom value={values} onChange={setValues} />}

      <label className="field field--inline">
        <input type="checkbox" checked={speed} onChange={(e) => setSpeed(e.target.checked)} />
        {t.setup.speed}
      </label>

      {!valid && <p className="is-wrong">{t.setup.invalid}</p>}
      <button type="button" className="primary" disabled={!valid} onClick={start}>{t.setup.start}</button>
    </main>
  );
}

function ReadingCustom({ value, onChange, answerMode }: {
  value: NoteReadingSettings;
  onChange: (v: NoteReadingSettings) => void;
  answerMode: AnswerMode;
}) {
  return (
    <section className="field">
      <label className="field">
        {t.setup.staves}
        <select value={value.staves} onChange={(e) => onChange({ ...value, staves: e.target.value as StaffChoice })}>
          {STAFF_CHOICES.map((s) => <option key={s} value={s}>{t.setup.staveChoice[s]}</option>)}
        </select>
      </label>
      <label className="field">
        {t.setup.ledgerLines}
        <select value={value.ledgerLines} onChange={(e) => onChange({ ...value, ledgerLines: Number(e.target.value) as LedgerLines })}>
          {LEDGER_LINES.map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
      </label>
      <label className="field field--inline">
        <input
          type="checkbox"
          checked={value.accidentals}
          disabled={answerMode !== 'piano'}
          onChange={(e) => onChange({ ...value, accidentals: e.target.checked })}
        />
        {t.setup.accidentals} <small>{t.setup.accidentalsHint}</small>
      </label>
    </section>
  );
}

function ValuesCustom({ value, onChange }: { value: NoteValueSettings; onChange: (v: NoteValueSettings) => void }) {
  return (
    <section className="field">
      <fieldset className="checks">
        <legend>{t.setup.values}</legend>
        {NOTE_VALUES.map((v) => (
          <label key={v}>
            <input type="checkbox" checked={value.values.includes(v)} onChange={() => onChange({ ...value, values: toggle(value.values, v) })} />
            {t.noteValue[v]}
          </label>
        ))}
      </fieldset>
      <fieldset className="checks">
        <legend>{t.setup.types}</legend>
        {QUESTION_TYPES.map((q) => (
          <label key={q}>
            <input type="checkbox" checked={value.types.includes(q)} onChange={() => onChange({ ...value, types: toggle(value.types, q) })} />
            {t.setup.typeChoice[q]}
          </label>
        ))}
      </fieldset>
      <label className="field field--inline">
        <input type="checkbox" checked={value.rests} onChange={(e) => onChange({ ...value, rests: e.target.checked })} />
        {t.setup.rests}
      </label>
      <label className="field field--inline">
        <input type="checkbox" checked={value.dotted} onChange={(e) => onChange({ ...value, dotted: e.target.checked })} />
        {t.setup.dottedValues}
      </label>
    </section>
  );
}
```

`apps/client/src/App.tsx`:
```tsx
import { useState } from 'react';
import type { ExerciseKind, RoundRecord } from '@partitura/core';
import { HomeScreen } from './training/HomeScreen';
import { ProgressScreen } from './training/ProgressScreen';
import { RoundScreen } from './training/RoundScreen';
import { SetupScreen, type RoundStart } from './training/SetupScreen';
import { SummaryScreen } from './training/SummaryScreen';

type Screen =
  | { name: 'home' }
  | { name: 'setup'; exercise: ExerciseKind }
  | { name: 'round'; start: RoundStart; run: number }
  | { name: 'summary'; start: RoundStart; record: RoundRecord }
  | { name: 'progress'; exercise: ExerciseKind };

export default function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'home' });
  const home = () => setScreen({ name: 'home' });
  const play = (start: RoundStart) => setScreen({ name: 'round', start, run: Date.now() });

  switch (screen.name) {
    case 'home':
      return (
        <HomeScreen
          onPick={(exercise) => setScreen({ name: 'setup', exercise })}
          onProgress={(exercise) => setScreen({ name: 'progress', exercise })}
        />
      );
    case 'setup':
      return <SetupScreen exercise={screen.exercise} onStart={play} onBack={home} />;
    case 'round':
      return (
        <RoundScreen
          key={screen.run}
          config={screen.start.config}
          levelId={screen.start.levelId}
          mode={screen.start.mode}
          onQuit={() => setScreen({ name: 'setup', exercise: screen.start.config.exercise })}
          onFinished={(record) => setScreen({ name: 'summary', start: screen.start, record })}
        />
      );
    case 'summary':
      return <SummaryScreen record={screen.record} onAgain={() => play(screen.start)} onBack={home} />;
    case 'progress':
      return <ProgressScreen exercise={screen.exercise} onBack={home} />;
  }
}
```

- [ ] **Step 4: Run all tests and the typecheck**

Run: `pnpm test && pnpm typecheck`
Expected: every core and client test PASSES, and there are no type errors.

- [ ] **Step 5: Walk through the app by hand in the browser**

Run `pnpm dev` and check:
1. On "Treino", open **Leitura de notas**, choose **Nível 2**, then **Começar**. You get 20 bass-clef notes, and the summary shows "x de 20" and the average seconds.
2. **De novo** starts a new Round.
3. Choose **Teclado** with **Nível 6**. The on-screen piano scrolls sideways, and sharp and flat notes appear.
4. **Figuras musicais**, **Nível 4**. You get symbol, name and "Quantas … cabem em uma …?" questions, and the number keys 1–4 answer.
5. Turn on **Modo velocidade**. The countdown runs from 60 s and the Round ends by itself.
6. **Ver progresso** lists the Rounds, and after a few misses on the same note it shows that note in red on a staff.
7. Reload the page. The progress is still there, because IndexedDB persists it.

- [ ] **Step 6: Commit**

```bash
git add apps/client
git commit -m "feat(client): training home, setup and navigation"
```

---

### Task 16: Android app with Capacitor

**Files:**
- Create: `apps/client/capacitor.config.ts`, `apps/client/android/` (generated)
- Modify: `apps/client/package.json` (scripts)

**Interfaces:**
- Consumes: the built web app (`apps/client/dist`).
- Produces: an installable Android app `dev.partitura.app` named "Partitura".

**Prerequisites (owner):** Android Studio with an Android SDK and JDK installed. The tablet must have developer options and USB debugging turned on, and be connected over USB (`adb devices` lists it).

- [ ] **Step 1: Add Capacitor**

```bash
cd apps/client
pnpm add @capacitor/core @capacitor/android
pnpm add -D @capacitor/cli
npx cap init Partitura dev.partitura.app --web-dir dist
pnpm build
npx cap add android
pnpm pkg set scripts.android="pnpm build && cap sync android && cap run android"
cd ../..
```

Expected: `apps/client/capacitor.config.ts` contains `appId: 'dev.partitura.app'`, `appName: 'Partitura'` and `webDir: 'dist'`, and `apps/client/android/` exists.

- [ ] **Step 2: Run on the tablet**

Run: `pnpm --filter @partitura/client android`, and pick the tablet when asked.
Expected: "Partitura" opens on the tablet and shows "Treino".

- [ ] **Step 3: Check it on the tablet by hand**

1. Repeat the browser walk-through from Task 15, Step 5 on the tablet, in both portrait and landscape.
2. The piano sound plays after a wrong answer.
3. The name buttons and piano keys are comfortable to hit with a finger, and nothing needs zooming.
4. **Turn on airplane mode, force-close the app and reopen it.** A full Round still works, with notes drawn and the piano sounding, and progress is kept. This confirms everything is bundled offline.
5. In dark mode on the tablet, the staff ink is readable.

Write down anything that felt slow or awkward. That feeds into Step 1b and Step 2.

- [ ] **Step 4: Commit**

```bash
git add apps/client
git commit -m "feat(client): Android app shell with Capacitor"
```

---

## What comes next

**Step 1b** gets its own plan. It covers:
- The home server: TypeScript/Node, Postgres and Docker Compose.
- Google sign-in.
- Cloudflare Tunnel on the owner's domain.
- Append-only Attempt and Round sync: push the unsynced ones, pull everything newer than the last sync. No conflicts are possible.
- Nightly off-site backups.

Write that plan once Step 1a is on the tablet and the domain name is decided.
