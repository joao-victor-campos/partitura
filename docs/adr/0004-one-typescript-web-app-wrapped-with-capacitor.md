# One TypeScript web app, wrapped with Capacitor for mobile

The web app and the Android tablet app (and later iOS) are one TypeScript codebase. It runs in the browser and is wrapped as a native app with Capacitor. We chose this because the hardest parts of the product (rendering notation, the editor, Playback, Bar maps) depend on libraries that only exist for the web (Verovio, OpenSheetMusicDisplay, pdf.js, Web Audio), so writing them once for every platform beats any native or Flutter/React Native approach, all of which would embed a web view for the notation anyway.

## Consequences

- Rendering long scores on mid-range Android tablets must be performance-tested early.
- Audio delay inside the web view is fine for Playback, but live MIDI play-along (planned for later) will probably need a native audio plugin.
