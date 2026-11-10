# Deutsch Meister 3.7.0 — Phonon migration preparation

This preparation branch is based on the complete V3.6.7 source archive. No vocabulary, IndexedDB, review history, Leitner, SM-2, CSV, or progress code has been modified in this preparation step.

## Confirmed design

- One shared Phonon 40M multilingual model for German and English.
- Four independent voice choices: Nele, Anton, Zoey, Easton.
- Four small static OGG audition recordings; preview does not require downloading the model.
- System speech remains the fallback.
- Download only after the learner chooses an on-device voice; shared model weights are downloaded once, while selected voice embeddings are small separate assets.
- Downloaded model and voice data must be removable without touching vocabulary or learning progress.
- Offline operation is required after successful model installation.

## Model access and asset preparation

The 40M multilingual checkpoint is gated on Hugging Face. Before downloading, sign in and accept the model terms at:

https://huggingface.co/gradium/phonon-40m-multilingual

Create a Hugging Face read token and run the asset preparation script from the project root:

```powershell
$env:HF_TOKEN="hf_your_read_token"
node scripts/download-phonon-assets.mjs
```

The script downloads the model files, the four speaker embeddings, and the four static audition samples into their intended project folders. It does not store the token.

## Important runtime integration gate

The official browser package is `phonon-tts` 0.4.2. The browser guide documents `PhononTTS.load({ lang, model })`, `synthWav(text)`, `stream(text)`, and `dispose()`. The 40M gated model cannot be fetched directly from Hugging Face by the browser; it must be served by the app itself. The runtime package must also be vendored/bundled locally before claiming first-install offline capability.

This prep archive intentionally does not pretend the runtime is already migrated. The next implementation step is to vendor and test the exact npm runtime build, wire its model specification and voice embeddings, implement safe model-cache deletion, and then replace the Piper worker. Do not deploy this preparation archive as a completed 3.7.0 release.

## GitHub hosting note

The quantized checkpoint is approximately 74.6 MB, below GitHub's 100 MB per-file hard limit, but it substantially increases repository history. For a cleaner repository, consider GitHub Release assets or Git LFS for source storage. Git LFS pointers must not be assumed to work as ordinary GitHub Pages model URLs; verify the actual served file URL before deployment.
