import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseCSV } from '../js/csv.js';

test('parses the supplied 17-column template with BOM and German umlauts', async () => {
  const csv = await readFile(new URL('../deutsch-meister-template.csv', import.meta.url), 'utf8');
  const rows = parseCSV(csv);
  assert.equal(Object.keys(rows[0]).length, 17);
  assert.equal(rows[0].german, 'das Buch');
  assert.equal(rows[0].article, 'das');
  assert.equal(rows[0].plural, 'die Bücher');
  assert.equal(rows[1].german, 'sprechen');
  assert.equal(rows[1].present_du, 'sprichst');
  assert.equal(rows[1].perfekt, 'hat gesprochen');
  assert.equal(rows[1].dictionary_url, '');
});

test('preserves commas and escaped quotes inside quoted cells', () => {
  const rows = parseCSV('german,translation_en,example_de\n"das Wort","word, term","Er sagt ""Hallo"", bitte."');
  assert.equal(rows[0].translation_en, 'word, term');
  assert.equal(rows[0].example_de, 'Er sagt "Hallo", bitte.');
});

test('supports tab-delimited files and UTF-8 BOM', () => {
  const rows = parseCSV('\uFEFFgerman\ttranslation_en\tplural\n"die Straße"\tstreet\t"die Straßen"');
  assert.equal(rows[0].german, 'die Straße');
  assert.equal(rows[0].plural, 'die Straßen');
});

test('allows german as the only populated field', () => {
  const rows = parseCSV('german,article,translation_en,dictionary_url\nlaufen,,,,');
  assert.equal(rows[0].german, 'laufen');
  assert.equal(rows[0].translation_en, '');
});

test('detects semicolon delimiter only when it is the header delimiter', () => {
  const rows = parseCSV('german;translation_en;example_de\n"das Wort";"word; term";"Ein Satz; mit Komma, und mehr."');
  assert.equal(rows[0].translation_en, 'word; term');
  assert.equal(rows[0].example_de, 'Ein Satz; mit Komma, und mehr.');
});

test("imports all eight rows and preserves every flashcard field from the user's sample", async () => {
  const csv = await readFile(new URL('./user-sample.csv', import.meta.url), 'utf8');
  const rows = parseCSV(csv);
  assert.equal(rows.length, 8);
  assert.equal(Object.keys(rows[0]).length, 17);
  assert.equal(rows[0].translation_en, 'admittedly; to be sure');
  assert.equal(rows[0].example_de, 'Ich habe zwar wenig Zeit, aber ich helfe dir gern.');
  assert.equal(rows[0].example_en, 'I do have little time, but I am happy to help you.');
  assert.equal(rows[0].part_of_speech, 'adverb');
  assert.equal(rows[1].article, 'der');
  assert.equal(rows[1].part_of_speech, 'noun');
  assert.equal(rows[2].present_du, 'erreichst');
  assert.equal(rows[2].perfekt_auxiliary, 'haben');
  assert.equal(rows[4].translation_en, 'means; remedy; agent');
  assert.equal(rows[5].dictionary_url, 'https://www.verbformen.de/?w=befinden%20%28sich%29');
  assert.equal(rows[7].plural, 'die Angaben');
});
