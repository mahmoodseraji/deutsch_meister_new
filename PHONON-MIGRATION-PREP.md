# Deutsch Meister 3.7.0 — Phonon migration handover

The application source has now been migrated on branch `phonon-migration-v3.7.0`. Main remains unchanged.

## Implemented in the branch

- Piper coordinator and worker removed; the app now uses the official `phonon-tts` 0.4.2 browser API.
- Four sample players and separate German/English selectors: Nele, Anton, Zoey, Easton.
- User-initiated downloads; shared q8 multilingual model plus only the selected voice embedding.
- System speech remains the default and fallback.
- Cache deletion removes Phonon model and voice entries without touching IndexedDB vocabulary or review progress.
- Service-worker cache version bumped to 3.7.0; sample recordings and vendored runtime paths are listed for offline caching.
- Existing scheduler, vocabulary, CSV/JSON and IndexedDB code has not intentionally been changed.

## Required local build step

The npm runtime must be copied into the repository before deployment. From the repository root, with Node.js 20+:

```powershell
npm install
npm run vendor:phonon
npm test
```

Commit the generated `vendor/phonon-tts` directory. It includes the runtime JavaScript, worker, WebAssembly files and package licence notices. The workflow added to this branch also performs syntax checks, tests and runtime asset checks.

The 74.6 MB model and four voice embeddings plus preview OGGs are already in the repository. The model is CC BY-NC 4.0; keep the attribution and non-commercial notice.

## Not yet verified

- The npm runtime has not yet been generated/committed in this branch.
- The full automated suite and JavaScript syntax checks have not yet been run in this environment.
- Actual Phonon synthesis has not been run in desktop Safari/Chrome or on iPhone 16 / iOS 26.
- Offline cold start, switching voices, and cache deletion require browser/device testing.

Do not merge or publish this as a completed release until the vendoring step and automated checks pass, then perform real-device playback tests. No vocabulary or learning progress should be lost by this pronunciation-only change.
