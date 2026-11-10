const CACHE = 'deutsch-meister-v3.7.0';
const RUNTIME_CACHE = 'phonon-tts-v1';
const PREFIX = 'deutsch-meister-';
const CORE = [
  './', './index.html', './manifest.json',
  './css/tokens.css', './css/app.css',
  './js/app.js', './js/csv.js', './js/db.js',
  './js/scheduler.js', './js/study-session.js', './js/flashcard.js', './js/challenges.js', './js/voice-manager.js',
  './assets/icon-192.png', './assets/icon-512.png',
  './assets/voice-samples/nele.ogg', './assets/voice-samples/anton.ogg',
  './assets/voice-samples/zoey.ogg', './assets/voice-samples/easton.ogg',
];
];
const OPTIONAL_RUNTIME = [
  './vendor/phonon-tts/index.js', './vendor/phonon-tts/worker.js',
  './vendor/phonon-tts/fetch.js', './vendor/phonon-tts/hub.js',
  './vendor/phonon-tts/wav.js', './vendor/phonon-tts/threads.js',
  './vendor/phonon-tts/device.js', './vendor/phonon-tts/simd.js',
  './vendor/phonon-tts/wasm/phonon_tts.js',
  './vendor/phonon-tts/wasm/phonon_tts_bg.wasm',
  './vendor/phonon-tts/wasm/phonon_tts_simd_bg.wasm',
  './vendor/phonon-tts/wasm-threads/phonon_tts.js',
  './vendor/phonon-tts/wasm-threads/phonon_tts_bg.wasm',
  './vendor/phonon-tts/wasm-threads/phonon_tts_simd_bg.wasm',
  './vendor/phonon-tts/LICENSE-MIT', './vendor/phonon-tts/LICENSE-APACHE',
  './vendor/phonon-tts/THIRD_PARTY_LICENSES.md'
];
const PHONON_MODEL_FILES = [
  './models/phonon/model.q8.gguf',
  './models/phonon/tokenizer.json',
  './models/phonon/config.json',
  './models/phonon/voices/nele.safetensors',
  './models/phonon/voices/anton.safetensors',
  './models/phonon/voices/zoey.safetensors',
  './models/phonon/voices/easton.safetensors'
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(CORE);
    const runtimeResults = await Promise.allSettled(OPTIONAL_RUNTIME.map(path => cache.add(path)));
    const missing = runtimeResults.filter(result => result.status === 'rejected').length;
    if (missing) console.warn(`Phonon runtime is not fully precached (${missing} files). Run npm install && npm run vendor:phonon, then redeploy.`);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(key => key.startsWith(PREFIX) && key !== CACHE).map(key => caches.delete(key))
  )).then(() => self.clients.claim()));
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  // Let phonon-tts own model and embedding cache entries. If the service worker
  // copied these large files into its shell cache too, the app's Delete voices
  // action could not actually release that storage.
  if (url.pathname.includes('/models/phonon/')) {
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(caches.open(CACHE).then(async cache => {
    const cached = await cache.match(event.request, { ignoreSearch: event.request.mode === 'navigate' });
    if (cached) return cached;
    try {
      const response = await fetch(event.request);
      if (response.ok) await cache.put(event.request, response.clone());
      return response;
    } catch {
      if (event.request.mode === 'navigate') return cache.match('./index.html');
      return new Response('This file is not available offline.', { status: 504, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    }
  }));
});
