import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const app = await readFile(new URL('../js/app.js', import.meta.url), 'utf8');
const sw = await readFile(new URL('../sw.js', import.meta.url), 'utf8');
const db = await readFile(new URL('../js/db.js', import.meta.url), 'utf8');
const flashcard = await readFile(new URL('../js/flashcard.js', import.meta.url), 'utf8');

test('daily new-word limit and daily review goal are separate settings, both defaulting to ten', () => {
  assert.match(app, /dailyGoal:10,newWordsPerDay:10/);
  assert.match(html, /id="dailyGoalSelect"/);
  assert.match(html, /id="newWordsPerDaySelect"/);
});

test('review queue places learned due words before new words and uses new-word introduction logs', () => {
  assert.match(app, /buildDailyStudyQueue/);
  assert.match(app, /type:'new_word'/);
  assert.match(app, /hasLearningHistory\(w,logs\)/);
});

test('flashcard front removes GERMAN label and show-answer text and includes POS, article and plural', () => {
  assert.doesNotMatch(html, />GERMAN</);
  assert.doesNotMatch(html, /Show answer|Zurück/);
  assert.match(html, /id="studyPartOfSpeech"/);
  assert.match(html, /id="studyArticle"/);
  assert.match(html, /id="studyPlural"/);
});

test('flashcard flips by tapping and retains separate sound, dictionary and rating controls', () => {
  assert.match(app, /studyCard'\)\.addEventListener\('click'/);
  assert.match(html, /class="flip-hint"/);
  assert.match(html, /id="studySpeak"/);
  assert.match(html, /id="studyDictionaryLink"/);
  assert.ok(html.indexOf('class="review-rating-panel"') > html.indexOf('class="study-card-scene"'));
});

test('conjugation panel only renders imported values and dictionary is generated from the word', () => {
  assert.match(app, /conjugationRows\(w\)/);
  assert.match(flashcard, /const present =/);
  assert.match(app, /dictionaryHref\(w\.german\)/);
  assert.match(html, /Wörterbuch/);
  assert.doesNotMatch(html, /fieldDictionaryUrl|Dictionary URL/);
});

test('Progress includes requested metrics and one selected-method distribution', () => {
  for (const id of ['progressTotalWords', 'progressMastered', 'progressDue', 'progressReviewedToday', 'methodSnapshot']) assert.match(html, new RegExp(`id="${id}"`));
  assert.match(app, /distributionFor\(active,method,logs\)/);
});

test('IndexedDB schema remains version 2 and existing stores are retained', () => {
  assert.match(db, /indexedDB\.open\(DB_NAME, 2\)/);
  for (const store of ['words', 'settings', 'reviewLogs', 'sessions', 'collections']) assert.match(db, new RegExp(`objectStoreNames\.contains\\('${store}'\\)`));
});

test('service worker cache is bumped and precaches the new study-session module', () => {
  assert.match(sw, /deutsch-meister-v3\.6\.7/);
  assert.match(sw, /study-session\.js/);
  assert.match(sw, /flashcard\.js/);
});

test('v3.6.7 review mode removes the flip arrow and provides fixed full-screen card layout', () => {
  assert.match(html, /class="flip-hint"/);
  assert.doesNotMatch(html, /id="flipArrow"/);
  assert.match(html, /id="wordDetailModal"/);
  assert.match(html, /id="distributionModal"/);
});

test('v3.6.7 explains daily goal as a target and new words as additional to due reviews', () => {
  assert.match(html, /Progress target, not a review limit/);
  assert.match(html, /Added on top of all words due for review/);
});
