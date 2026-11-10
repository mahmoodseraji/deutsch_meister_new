# Deutsch Meister 3.7.0 validation checklist

## Source and automated checks

- [x] Replace Piper voice coordinator with Phonon adapter.
- [x] Four static voice samples: Nele, Anton, Zoey, Easton.
- [x] Independent German and English voice preferences.
- [x] Manual selected-voice downloads; no automatic model download on startup.
- [x] One shared multilingual model; only selected speaker embeddings are preloaded.
- [x] System speech remains default and fallback.
- [x] Delete Phonon model and voice cache entries without clearing IndexedDB.
- [x] Bump service-worker cache to 3.7.0 and list local runtime/sample assets.
- [x] Add pinned runtime vendoring script and Phonon licence notice.
- [x] Remove old Piper worker, core helper and its test.
- [x] Update source-level tests and add a GitHub Actions workflow.

## Required build and CI checks

- [x] Run `npm install` in GitHub Actions.
- [x] Run `npm run vendor:phonon`; verify `vendor/phonon-tts` contains worker, JS, WASM and licence files.
- [x] Run `node --check js/app.js`, `node --check js/voice-manager.js`, `node --check sw.js`.
- [x] Run `npm test` and confirm all tests pass.
- [x] Confirm GitHub Actions workflow is green.
- [x] Commit generated `vendor/phonon-tts` directory to the migration branch.

## Manual browser/device validation

- [ ] Preview all four samples before selecting.
- [ ] Select Nele and Anton independently; test German pronunciation.
- [ ] Select Zoey and Easton independently; test English pronunciation.
- [ ] Confirm first voice download fetches shared model and only that voice embedding.
- [ ] Confirm adding a second voice does not download the model again.
- [ ] Confirm playback after reload and in airplane mode once installed.
- [ ] Confirm system voice still works if Phonon is unavailable or fails.
- [ ] Delete downloaded Phonon files; confirm system remains selected and app vocabulary/progress are unchanged.
- [ ] Confirm a later selected-voice download reinstalls the model and embedding.
- [ ] Test on desktop Chrome/Firefox and iPhone Safari / iOS 26.

**Status:** the source changes are committed to the migration branch. Vendoring, automated test execution and real-device audio validation remain outstanding. Do not claim iPhone compatibility until physically tested.
