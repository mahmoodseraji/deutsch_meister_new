import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const app = await readFile(new URL('../js/app.js', import.meta.url), 'utf8');

test('the simplified app has five main pages and four bottom navigation items', () => {
  assert.equal((html.match(/class="view(?: active)?"/g) || []).length, 5);
  assert.equal((html.match(/class="nav-item/g) || []).length, 4);
});

test('the interface has no CEFR or collection navigation', () => {
  assert.doesNotMatch(html, /CEFR|A1|A2|B1|B2|Collections|collection/i);
});

test('the library uses bounded rendering and retains individual and batch deletion', () => {
  assert.match(app, /libraryLimit=100/);
  assert.match(app, /slice\(0,libraryLimit\)/);
  assert.match(html, /id="loadMoreWords"/);
  assert.match(app, /data-delete-import-batch/);
  assert.match(app, /data-delete=/);
});

test('CSV import remains in the Library and imported batches remain in Settings', () => {
  assert.match(html, /id="importCsvOpen"/);
  assert.match(html, /id="importCsv"/);
  assert.match(html, /id="importBatchList"/);
});

test('practice visibility depends on available imported data', () => {
  assert.match(app, /function renderPracticeAvailability\(\)/);
  assert.match(app, /import \{[^}]*inferPartOfSpeech[^}]*\} from '\.\/challenges\.js'/);
  assert.match(app, /new Set\(words\.filter\(w=>String\(w\.translation/);
  assert.match(app, /pluralOptions\(w,words\)\.length>=3/);
  assert.match(app, /buildVerbQuestions\(buildVerbBank\(words\)\)/);
});

test('the redesigned pages remove redundant home shortcuts and library filters', () => {
  assert.doesNotMatch(html, /home-links|categoryFilter|favoritesOnly/);
  assert.match(html, /id="wordSearch"/);
  assert.match(html, /id="addWordOpen"/);
  assert.match(html, /id="importCsvOpen"/);
  assert.match(html, /id="progressDue"/);
});

test('V3.6.1 exposes neural voice diagnostics and safe model deletion controls', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const app = await readFile(new URL('../js/app.js', import.meta.url), 'utf8');
  const worker = await readFile(new URL('../js/voice-worker.js', import.meta.url), 'utf8');
  assert.match(html, /id="voiceDiagnosticStatus"/);
  assert.match(html, /id="voiceDiagnosticLog"/);
  assert.match(html, /id="deleteVoiceModels"/);
  assert.match(html, /id="downloadVoiceModels"/);
  assert.match(app, /voiceModelsDisabled/);
  assert.match(app, /deleteNeuralVoice/);
  assert.match(worker, /action === 'delete'/);
  assert.match(worker, /reportStage\('Generating speech with ONNX'\)/);
});

test('V3.6.2 keeps the home dashboard separate from a full-screen flip-card review', () => {
  assert.match(html, /id="studyCardInner"/);
  assert.match(html, /class="study-card-face study-card-front"/);
  assert.match(html, /class="study-card-face study-card-back"/);
  assert.match(html, /id="endReview"/);
  assert.match(app, /classList\.toggle\('reviewing',hasCurrent\)/);
  assert.match(app, /classList\.add\('is-flipped'\)/);
  assert.match(app, /card-swipe-out/);
});

test('V3.6.2 includes tactile interaction states and respects reduced-motion preferences', async () => {
  const css = await readFile(new URL('../css/app.css', import.meta.url), 'utf8');
  assert.match(css, /rotateY\(180deg\)/);
  assert.match(css, /cardSwipeLeft/);
  assert.match(css, /cardSwipeRight/);
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(css, /reviewing-session \.bottom-nav/);
});


test('review ratings are outside the flip-card and available before revealing the answer', () => {
  const sceneEnd = html.indexOf('</div>', html.indexOf('<div class="study-card-scene">'));
  const panel = html.indexOf('class="review-rating-panel"');
  assert.ok(panel > html.indexOf('class="study-card-scene"'));
  assert.ok(panel > html.indexOf('</div>\n        </div>', html.indexOf('<div class="study-card-scene">')));
  assert.match(html, /id="ratingPrompt"/);
  assert.match(html, /id="ratingHelp"/);
});

test('review rating labels and descriptions are selected from the active algorithm', () => {
  assert.match(app, /ratingButtonInfo\(w,rating,method\)/);
  assert.match(app, /Did you remember this word\\?/);
  assert.match(app, /How well did you remember\?/);
});


test('Leitner review presents two outcomes while SM-2 presents four ratings', () => {
  assert.match(app, /button\.hidden=method==='leitner' && !\['again','good'\]\.includes\(rating\)/);
  assert.match(app, /leitner-rating-grid/);
  assert.match(html, /data-rating="again"/);
  assert.match(html, /data-rating="good"/);
  assert.match(html, /data-rating="hard"/);
  assert.match(html, /data-rating="easy"/);
});
