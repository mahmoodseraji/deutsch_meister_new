# V3.6.1 validation checklist

## Automated checks

- [x] CSV/TSV parsing, UTF-8 BOM, German umlauts, quoted commas and escaped quotes.
- [x] `german` is the only required CSV field; all other fields remain optional.
- [x] The exact 17-column import/export schema.
- [x] Independent Leitner and SM-2 scheduling.
- [x] Plural distractors come from transformations of the same singular noun and are skipped when safe options are unavailable.
- [x] Verb practice uses only imported, populated verb forms.
- [x] Five app pages and four bottom navigation items.
- [x] Simplified Library with search, edit, individual deletion, CSV import and batch deletion.
- [x] Practice availability is derived from the user's imported data.
- [x] German voice selector contains only System/Jarvis; English contains only System/Amy.
- [x] Worker code uses ONNX Runtime Web 1.18.0 WASM-only and one thread.
- [x] Mocked Worker downloads, OPFS completion markers, session reuse and language switching.
- [x] Legacy MLS/Thorsten cache cleanup; no Thorsten-to-Jarvis relabelling.
- [x] JavaScript syntax, HTML IDs, service-worker core files, manifest JSON and ZIP integrity.

## Still requires real browser/device validation

- [ ] Desktop Chrome/Firefox: first-launch runtime/model downloads complete and models appear in OPFS.
- [ ] Desktop: actual Jarvis and Amy models synthesize a word and a full sentence.
- [ ] Desktop: repeated utterances reuse the same session and do not cause growing memory use.
- [ ] Desktop: switching languages releases the previous session and plays the new voice.
- [ ] iPhone 16 / iOS 26 Safari: app remains responsive during the sequential background downloads.
- [ ] iPhone: Jarvis plays German words and full sentences with umlauts.
- [ ] iPhone: Amy plays English words and full sentences.
- [ ] iPhone: a neural failure immediately falls back to the system voice.
- [ ] iPhone: reload while offline; vocabulary and progress remain available.
- [ ] iPhone: cold-start offline neural playback after runtime assets have been cached.
- [ ] iPhone: interrupted download recovery and storage quota/eviction behaviour.

The real-model and physical-device items above are not covered by the mocked automated tests. Do not describe this release as iPhone-verified until they pass.

## V3.6.1 additions
- [x] JavaScript syntax checks for app, voice manager and worker.
- [x] Existing automated suite remains green after adding diagnostic stages and model deletion action.
- [ ] On iPhone: select Jarvis/Amy, inspect Neural voice diagnostics and report the last successful stage plus any failure text.
- [ ] On iPhone: delete downloaded voices, confirm System remains selected, reload and confirm models are not downloaded again.
- [ ] On iPhone: tap Download voices again and confirm downloads resume.
- [ ] On iPhone: confirm neural audio playback completes after inference.


## V3.6.2 UI update validation
- Home dashboard is visible before starting review; flashcards are not shown underneath the overview.
- Start review enters focused review mode and hides the dashboard and bottom navigation.
- Show answer performs a 3D card flip.
- Rating a card animates it off-screen before advancing.
- End review returns to the dashboard.
- Buttons and interactive controls have tactile press/hover states; reduced-motion preferences are respected.
- Automated test suite: 45 tests passed. Real-device visual testing is still recommended, especially on iPhone Safari.

## v3.6.6 focused update checks

- [x] New-word limit and daily review goal are separate settings; both default to 10.
- [x] Due learned words precede genuinely new words in the daily queue.
- [x] Previously reviewed words remain learned after switching Leitner/SM-2.
- [x] Daily new-word quota is tracked by introduction date; queued but unseen words do not consume the limit.
- [x] Leitner and SM-2 scheduler regression tests pass without changing algorithm calculations.
- [x] Flashcard markup removes GERMAN/show-answer/Zurück labels and includes POS, article and plural slots.
- [x] Card tap/keyboard/arrow flip handlers and independent sound/dictionary controls are present; ratings remain outside the card.
- [x] Only populated imported conjugation fields are rendered.
- [x] Verbformen links are generated from the German vocabulary; dictionary_url is optional.
- [x] Selected-method Progress distribution and requested summary metrics are tested.
- [x] IndexedDB schema version and existing stores are unchanged.
- [x] Service-worker cache is bumped to v3.6.6 and new helper is precached.
- [ ] Manual test with an existing v3.6.5 IndexedDB profile to confirm all real vocabulary and histories remain present.
- [ ] Manual desktop/iPhone test of card layout, flipping, sound/dictionary interaction, CSV conjugations and offline/PWA launch.

## v3.6.7 regression checks
- [ ] Unrated new words reappear after ending a session or closing/reopening the app.
- [ ] A rated new word is counted once toward the daily new-word allowance.
- [ ] Schedule and review log are committed in one IndexedDB transaction.
- [ ] Each Leitner box and SM-2 stage opens its corresponding word list.
- [ ] Due reviews are never capped by the daily goal; new-word allowance is additional.
- [ ] Review view hides branding/dashboard and uses consistent card dimensions.
- [ ] Tapping anywhere on card flips it; rating and sound controls remain functional.
- [ ] Restored backup retains streak history.
- [ ] Library word opens full details and can be closed.
