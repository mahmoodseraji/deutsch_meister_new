import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const manager=await readFile(new URL('../js/voice-manager.js',import.meta.url),'utf8');
const app=await readFile(new URL('../js/app.js',import.meta.url),'utf8');
const sw=await readFile(new URL('../sw.js',import.meta.url),'utf8');
test('uses the pinned local Phonon browser runtime and multilingual checkpoint',()=>{
 assert.match(manager,/import\('\.\.\/vendor\/phonon-tts\/index\.js'\)/);
 assert.match(manager,/model\.q8\.gguf/);
 assert.match(manager,/tokenizer\.json/);
 assert.match(manager,/config\.json/);
 assert.match(manager,/quant:\s*'q8'/);
 assert.match(manager,/lang:\s*voice\.language/);
 assert.doesNotMatch(manager,/piper|onnxruntime|phonemiz/i);
});
test('supports four named voices and independent language selection',()=>{
 for(const id of ['nele','anton','zoey','easton'])assert.match(manager,new RegExp('\\b'+id+'\\b'));
 assert.match(app,/\['system','nele','anton'\]/);
 assert.match(app,/\['system','zoey','easton'\]/);
});
test('downloads only selected voices, retains system fallback, and removes Phonon cache',()=>{
 assert.match(app,/downloadNeuralVoice\(id/);
 assert.match(app,/System voice remains available/);
 assert.match(manager,/cache\.delete\(url\)/);
 assert.match(manager,/deleteAllNeuralVoices/);
 assert.match(manager,/CACHE_NAME = 'phonon-tts-v1'/);
});
test('uses the official API and Web Audio playback',()=>{
 assert.match(manager,/PhononTTS\.load/);
 assert.match(manager,/tts\.synthWav/);
 assert.match(manager,/tts\.dispose\(\)/);
 assert.match(manager,/decodeAudioData/);
});
test('service worker precaches the vendored runtime and four static samples',()=>{
 for(const file of ['index.js','worker.js','phonon_tts_simd_bg.wasm','nele.ogg','anton.ogg','zoey.ogg','easton.ogg'])assert.ok(sw.includes(file),file);
 assert.match(sw,/deutsch-meister-v3\.7\.0/);
});
