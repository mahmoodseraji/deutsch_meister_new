import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');

test('German offers only System voice and Jarvis', () => {
  const select = html.match(/<select id="germanSpeechVoice"[\s\S]*?<\/select>/)?.[0] || '';
  assert.match(select, /value="system"/);
  assert.match(select, /value="jarvis"/);
  assert.equal((select.match(/<option\b/g) || []).length, 2);
});

test('English offers only System voice and Amy', () => {
  const select = html.match(/<select id="englishSpeechVoice"[\s\S]*?<\/select>/)?.[0] || '';
  assert.match(select, /value="system"/);
  assert.match(select, /value="amy"/);
  assert.equal((select.match(/<option\b/g) || []).length, 2);
});

test('removes the old multi-voice catalogue and manual download controls', () => {
  assert.doesNotMatch(html, /piperVoiceList|piperGermanSelect|piperEnglishSelect|data-piper-download|MLS/i);
  assert.match(html, /voiceDownloadStatus/);
});
