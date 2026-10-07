# Notation is stored in our own model; MusicXML only at the edges

A Notation is stored in an app-specific TypeScript/JSON model in which every Bar and note has a permanent ID. MusicXML (and later other formats) is converted in on Import or download and out on export, and the model is converted to MEI on the fly for Verovio to render. We chose this over storing MusicXML or MEI directly because Bar maps, tap-to-select, the Playback highlight and History all depend on identities that survive inserting and deleting Bars, and MusicXML identifies bars only by a number that shifts. It also gives the editor a far simpler structure to work on than XML.

## Consequences

- We own the MusicXML conversion. Constructs the model can't represent are dropped on Import, and the user is warned.
