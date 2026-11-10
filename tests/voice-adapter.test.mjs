import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const manager = await readFile(new URL('../js/voice-manager.js', import.meta.url), 'utf8');
const worker = await readFile(new URL('../js/voice-worker.js', import.meta.url), 'utf8');
const app = await readFile(new URL('../js/app.js', import.meta.url), 'utf8');
const sw = await readFile(new URL('../sw.js', import.meta.url), 'utf8');

 test('neural inference runs in a reusable classic worker, not on the UI thread', () => {
  assert.match(manager, /new Worker\(new URL\('\.\/voice-worker\.js', import\.meta\.url\)\)/);
  assert.match(manager, /speechWorker\.terminate\(\)/);
  assert.match(manager, /speechLanguage !== language/);
  assert.match(worker, /self\.addEventListener\('message'/);
  assert.match(worker, /workerQueue = workerQueue\.then/);
  assert.match(app, /speechSynthesis\.speak\(utterance\)/);
});

test('uses a CPU-only non-JSEP ONNX Runtime build and a single WASM thread', () => {
  assert.match(worker, /cdnjs\.cloudflare\.com\/ajax\/libs\/onnxruntime-web\/1\.18\.0\//);
  assert.match(worker, /ort\.wasm\.min\.js/);
  assert.match(worker, /executionProviders: \['wasm'\]/);
  assert.match(worker, /env\.wasm\.numThreads = 1/);
  assert.doesNotMatch(worker, /@mintplex-labs\/piper-tts-web|@jtsage\/piper-tts-web|TtsSession|\.jsep\.wasm/i);
  assert.match(sw, /ort\.wasm\.min\.js/);
  assert.match(sw, /ort-wasm-simd\.wasm/);
});

test('uses only Jarvis German and Amy English medium models', () => {
  assert.match(manager, /jarvis: 'de_DE-jarvis-medium'/);
  assert.match(manager, /amy: 'en_US-amy-medium'/);
  assert.match(worker, /ufozone\/piper-de_DE-jarvis-medium/);
  assert.match(worker, /rhasspy\/piper-voices\/resolve\/v1\.0\.0\/en\/en_US\/amy\/medium/);
  assert.doesNotMatch(app + manager, /de_DE-mls-medium|de_DE-kerstin|de_DE-thorsten-high/);
  assert.match(worker, /cleanupLegacyVoiceCache/); // old MLS is deleted, never selectable or migrated
});

test('prepares offline runtime assets before downloading the two voices', () => {
  assert.match(manager, /client\.request\('runtime'/);
  assert.match(manager, /for \(const voice of \['jarvis', 'amy'\]\)/);
  assert.match(worker, /await prepareRuntimeAssets/);
  assert.match(worker, /await fetchIntoOPFS\(model\.modelUrl, model\.modelFile/);
  assert.match(worker, /await fetchIntoOPFS\(model\.configUrl, model\.configFile/);
  assert.match(worker, /MODEL_CACHE_VERSION = 3/);
  assert.match(worker, /marker\.modelBytes !== modelFile\.size/);
  assert.match(worker, /isValidVoiceConfig/);
  assert.match(worker, /cache\.match\(url\)/);
});

test('keeps runtime assets in a version-independent cache for offline speech', () => {
  assert.match(sw, /RUNTIME_CACHE = 'deutsch-meister-voice-runtime-v1'/);
  assert.match(sw, /caches\.open\(RUNTIME_CACHE\)/);
  assert.match(sw, /url\.pathname\.includes\('\/runtime\/'\)/);
  assert.match(sw, /cache\.put\(event\.request, response\.clone\(\)\)/);
  assert.match(worker, /new URL\(`\.\.\/runtime\/\$\{fileName\}`/);
});

test('reuses one phonemizer module and one ONNX session for repeated speech', () => {
  assert.match(worker, /let phonemizerPromise = null/);
  assert.match(worker, /if \(!phonemizerPromise\)/);
  assert.match(worker, /module\.callMain\(/);
  assert.match(worker, /let sessionPromise = null/);
  assert.match(worker, /if \(activeVoice === key && sessionPromise\) return sessionPromise/);
  assert.match(worker, /await previous\.session\.release\?\.\(\)/);
});

test('retains system speech as a fallback and resets a failed neural selection', () => {
  assert.match(manager, /decodeAudioData/);
  assert.match(manager, /action === 'speak' \? 45000/);
  assert.match(manager, /Neural speech timed out/);
  assert.match(app, /speechSynthesis\.speak\(utterance\)/);
  assert.match(app, /settings\.germanVoiceMode='system'/);
  assert.match(app, /settings\.englishVoiceMode='system'/);
});

test('cleans legacy voice cache without relabelling Thorsten as Jarvis', () => {
  assert.doesNotMatch(worker, /migratePreviouslyDownloadedModels/);
  assert.match(worker, /de_DE-thorsten-medium\.onnx/);
  assert.match(worker, /en_US-amy-medium\.onnx/);
  assert.match(worker, /de_DE-mls-medium\.onnx/);
});

test('first-launch voice setup waits until the service worker controls the page', () => {
  assert.match(app, /navigator\.serviceWorker\.addEventListener\('controllerchange',startWhenControlled\)/);
  assert.match(app, /if\(!navigator\.serviceWorker\.controller\|\|offlineWorkerRegistered\)return/);
  assert.doesNotMatch(app, /setTimeout\(startVoiceModelSetup,1200\)/);
});

test('cached runtime assets are checked without draining them again for every startup', () => {
  assert.match(worker, /self\.caches\.open\(RUNTIME_CACHE\)/);
  assert.match(worker, /cache\.match\(url\)/);
  const runtimeStart = worker.indexOf('async function getRuntime()');
  const runtimeEnd = worker.indexOf('async function getPhonemizer()', runtimeStart);
  assert.doesNotMatch(worker.slice(runtimeStart, runtimeEnd), /prepareRuntimeAssets/);
});
