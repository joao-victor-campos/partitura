# Sheet Music App — Design

Status: agreed in the design session of 2026-10-06/07.
Vocabulary: [CONTEXT.md](../../../CONTEXT.md). Architecture decisions: [docs/adr/](../../adr/).

## 1. Product

A personal tool for **one pianist** (the owner) to read, play back, write and collect sheet music, and to train music reading. It runs on an **Android tablet** and on the **web**. iOS comes later, and the architecture must not block it.

- The whole interface is in **Brazilian Portuguese** with **solfège** pitch names (Dó Ré Mi Fá Sol Lá Si) and Portuguese Note values (semibreve, mínima, semínima, colcheia, semicolcheia, fusa, semifusa). Letter names (C–B) are used only as keyboard shortcuts. Every on-screen text comes from one replaceable message file, so English can be added later.
- The code and the glossary are in English.

## 2. Domain decisions (see CONTEXT.md for definitions)

| # | Decision |
|---|----------|
| Users | Only the owner, signed in on several devices. No sharing. |
| Library | The Library holds Pieces. A Piece has at most one Scan and at most one Notation. A second Notation prompts "replace, or keep as a separate Piece?" |
| Conversion | Opt-in. It produces a linked Notation plus a Bar map (ADR 0001). The engine is chosen by the Step 0 test, behind one interface: Scan in → Notation + Bar map out. |
| Bar map | Each Bar keeps its spot when other Bars are inserted or deleted. Newly inserted Bars have no spot until the user marks one. It can be made or fixed by hand. |
| Playback | Piano sound only. The current Bar is highlighted on the Notation, and on the Scan when a Bar map exists. |
| Editing scope | Any Notation can be viewed and played. Only piano parts can be edited. |
| Corrections vs Composing | Corrections work on every device. Composing is on the web first. |
| Composing input | Step input with the computer keyboard (MuseScore-like) plus a mouse palette. MIDI input comes later. The first editor commands cover simple writing (one voice per hand, the common Note values, ties, triplets, dynamics), but the model can represent multiple voices, cross-staff notes, grace notes, pedal and so on. |
| Sources | OpenScore and Mutopia download with one tap. IMSLP is search-only (ADR 0002). Every downloaded Piece records its Source, link and license. |
| Offline | Local-first: the full Library is on every device (ADR 0003). |
| Sync conflicts | The newest version of the whole Piece wins. The losing version goes into History with a notice that offers to restore it. Markings sync separately from the Notation. |
| Hands | Every note has a Hand, which for now always matches its staff. Later it can be corrected note by note. |
| Markings | Freehand ink on Scans only, kept as a separate sync unit. |
| Organization | Piece details (title, composer, opus), search that ignores accents, Recent, Favorites, Tags. No folders. |

## 3. Experience

- **Reading (tablet):** the music fills the screen and controls fade away. Nothing covers the music during Playback. Page turns use tap zones (outer thirds) and Bluetooth pedals (arrow and Page keys). Swipe is off. Portrait shows one page; landscape shows two pages or one page scrolling vertically. Half-page turns come later.
- **Composing (web):** a desk-style toolbar with note values, a status bar and visible shortcuts.
- **Page looks:** light (paper-like), dark (Scans inverted) and sepia. The Exercises (Step 1) follow the system light/dark setting. Sepia arrives with the Scan reader.
- **Playback controls in the first version:** tempo (pitch unchanged), start from any Bar, Loop, mute either Hand, metronome and Count-in, and automatic scrolling and page turns that follow Playback. Dynamics and pedal in the sound come later.

## 4. Training (Exercises)

- **Note reading:** one note on clave de Sol, clave de Fá, both alternating, or the grand staff, with 0–3 ledger lines.
  - Answer modes: **name** (seven solfège buttons, octave ignored; on the web the keys C–B also work) or **piano** (on-screen keyboard, octave matters, accidentals allowed).
  - Accidentals appear **only in piano mode**.
- **Note values:**
  - Symbol → name and name → symbol at the first Levels.
  - Then rests, relationships ("Quantas colcheias cabem em uma mínima?") and dotted values at higher Levels.
  - Semifusa only at the top Level.
- **Levels:** numbered presets, plus a custom setup.
- **Rounds:**
  - 20 questions by default. Speed mode is 60 seconds.
  - A wrong answer shows the right one and plays the note.
  - A summary at the end shows the score and the average time per answer.
- **Progress:**
  - Every Attempt is recorded (append-only).
  - Future Rounds ask more often about items with poor Attempts.
  - The progress screen shows weak notes on a staff, recent Rounds, and a suggestion to move up a Level at ≥90% over the last 3 Rounds.

## 5. Architecture (ADRs 0003–0006)

- One TypeScript web app, wrapped with Capacitor for Android (and later iOS).
- An app-specific Notation model with permanent IDs. MusicXML is used only for Import and export. MEI is generated on the fly for Verovio.
- Rendering with Verovio. PDFs with pdf.js. Audio with Web Audio, using a sampled piano (Tone.js Sampler with Salamander Grand Piano samples, CC-BY 3.0).
- The server is TypeScript on Node with Postgres and S3-compatible storage, plus a Conversion worker container. It is self-hosted at home with Docker Compose and reached through Cloudflare Tunnel. Sign-in is Google. Nightly backups go off-site.
- The client and the server share domain code from a pnpm workspace package (`packages/core`).

## 6. Build order

0. **Tests to cut risk:** the Conversion test (Audiveris vs Flat on the owner's PDFs), Verovio speed on the real tablet, and the Android "Share → app" flow.
1. **Exercises.** Split into **1a**, a local-only app on the web and Android, and **1b**, the server with sign-in and Attempt sync.
2. Scan reader: Library, Import PDF, reading, Markings, Tags and search, and Piece sync.
3. Notation and Playback, plus Sources.
4. Corrections.
5. Conversion and the Bar map.
6. Composing on the web.

Later: MIDI input, half-page turns, Setlists, dynamics and pedal in Playback, correcting the Hand note by note, ink on Notation, iOS.

## 7. Open items

- Conversion engine: decided by the Step 0 test, then recorded as an ADR.
- A domain name for the Cloudflare Tunnel (needed in Step 1b).
- The app's name. The working name is "Partitura" (package scope `@partitura`, app id `dev.partitura.app`).
