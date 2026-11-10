# Voice sources, attribution and runtime

Deutsch Meister offers independent voice selection for German and English. Each catalogue voice has a short static audition recording in Settings.

| Voice | Language / voice description | Catalogue ID |
|---|---|---|
| Nele | German · female | `2A2fFf8SkDEJ8nzx` |
| Anton | German · male | `3ZKKapPOvuWFcw9f` |
| Zoey | US English · female | `NbpkqMVS3CJeq2j8` |
| Easton | US English · male | `LMDIYE0Oa377Qh6Z` |

## Model and voice catalogue

- Shared checkpoint: [Phonon 40M multilingual](https://huggingface.co/gradium/phonon-40m-multilingual).
- Model licence: **CC BY-NC 4.0**. This is non-commercial; do not use the model commercially without permission from Gradium.
- Voice embeddings and preview recordings: [Gradium Phonon voice catalogue](https://huggingface.co/gradium/phonon-voices).
- The shared q8 GGUF model is about 74.6 MB. Each selected voice embedding is loaded separately.
- Preview recordings are static OGG files. They do not require downloading the model.

## Browser runtime

- Package: `phonon-tts` 0.4.2 from [gradium-ai/xn-ptts](https://github.com/gradium-ai/xn-ptts/tree/v0.4.2/ptts-wasm/js).
- Runtime licence: MIT OR Apache-2.0. Preserve the vendored `LICENSE-MIT`, `LICENSE-APACHE` and `THIRD_PARTY_LICENSES.md` files.
- The app uses the package's dedicated Web Worker, WebAssembly SIMD build and CPU inference. Threads are set to one for broad compatibility, including iOS browsers.
- The runtime is copied locally with `npm install` and `npm run vendor:phonon`, then precached by the service worker.
- Model and selected voice bytes are persisted by the runtime in Cache Storage under `phonon-tts-v1`. The Delete downloaded voices action removes those model and embedding entries without clearing vocabulary or review data.
- System speech remains the default and fallback.

## Compatibility and validation

The source-level tests do not prove real speech quality or real browser performance. A fresh install, voice switching, offline startup, cache deletion, and actual playback must be checked in desktop browsers and on iPhone Safari / iOS 26. No iPhone 16 / iOS 26 test is claimed until physically performed.
