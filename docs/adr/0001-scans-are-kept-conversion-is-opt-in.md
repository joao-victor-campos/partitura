# Scans are kept as originals; Conversion to Notation is opt-in

Imported PDFs are stored and displayed as Scans, never replaced. Music recognition (Conversion) is a separate action the user chooses to run, and it produces a linked Notation that can be played and edited. We chose this over converting every PDF on import because recognition errors on real piano scans are common, and the reading view must always match the original. Public libraries such as IMSLP mostly provide scans, so Scans have to be fully supported even without Conversion.

## Considered Options

- **Scan-only, no Conversion**: simplest, but imported PDFs could never be played.
- **Convert on import**: one representation, but every import would need manual correction, and the user would read music that may be wrong.
