# Deutsch Meister 3.7.0 — validation status

## Source migration

- Piper voice manager and worker removed from the active app.
- Phonon 0.4.2 adapter and four voice choices added.
- Voice audition samples, selected-only download controls, system fallback and Phonon cache deletion added.
- Service worker updated to cache local runtime assets and audition recordings.
- Existing IndexedDB, vocabulary, CSV/JSON, Leitner and SM-2 source modules were not intentionally modified.

## Checks not yet run

- The local `vendor/phonon-tts` directory must be generated with `npm install && npm run vendor:phonon`.
- JavaScript syntax checks and `npm test` have not yet been run in this environment.
- GitHub Actions result has not yet been confirmed.
- Real model synthesis and physical iPhone 16 / iOS 26 playback have not been tested.

Do not treat this as a verified release until the vendored runtime is present, automated checks pass, and manual browser/device tests are complete.
