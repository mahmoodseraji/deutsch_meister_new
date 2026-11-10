# Deutsch Meister 3.7.0

Deutsch Meister is an offline-first German vocabulary PWA. It contains no bundled vocabulary: learners add words manually or import their own CSV/TSV files.

## What's new in 3.7.0 — Phonon pronunciation

- Replaces the old Piper pronunciation engine with the official browser runtime `phonon-tts` 0.4.2.
- Offers four auditionable voices: Nele and Anton (German), Zoey and Easton (US English).
- Keeps independent German and English voice selections. Samples are small static OGG files and can be played before downloading the model.
- Neural downloads are user-initiated. The shared multilingual q8 model is downloaded once; only the selected voice embeddings are loaded.
- System speech remains immediately available and is used as a fallback if Phonon cannot play.
- Downloaded model and voice files can be deleted without affecting vocabulary or learning progress.
- The runtime is vendored locally so its JavaScript and WebAssembly files are available offline after the app shell has been installed.

### Install the local Phonon runtime

Node.js 20+ is recommended. From the repository root:

```bash
npm install
npm run vendor:phonon
```

This copies the exact pinned `phonon-tts@0.4.2` package, including its WebAssembly modules and licence notices, into `vendor/phonon-tts`. Commit that generated directory when preparing the static GitHub Pages release. The script refuses to vendor a different runtime version.

The Phonon 40M multilingual checkpoint and voice catalogue assets are already stored in `models/phonon` and `assets/voice-samples`. The model is CC BY-NC 4.0 and must not be used commercially without appropriate permission. See `PHONON-LICENSE-NOTICE.md` and `PHONON-RUNTIME-NOTICE.md`.

## Build automation

The migration branch CI vendors the pinned runtime, runs syntax and regression checks, and commits the generated `vendor/phonon-tts` files to this branch after successful checks. The `main` branch is not modified.

## Existing learning features

The two learning methods retain independent schedules for every word. Leitner uses five boxes (1, 2, 4, 7 and 14 days); Forgot returns a word to Box 1 and Remembered advances one box. Classic SM-2 uses Again=1, Hard=3, Good=4, Easy=5; successful intervals begin at 1 day and 6 days, then use the updated ease factor. Due dates use local calendar dates.

The app continues to use the existing IndexedDB database, vocabulary, review history, CSV/TSV import/export, JSON backup/restore, challenges, quizzes, deletion, progress and PWA features. The pronunciation migration does not intentionally modify vocabulary or scheduler data.

## Run locally

Serve this folder from localhost or HTTPS; do not open `index.html` as a `file://` URL.

```bash
python -m http.server 8000
```

Open `http://localhost:8000`.

## Automated checks

```bash
npm test
```

Tests are source-level and mocked checks; they do not prove actual audio generation on a physical device. Before release, run the vendor command, run the full suite, then test a fresh install, cached offline startup, voice switching, deletion and playback on iPhone Safari/iOS 26. No iPhone 16 / iOS 26 verification is claimed until that test has actually been performed.
