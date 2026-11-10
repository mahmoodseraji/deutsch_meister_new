## 3.6.7 — Review reliability, status drill-down and focused card layout

- Unrated new words are no longer marked as introduced; they return to the next session after interruption or app closure.
- A word is marked as introduced only after the learner submits a rating. The schedule and associated review logs are committed atomically.
- Leitner boxes and SM-2 learning stages are clickable and show the vocabulary assigned to each group.
- Daily review goal is clarified as a progress target, not a cap. The new-words-per-day allowance is added on top of all due reviews.
- Review mode hides the app header and dashboard, uses a fixed-height card viewport, keeps rating controls visible, and flips by tapping anywhere on the card.
- Restoring a backup preserves its streak history by retaining the earliest valid history start date.
- Library vocabulary opens a detail window with meanings, examples, grammar and verb forms.

# Changelog

## 3.6.1 — Simplification and voice stability work

- Simplified Home, Practice, Library, Progress and Settings; removed extra Library filters, favourite controls and duplicate Home shortcuts.
- Kept the four main navigation destinations and the Settings shortcut.
- Kept exactly two voice choices per language: System/Jarvis for German and System/Amy for English.
- First-launch voice downloads run sequentially in the background; the system voice remains available during downloads.
- Kept voice weights out of the app bundle. Models are streamed into OPFS; runtime assets are cached by the service worker.
- Waited for the service worker to control the page before starting the virtual runtime-asset downloads, avoiding a first-launch cache race.
- Removed repeated runtime-asset draining before each inference; the Worker loads the required cached scripts and WASM assets when it initializes.
- Pinned ONNX Runtime Web 1.18.0's WASM-only bundle and one-thread execution, avoiding the newer default JSEP bundle implicated in Safari/WebKit memory reports.
- Kept inference in a dedicated Worker, reused the phonemizer and active-language session, and released the previous session when switching languages.
- Corrected model-cache handling: legacy Thorsten files are no longer relabelled as Jarvis. The old MLS/Thorsten/Amy cache is cleaned and the two selected models are downloaded from their configured sources.
- Added stronger voice-config and model-file checks, explicit ONNX tensor dimensions, phoneme-ID range validation and a bounded text length for neural inference.
- Added graceful system-voice fallback and release of audio/Worker resources when the app is backgrounded.
- Cached practice availability until the user's vocabulary changes and retained 100-word Library pagination.
- Preserved CSV/TSV import/export, all 17 columns, independent Leitner/SM-2 schedules, user-only vocabulary, individual deletion and CSV-batch deletion.

## Validation

- Automated Node suite: 42 tests pass.
- JavaScript syntax, HTML ID references, service-worker asset list, manifest, CSV template and ZIP integrity are checked before packaging.
- Mocked Worker tests do not prove that the real downloaded ONNX files synthesize correctly.
- No physical iPhone 16 / iOS 26 test has been performed; do not claim iPhone verification.

## 3.6.1
- Added neural voice diagnostics showing model initialisation, phonemisation, ONNX inference, audio decoding and playback stages, with a visible recent-event log and explicit failure message.
- Added bounded audio playback waits and an iOS AudioContext running-state check so a playback failure is reported instead of appearing to do nothing.
- Added controls to delete both downloaded neural voice models from this device and to opt out of automatic downloads. Vocabulary, learning progress and system voices are unaffected.
- Added an explicit action to download the neural voices again later.
- Kept the existing simplified learning interface and voice choices.


## 3.6.2
- Home now stays a clean overview until the user starts a review session.
- Review mode hides the overview and bottom navigation so the flashcard is presented as the primary full-screen task without scrolling past the dashboard. Added an explicit End review control.
- Rebuilt the review card as a 3D flip card: Show answer rotates to the reverse side. Rating an answer animates the card off-screen before the next card appears.
- Added subtle tactile press, hover, and elevation animations to buttons and interactive controls, with reduced-motion accessibility support.
- No changes to vocabulary storage, CSV import/export, scheduling algorithms, or neural voice implementation.

