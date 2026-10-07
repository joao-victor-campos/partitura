# Sheet Music App

A personal tool for one pianist to read, play back, write and collect sheet music, and to train music reading, on an Android tablet and on the web.

Everything the user sees is in Brazilian Portuguese and uses solfège names. The terms below are the English names used in conversation and in the code.

## Language

### Musical vocabulary

**Pitch name**:
The name of a note's pitch, shown in solfège: Dó, Ré, Mi, Fá, Sol, Lá, Si. Letter names (C–B) are used only as keyboard shortcuts.
_Avoid_: Note name, letter, key

**Note value**:
The written symbol that shows how long a note or rest lasts, named in Portuguese: semibreve, mínima, semínima, colcheia, semicolcheia, fusa, semifusa.
_Avoid_: Figure, duration, rhythm, note type

**Clef**:
The sign at the start of a staff that fixes which line is which pitch. The app trains two: treble clef (clave de Sol) and bass clef (clave de Fá).
_Avoid_: Key (that means key signature)

### Training

**Exercise**:
A drill that trains the user's music reading, made of questions the app generates. It has nothing to do with Pieces. There are two kinds: note reading (identify a note shown on a staff) and note values (identify a Note value).
_Avoid_: Lesson, quiz, game, practice (Practice means working on a Piece)

**Level**:
A named preset of Exercise settings (which Clefs, how many ledger lines, whether accidentals appear), ordered from easy to hard. The user can also set up a custom Exercise. Accidentals appear only when answering on the piano.
_Avoid_: Difficulty, stage, grade

**Round**:
One sitting of an Exercise: normally a fixed number of questions (20 by default), or, in speed mode, as many as the user can answer before time runs out. After a wrong answer the app shows the right one and plays the note.
_Avoid_: Session, game, test

**Attempt**:
One answered question: what was asked, what the user answered, whether it was right, and how long it took. Attempts are only ever added, never changed, so the same progress appears on every device. Future Rounds ask more often about notes with poor Attempts.
_Avoid_: Answer, result, score

**Answer mode**:
How the user answers a note-reading question: by tapping the Pitch name, where the octave doesn't matter, or by tapping the matching key on an on-screen piano, where it does.
_Avoid_: Input, response type

### Library

**Library**:
Every score that belongs to the user, identical on every device they sign in on.
_Avoid_: Collection, catalog, my sheets

**Piece**:
One musical work in the Library, holding at most one Scan and at most one Notation. "Score" is used only informally to mean a Piece.
_Avoid_: Sheet, song, file, item

**Tag**:
A label the user puts on Pieces to group them, such as "learning" or "Chopin". A Piece can have any number of Tags, and Tags are the only way to organize the Library.
_Avoid_: Folder, category, playlist

**History**:
The earlier versions of a Piece, any of which can be restored. When the same Piece was changed on two devices, the newest version wins as a whole and the other goes into History, and the user is told it happened.
_Avoid_: Backups, revisions, undo

**Import**:
Bringing a file from the user's device into the Library.
_Avoid_: Upload, add

**Source**:
A public sheet music library (such as IMSLP, Mutopia or OpenScore) that the user can search from inside the app. Some Sources allow one-tap download straight into the Library. Others, like IMSLP, are search-only: the user downloads the file on the Source's own site and then Imports it. A Piece that came from a Source remembers which Source, its link, and its license.
_Avoid_: Public library, repository, catalog, store

### Forms of a score

**Scan**:
A score stored as page images (for example, an imported PDF). It is shown exactly as the original and cannot be played or edited.
_Avoid_: PDF, image, sheet

**Notation**:
A score stored as musical symbols the app understands. Any Notation can be viewed and played, but only piano parts can be edited.
_Avoid_: MusicXML, digital score, sheet

**Conversion**:
The user-initiated, error-prone process of reading a Scan with music recognition to produce a Notation.
_Avoid_: OMR, recognition, import

**Bar**:
One measure of music, the unit used to line up a Notation with a Scan.
_Avoid_: Measure

**Bar map**:
The link between a Piece's Notation and its Scan, recording where each written Bar sits on the Scan's pages. Conversion creates one, and the user can also create or fix it by hand. Inserting or deleting Bars in the Notation leaves every other Bar's spot unchanged. A newly inserted Bar has no spot until the user marks one.
_Avoid_: Sync, alignment, overlay

**Markings**:
Freehand ink the user draws on a Scan's pages, like pencil on paper. Markings belong to the Piece but are separate from its Notation: changing one never overwrites the other, even when made on different devices.
_Avoid_: Annotations, notes, drawings

### Editing

**Correction**:
A small change to a Notation that already exists: fixing a note's pitch, duration or accidental, inserting or deleting a note or Bar, or fixing the Bar map. Available on every device.
_Avoid_: Fix, tweak, quick edit

**Composing**:
Writing or substantially reworking a Notation: starting a Piece from scratch, entering passages, copying and pasting, or restructuring. Available on the web first.
_Avoid_: Creating, authoring, writing mode

**Step input**:
Entering notes one at a time by first choosing a duration and then a pitch, as opposed to recording free playing in real time.
_Avoid_: Note entry, typing notes

### Playback

**Playback**:
Sounding a Piece's Notation with a piano sound. During Playback the current Bar is highlighted on whichever form is on screen: always on the Notation, and on the Scan only when a Bar map exists.
_Avoid_: Play-along, audio, MIDI

**Hand**:
Which hand, right or left, plays a note. Every note has one. For now it always follows the staff the note is written on (upper staff means right hand), and later it can be corrected per note for music written across the staves.
_Avoid_: Staff (when you mean who plays it), voice

**Loop**:
A range of Bars that Playback repeats until the user stops it.
_Avoid_: Repeat, section, practice range

**Count-in**:
Metronome clicks for one Bar before Playback starts, so the user can come in on time.
_Avoid_: Pre-roll, lead-in
