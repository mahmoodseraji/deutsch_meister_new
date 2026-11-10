# Deutsch Meister 3.6.7

Deutsch Meister is a small, offline-first German vocabulary PWA. It contains **no bundled vocabulary**: learners add words manually or import their own CSV/TSV files.

## Scheduling algorithms (V3.6.7)

The two methods keep independent schedules for every word. Changing the selected method does not overwrite the other method's history.

- **Leitner (five boxes):** Box intervals are 1, 2, 4, 7 and 14 days. The review screen offers two outcomes: Forgot returns the word to Box 1; Remembered advances it one box. The active box is shown on the review card. Movement is capped at Box 5.
- **Classic SM-2:** Again=quality 1 (reset repetitions and review after 1 day); Hard=3; Good=4; Easy=5. Successful repetitions use intervals of 1 day, then 6 days, then the previous interval multiplied by the updated ease factor. The standard ease-factor equation is applied with a minimum of 1.3.
- Review buttons display the calculated next interval for the selected method and current word. Leitner offers two clear outcomes (Forgot / Remembered); SM-2 offers four quality ratings (Again / Hard / Good / Easy).
- Rating controls stay visible below the flashcard, so a learner who already knows a word can rate it without revealing the answer.
- Due dates use local calendar dates, avoiding UTC date shifts around midnight and daylight-saving transitions.

## What v3.6.6 changes

This is a focused improvement to v3.6.5. It keeps the existing navigation, design language, IndexedDB database and stores, vocabulary, review history, CSV/JSON data tools, challenges, quizzes, voice settings, offline support and PWA installation.

- **Daily learning:** the daily new-word limit (default 10) is independent of the daily review goal (default 10). Learned words due under the selected algorithm are queued first; up to the new-word limit follows. A word reviewed under either method is never reclassified as genuinely new when the learner switches algorithms. New words are marked as introduced when they are first shown, not merely when a session is opened.
- **Flashcards:** the front shows part of speech, article when present, the German word and plural when provided. The back shows English meaning, German example, English example translation, populated imported verb forms and a generated Verbformen dictionary link.
- **Card flipping:** tap anywhere on the card or use the small curved arrow. The 3D flip remains animated; sound and dictionary controls work independently. Rating controls remain outside the card and visible on either side.
- **Dictionary:** links are generated from the German vocabulary word and open Verbformen. `dictionary_url` is not required for imports; the legacy CSV column remains optional for backward compatibility.
- **Progress:** the selected method alone is shown. Leitner displays counts in Boxes 1–5; SM-2 displays New (no SM-2 reviews), Learning (0–1 successful repetitions), Developing (2–3) and Established (4+), using repetition history rather than the most recent rating. Total vocabulary, mastered words, due reviews and words reviewed today are shown.
- **Algorithms:** Leitner and SM-2 calculations, independent schedules, rating meanings and due-date ownership remain unchanged.

The existing 17-column CSV export format is retained for compatibility. JSON backup/restore and IndexedDB schema version 2 are retained.

## Voice sources and licensing

- German: [Jarvis German Medium on PiperHub](https://piperhub.org/model/jarvis-german-de-medium/) — [ufozone model repository](https://huggingface.co/ufozone/piper-de_DE-jarvis-medium). License: **CC BY-NC-SA 4.0**; it is not permitted for commercial use.
- English: [Amy English Medium on PiperHub](https://piperhub.org/model/amy-english-en-medium/) — runtime model source: [rhasspy/piper-voices Amy Medium model](https://huggingface.co/rhasspy/piper-voices/tree/v1.0.0/en/en_US/amy/medium). Its model card points to the MycroftAI Mimic 3 voice dataset; see the dataset's [CC BY-SA 4.0 licence](https://github.com/MycroftAI/mimic3-voices/blob/master/LICENSE).

The ONNX model files are approximately 63 MB each (about 126 MB total), excluding small configuration files. The models are downloaded from their source repositories; they are not bundled in this repository. Attribution and licence notes are also shown in Settings. See [VOICE-SOURCES.md](VOICE-SOURCES.md).

## Run locally

Serve this folder from `localhost` or HTTPS. Do not open `index.html` as a `file://` URL; IndexedDB, service workers and OPFS require a secure context.

```bash
python -m http.server 8000
```

Open `http://localhost:8000`.

## Offline behaviour

- Vocabulary, scheduling data and review history are stored locally in IndexedDB.
- The app shell is cached by the service worker.
- Voice models are stored in OPFS. ONNX Runtime and phonemizer assets are cached by the service worker after first-launch setup.
- Browser storage can be cleared or evicted. Export a JSON backup periodically.
- A cold-start offline neural playback test still requires a real browser/device. System voices remain the fallback.

## Automated checks

Run with Node.js 20+:

```bash
node --experimental-default-type=module --test tests/*.test.mjs
```

The suite covers CSV/TSV schema, user-supplied vocabulary, challenge generation, Leitner box transitions, classic SM-2 calculations, method isolation, due-date boundaries, voice configuration, mocked worker downloads/inference, and simplified navigation. Automated tests are not a substitute for testing the downloaded ONNX files in real Safari.

**Device status:** This release has not been physically tested on an iPhone 16 / iOS 26. It must not be described as iPhone-verified until that test is completed.

## Daily learning and review behavior (V3.6.7)

Each session contains all words due under the selected scheduling method, followed by up to the configured number of new words. The daily review goal is a progress target, not a hard cap. New words count toward the daily new-word allowance only after the learner submits a rating; opening a card and leaving the session does not consume the allowance. The word schedule and its review log are committed in one IndexedDB transaction.

Progress distribution groups can be opened to inspect their words. Library entries open a detail dialog with all available vocabulary information. Restoring a JSON backup merges its review history and preserves the earliest valid learning-history start date so historical streak days remain eligible.