## 3.6.3 — Scheduling correctness

- Corrected Leitner failure handling: **Again returns a card to Box 1**; Hard keeps its current box; Good advances one box; Easy advances two boxes. Five box intervals remain 1, 2, 4, 7 and 14 days.
- Replaced the previous modified SM-2 progression with the classic SM-2 interval sequence: first successful repetition 1 day, second 6 days, then previous interval multiplied by the updated ease factor and rounded.
- Explicit SM-2 quality mapping: Again=1 (reset repetitions), Hard=3, Good=4, Easy=5. Ease-factor updates use the standard SM-2 equation and never fall below 1.3.
- Answer buttons show the actual next interval calculated for the selected method and current word.
- Kept Leitner and SM-2 histories independent; added deterministic local-date handling and expanded automated regression tests.
- No changes to vocabulary, IndexedDB stores, CSV format, interface layout, or voice engine.


## 3.6.4 — Method-aware review controls

- Review controls now adapt to the selected learning method. Leitner presents its classic two outcomes (Forgot / Remembered), with the current box, destination box and interval; SM-2 presents Again, Hard, Good and Easy with its calculated interval.
- The four rating buttons moved outside the flip-card and remain visible before and after revealing the answer. A learner can now rate a familiar word immediately without flipping the card.
- Added a short explanation that the displayed day count is the next review interval.
- Leitner no longer exposes SM-2-only Hard/Easy ratings; its scheduler accepts only Forgot/Remembered outcomes, preventing non-standard box behavior.
- Normalized partially populated method-specific schedules safely on startup. Legacy top-level schedule fields are migrated only when neither independent schedule exists, preventing a missing method from inheriting the other method's legacy mirror.
- Added regression tests for Leitner-specific labels, actual destination boxes, SM-2 labels, partial schedule migration and rating controls outside the flip-card.
- No IndexedDB database name, object-store, CSV schema, vocabulary content or voice engine changes.

## 3.6.6 — Focused daily learning, flashcards and Progress update

- Separated the daily new-word limit (default 10) from the daily review goal (default 10).
- Daily sessions now queue previously learned words that are due under the selected method first, followed by up to the configured number of genuinely new words.
- A word with review history under either algorithm is never classified as new after switching methods. New words are marked introduced when first displayed, avoiding consuming the daily limit for unseen queued words.
- Redesigned the flashcard front to show part of speech, article when present, German word and plural when provided; removed the GERMAN label and show-answer text.
- The back now presents English meaning, German example, English example translation, only populated imported conjugations, then the dictionary link.
- Card flips on tap with a curved directional arrow and smooth animation. Sound, dictionary and rating controls remain independent; rating buttons remain outside the card.
- Dictionary links are generated from the German word and open Verbformen. `dictionary_url` is no longer required; the legacy CSV column remains optional for compatibility.
- Progress now shows only the selected algorithm's distribution: Leitner Boxes 1–5 or SM-2 New/Learning/Developing/Established, plus total vocabulary, mastered, due and reviewed-today counts.
- Leitner and SM-2 scheduling logic, IndexedDB database/schema, existing vocabulary and review history, CSV/JSON backup, deletion, quizzes, challenges, voice and offline/PWA features remain preserved.
- Added review-session, method-switching, distribution, flashcard, conjugation, dictionary and data-schema regression tests.
- Bumped the service-worker cache to v3.6.6 and precached the new daily-session and flashcard helpers.

## 3.7.0-prep — Phonon migration preparation

- Confirmed the Phonon 40M multilingual model and the four selected catalogue voice IDs.
- Added a reproducible Hugging Face asset downloader for the gated model, voice embeddings, and static audition samples.
- Added model/runtime attribution and non-commercial licence notice.
- Added migration notes documenting the runtime bundling and offline-cache validation gate.
- No application runtime or learning-data code changed in this preparation archive.
