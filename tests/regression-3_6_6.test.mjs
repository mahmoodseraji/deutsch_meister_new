import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const app = await readFile(new URL('../js/app.js', import.meta.url), 'utf8');
const db = await readFile(new URL('../js/db.js', import.meta.url), 'utf8');
const sw = await readFile(new URL('../sw.js', import.meta.url), 'utf8');
const css = await readFile(new URL('../css/app.css', import.meta.url), 'utf8');

test('db writes resolve on transaction commit so quota/commit failures are not swallowed', () => {
  assert.match(db, /tx\.oncomplete = \(\) => resolve\(/);
  assert.match(db, /tx\.onabort = fail/);
  assert.match(db, /export function putMany/);
  assert.match(db, /onversionchange/);
});

test('settings are whitelisted before use, so a bad backup cannot brick startup', () => {
  assert.match(app, /function sanitizeSettings/);
  assert.match(app, /ALGORITHMS\.includes\(r\.algorithm\)/);
  assert.match(app, /\.\.\.SETTING_DEFAULTS,\.\.\.sanitizeSettings\(settings\)/);
});

test('restore validates the file and normalises schedules in one atomic write', () => {
  assert.match(app, /not valid JSON/);
  assert.match(app, /putMany\('words',prepared\)/);
  assert.match(app, /earliest valid history start/);
  assert.match(app, /existingStart<backupStart\?existingStart:backupStart/);
});

test('rateWord captures the word, handles failure, and does not reload all logs per card', () => {
  const body = app.slice(app.indexOf('async function rateWord'), app.indexOf('function renderLibrary'));
  assert.match(body, /const wordId=currentWord\.id/);
  assert.match(body, /catch\(error\)/);
  assert.match(body, /remove\('card-swipe-out','swipe-left','swipe-right'\)/);
  assert.doesNotMatch(body, /logs=await all\('reviewLogs'\)/);
});

test('swipe classes are reset for each card and the swipe animation is not overridden', () => {
  assert.match(app, /remove\('is-flipped','card-swipe-out','swipe-left','swipe-right'\)/);
  assert.match(css, /#studyCard\.swipe-left \.study-card-scene/);
});

test('service worker cache is versioned 3.6.7 and navigation ignores query strings', () => {
  assert.match(sw, /deutsch-meister-v3\.6\.7/);
  assert.match(sw, /ignoreSearch/);
});

test('an unrated new word is not consumed merely by opening the card', () => {
  const show = app.slice(app.indexOf('function showStudyWord'), app.indexOf('async function rateWord'));
  assert.doesNotMatch(show, /type:'new_word'/);
  const rate = app.slice(app.indexOf('async function rateWord'), app.indexOf('function renderLibrary'));
  assert.match(rate, /wasNew=!hasLearningHistory\(fresh,logs\)/);
  assert.match(rate, /putReviewResult\(updated,entries\)/);
});

test('review writes schedule and logs in one IndexedDB transaction', () => {
  assert.match(db, /transaction\(\['words', 'reviewLogs'\], 'readwrite'\)/);
  assert.match(db, /export function putReviewResult/);
});

test('progress distribution groups and library entries are drill-down controls', () => {
  assert.match(app, /data-distribution-index/);
  assert.match(app, /openDistributionGroup/);
  assert.match(app, /openWordDetail/);
  assert.match(app, /data-open-word/);
});
