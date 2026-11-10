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
  './vendor/phonon-tts/index.js', './vendor/phonon-tts/worker.js',
  './vendor/phonon-tts/fetch.js', './vendor/phonon-tts/hub.js',
  './vendor/phonon-tts/wav.js', './vendor/phonon-tts/threads.js',
  './vendor/phonon-tts/device.js', './vendor/phonon-tts/simd.js',
  './vendor/phonon-tts/wasm/phonon_tts.js',
  './vendor/phonon-tts/wasm/phonon_tts_simd_bg.wasm',
  './vendor/phonon-tts/wasm-threads/phonon_tts.js',
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
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(CORE)).then(() => self.skipWaiting()));
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

  // Phonon fetches its model/voice files itself and stores their complete responses
  // in phonon-tts-v1. The service worker serves local model files from the app shell
  // cache so the first download works offline after the shell is installed.
  if (PHONON_MODEL_FILES.some(path => new URL(path, self.registration.scope).href === url.href)) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const cached = await cache.match(event.request);
      if (cached) return cached;
      try {
        const response = await fetch(event.request);
        if (response.ok) await cache.put(event.request, response.clone());
        return response;
      } catch {
        return new Response('Phonon model asset is unavailable offline.', { status: 503 });
      }
    })());
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
