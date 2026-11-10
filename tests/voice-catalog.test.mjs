import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
test('German selector has system, Nele and Anton',()=>{
 const select=html.match(/<select id="germanSpeechVoice"[\s\S]*?<\/select>/)?.[0]||'';
 for(const value of ['system','nele','anton'])assert.match(select,new RegExp('value="'+value+'"'));
 assert.equal((select.match(/<option\b/g)||[]).length,3);
});
test('English selector has system, Zoey and Easton',()=>{
 const select=html.match(/<select id="englishSpeechVoice"[\s\S]*?<\/select>/)?.[0]||'';
 for(const value of ['system','zoey','easton'])assert.match(select,new RegExp('value="'+value+'"'));
 assert.equal((select.match(/<option\b/g)||[]).length,3);
});
test('provides four static sample players and explicit selected-voice download',()=>{
 for(const id of ['nele','anton','zoey','easton'])assert.match(html,new RegExp('assets/voice-samples/'+id+'\\.ogg'));
 assert.match(html,/downloadVoiceModels/);
 assert.match(html,/deleteVoiceModels/);
 assert.doesNotMatch(html,/Jarvis|Amy|Piper/i);
});
