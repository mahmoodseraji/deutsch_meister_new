import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const manager=await readFile(new URL('../js/voice-manager.js',import.meta.url),'utf8');
const packageJson=JSON.parse(await readFile(new URL('../package.json',import.meta.url),'utf8'));
const vendorScript=await readFile(new URL('../scripts/vendor-phonon.mjs',import.meta.url),'utf8');
test('pins the official browser runtime and includes a reproducible vendoring command',()=>{
 assert.equal(packageJson.dependencies['phonon-tts'],'0.4.2');
 assert.equal(packageJson.scripts['vendor:phonon'],'node scripts/vendor-phonon.mjs');
 assert.match(vendorScript,/pkg\.version !== '0\.4\.2'/);
 assert.match(vendorScript,/vendor',?\s*'phonon-tts'/);
});
test('keeps model weights shared and voice embeddings separate',()=>{
 assert.match(manager,/modelReady/);
 assert.match(manager,/VOICE_URLS/);
 assert.match(manager,/voices:\s*VOICE_URLS/);
 assert.match(manager,/voices:\s*\[voice\.name\]/);
});
test('does not auto-download on startup',()=>{
 assert.doesNotMatch(manager,/export async function prepareVoiceModels/);
 assert.match(manager,/export async function downloadNeuralVoice/);
});
