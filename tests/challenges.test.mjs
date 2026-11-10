import test from 'node:test';
import assert from 'node:assert/strict';
import { pluralOptions, buildVerbBank, buildVerbQuestions, formatPlural, getArticle, inferPartOfSpeech } from '../js/challenges.js';

test('plural distractors are transformations of the same singular stem', () => {
  const word = { german: 'das Buch', article: 'das', plural: 'die Bücher' };
  const options = pluralOptions(word);
  assert.equal(options.length, 4);
  assert.equal(options.filter(option => option === 'die Bücher').length, 1);
  assert.ok(options.every(option => /^die B(ü|u)ch/.test(option)));
});

test('plural challenge skips words when three plausible distinct distractors are unavailable', () => {
  const word = { german: 'die Blume', article: 'die', plural: 'die Blumen' };
  assert.deepEqual(pluralOptions(word), []);
});

test('plural options never use unrelated nouns', () => {
  const word = { german: 'der Mann', article: 'der', plural: 'die Männer' };
  const options = pluralOptions(word);
  assert.equal(options.length, 4);
  assert.equal(options.filter(option => option === 'die Männer').length, 1);
  assert.ok(options.every(option => /^die Mann/.test(option) || /^die Männ/.test(option)));
});

test('plural formatting does not duplicate an existing article', () => {
  assert.equal(formatPlural('die Bücher'), 'die Bücher');
  assert.equal(formatPlural('Bücher'), 'die Bücher');
});

test('verb bank uses only imported verb fields that are actually populated', () => {
  const bank = buildVerbBank([
    { german: 'sprechen', partOfSpeech: 'verb', presentIch: 'spreche', presentDu: 'sprichst' },
    { german: 'Buch', article: 'das', plural: 'Bücher' },
    { german: 'gehen', partOfSpeech: 'verb' }
  ]);
  assert.equal(bank.length, 1);
  assert.equal(bank[0].ich, 'spreche');
  assert.equal(bank[0].du, 'sprichst');
});

test('verb questions are omitted when no distinct imported distractors exist', () => {
  const bank = buildVerbBank([{ german: 'gehen', partOfSpeech: 'verb', presentIch: 'gehe' }]);
  assert.deepEqual(buildVerbQuestions(bank), []);
});

test('article can be read from the German field when the separate article column is empty', () => {
  const word = { german: 'das Buch', plural: 'Bücher' };
  assert.equal(getArticle(word), 'das');
  assert.equal(inferPartOfSpeech(word), 'noun');
});

test('verb forms identify a verb when part_of_speech is omitted', () => {
  const word = { german: 'sprechen', presentIch: 'spreche' };
  assert.equal(inferPartOfSpeech(word), 'verb');
  assert.equal(buildVerbBank([word]).length, 1);
});
