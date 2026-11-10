import test from 'node:test';
import assert from 'node:assert/strict';
import { conjugationRows, dictionaryHref } from '../js/flashcard.js';

test('conjugation display contains only imported populated forms in the requested order', () => {
  const rows = conjugationRows({ presentIch: 'spreche', presentDu: '', presentEr: 'spricht', prateritum: 'sprach', perfekt: '', auxiliary: 'haben' });
  assert.deepEqual(rows, [
    ['Präsens', 'ich: spreche · er/sie/es: spricht'],
    ['Präteritum', 'sprach'],
    ['Auxiliary', 'haben']
  ]);
});

test('conjugation display omits every empty form and returns no rows when none were imported', () => {
  assert.deepEqual(conjugationRows({}), []);
  assert.deepEqual(conjugationRows({ presentIch: ' ', prateritum: '', perfekt: null, auxiliary: '' }), []);
});

test('Verbformen dictionary link is generated from the exact German vocabulary', () => {
  assert.equal(dictionaryHref('befinden (sich)'), 'https://www.verbformen.com/?w=befinden%20%28sich%29');
  assert.equal(dictionaryHref(''), '');
});
