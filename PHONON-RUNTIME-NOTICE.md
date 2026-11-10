# Phonon browser runtime notice

Deutsch Meister vendors the browser package `phonon-tts` version 0.4.2 from Gradium's xn-ptts project.

- Source: https://github.com/gradium-ai/xn-ptts/tree/v0.4.2/ptts-wasm/js
- Runtime licence: MIT OR Apache-2.0. The package's `LICENSE-MIT`, `LICENSE-APACHE`, and `THIRD_PARTY_LICENSES.md` files are retained in `vendor/phonon-tts`.
- The Phonon 40M multilingual model is a separate asset under CC BY-NC 4.0. See `PHONON-LICENSE-NOTICE.md`.
- Voice embeddings and static preview recordings are separate catalogue assets; see that notice and the catalogue source linked in Settings.

Run `npm install` followed by `npm run vendor:phonon` to copy the pinned runtime package, including its WebAssembly modules, into the static application. Do not remove the licence files when updating the vendored runtime.
