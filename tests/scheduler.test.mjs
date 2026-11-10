import test from 'node:test';
import assert from 'node:assert/strict';
import { addDays, today, ensureSchedules, schedule, previewSchedule, isDue, sm2QualityForRating, ratingButtonInfo } from '../js/scheduler.js';

const fixedNow = new Date(2026, 10, 6, 18, 15, 0); // local 2026-11-06
const base = { id: 'word-1', german: 'sprechen', active: true, dueDate: '2026-11-06', interval: 0 };
const clone = value => structuredClone(value);

test('local calendar dates do not shift because of UTC conversion', () => {
  assert.equal(today(fixedNow), '2026-11-06');
  assert.equal(addDays(1, fixedNow), '2026-11-07');
  assert.equal(addDays(2, new Date(2026, 2, 28, 12)), '2026-03-30'); // DST transition in Germany
});

test('both schedules initialize independently for a new word', () => {
  const word = ensureSchedules(base, 'sm2', fixedNow);
  assert.deepEqual(word.scheduling.leitner, { box: 1, interval: 0, dueDate: '2026-11-06', reviewCount: 0 });
  assert.deepEqual(word.scheduling.sm2, { repetitions: 0, easeFactor: 2.5, interval: 0, dueDate: '2026-11-06', reviewCount: 0 });
});

test('legacy migration assigns old top-level schedule only to the selected method', () => {
  const legacy = { ...base, box: 4, repetitions: 2, easeFactor: 2.3, interval: 6, dueDate: '2026-11-10', reviewCount: 8 };
  const migrated = ensureSchedules(legacy, 'sm2');
  assert.equal(migrated.scheduling.sm2.repetitions, 2);
  assert.equal(migrated.scheduling.sm2.easeFactor, 2.3);
  assert.equal(migrated.scheduling.sm2.interval, 6);
  assert.equal(migrated.scheduling.leitner.box, 1);
  assert.equal(migrated.scheduling.leitner.interval, 0);
  const migratedLeitner = ensureSchedules(legacy, 'leitner');
  assert.equal(migratedLeitner.scheduling.leitner.box, 4);
  assert.equal(migratedLeitner.scheduling.sm2.repetitions, 0);
});

test('Leitner Good advances one box through the configured intervals', () => {
  let word = ensureSchedules(base, 'leitner');
  const expected = [[2, 2], [3, 4], [4, 7], [5, 14], [5, 14]];
  for (const [box, interval] of expected) {
    word = schedule(word, 'good', 'leitner', fixedNow);
    assert.equal(word.scheduling.leitner.box, box);
    assert.equal(word.scheduling.leitner.interval, interval);
  }
});

test('Leitner Again sends a failed word directly back to box 1', () => {
  let word = ensureSchedules({ ...base, scheduling: { leitner: { box: 4, interval: 7, dueDate: '2026-11-01', reviewCount: 3 } } }, 'leitner');
  word = schedule(word, 'again', 'leitner', fixedNow);
  assert.equal(word.scheduling.leitner.box, 1);
  assert.equal(word.scheduling.leitner.interval, 1);
  word = schedule(word, 'again', 'leitner', fixedNow);
  assert.equal(word.scheduling.leitner.box, 1);
  assert.equal(word.scheduling.leitner.interval, 1);
});

test('Leitner uses the classic two-outcome rule and rejects SM-2-only ratings', () => {
  let word = ensureSchedules({ ...base, scheduling: { leitner: { box: 2, interval: 2, dueDate: '2026-11-06', reviewCount: 0 } } }, 'leitner');
  word = schedule(word, 'good', 'leitner', fixedNow);
  assert.equal(word.scheduling.leitner.box, 3);
  assert.equal(word.scheduling.leitner.interval, 4);
  assert.throws(() => schedule(word, 'hard', 'leitner', fixedNow), /Unknown review rating for leitner/);
  assert.throws(() => schedule(word, 'easy', 'leitner', fixedNow), /Unknown review rating for leitner/);
});

test('SM-2 four buttons map to documented quality scores', () => {
  assert.deepEqual(['again', 'hard', 'good', 'easy'].map(sm2QualityForRating), [1, 3, 4, 5]);
});

test('classic SM-2 Good progression is 1 day, 6 days, then ease-factor multiplication', () => {
  let word = ensureSchedules(base, 'sm2');
  word = schedule(word, 'good', 'sm2', fixedNow);
  assert.equal(word.scheduling.sm2.interval, 1);
  assert.equal(word.scheduling.sm2.repetitions, 1);
  assert.equal(word.scheduling.sm2.easeFactor, 2.5);
  word = schedule(word, 'good', 'sm2', fixedNow);
  assert.equal(word.scheduling.sm2.interval, 6);
  assert.equal(word.scheduling.sm2.repetitions, 2);
  assert.equal(word.scheduling.sm2.easeFactor, 2.5);
  word = schedule(word, 'good', 'sm2', fixedNow);
  assert.equal(word.scheduling.sm2.interval, 15); // round(6 * 2.5)
  assert.equal(word.scheduling.sm2.repetitions, 3);
});

test('SM-2 Hard is a successful but difficult response and lowers ease', () => {
  let word = ensureSchedules(base, 'sm2');
  word = schedule(word, 'hard', 'sm2', fixedNow);
  assert.equal(word.scheduling.sm2.repetitions, 1);
  assert.equal(word.scheduling.sm2.interval, 1);
  assert.equal(word.scheduling.sm2.easeFactor, 2.36);
  word = schedule(word, 'hard', 'sm2', fixedNow);
  assert.equal(word.scheduling.sm2.repetitions, 2);
  assert.equal(word.scheduling.sm2.interval, 6);
  assert.equal(word.scheduling.sm2.easeFactor, 2.22);
});

test('SM-2 Easy increases ease factor but uses the classic first and second intervals', () => {
  let word = ensureSchedules(base, 'sm2');
  word = schedule(word, 'easy', 'sm2', fixedNow);
  assert.equal(word.scheduling.sm2.interval, 1);
  assert.equal(word.scheduling.sm2.easeFactor, 2.6);
  word = schedule(word, 'easy', 'sm2', fixedNow);
  assert.equal(word.scheduling.sm2.interval, 6);
  assert.equal(word.scheduling.sm2.easeFactor, 2.7);
});

test('SM-2 Again resets repetitions and schedules one day later', () => {
  let word = ensureSchedules({ ...base, scheduling: { sm2: { repetitions: 5, easeFactor: 1.35, interval: 30, dueDate: '2026-11-06', reviewCount: 7 } } }, 'sm2');
  word = schedule(word, 'again', 'sm2', fixedNow);
  assert.equal(word.scheduling.sm2.repetitions, 0);
  assert.equal(word.scheduling.sm2.interval, 1);
  assert.equal(word.scheduling.sm2.easeFactor, 1.3);
  assert.equal(word.scheduling.sm2.dueDate, '2026-11-07');
  assert.equal(word.scheduling.sm2.reviewCount, 8);
});

test('SM-2 ease factor never drops below 1.3', () => {
  let word = ensureSchedules({ ...base, scheduling: { sm2: { repetitions: 1, easeFactor: 1.3, interval: 1, dueDate: '2026-11-06', reviewCount: 0 } } }, 'sm2');
  word = schedule(word, 'hard', 'sm2', fixedNow);
  assert.equal(word.scheduling.sm2.easeFactor, 1.3);
});

test('preview returns the same next interval as committing a review without mutating input', () => {
  const word = ensureSchedules(base, 'sm2');
  const before = clone(word);
  const preview = previewSchedule(word, 'good', 'sm2');
  assert.equal(preview.interval, 1);
  assert.deepEqual(word, before);
  const committed = schedule(word, 'good', 'sm2', fixedNow);
  assert.equal(committed.scheduling.sm2.interval, preview.interval);
});

test('Leitner and SM-2 schedules never mutate each other across mixed review sequences', () => {
  let word = ensureSchedules(base, 'sm2');
  for (const rating of ['good', 'easy', 'hard', 'again', 'good']) {
    const beforeLeitner = clone(word.scheduling.leitner);
    word = schedule(word, rating, 'sm2', fixedNow);
    assert.deepEqual(word.scheduling.leitner, beforeLeitner);
  }
  for (const rating of ['good', 'good', 'again']) {
    const beforeSm2 = clone(word.scheduling.sm2);
    word = schedule(word, rating, 'leitner', fixedNow);
    assert.deepEqual(word.scheduling.sm2, beforeSm2);
  }
});

test('due checks use only the selected method and local today date', () => {
  const word = ensureSchedules(base, 'sm2');
  word.scheduling.leitner.dueDate = '9999-12-31';
  word.scheduling.sm2.dueDate = '2000-01-01';
  assert.equal(isDue(word, 'leitner', fixedNow), false);
  assert.equal(isDue(word, 'sm2', fixedNow), true);
  word.scheduling.sm2.dueDate = '2026-11-06';
  assert.equal(isDue(word, 'sm2', fixedNow), true);
  word.scheduling.sm2.dueDate = '2026-11-07';
  assert.equal(isDue(word, 'sm2', fixedNow), false);
});

test('each method writes its own next due date and review count', () => {
  let word = ensureSchedules(base, 'sm2');
  word = schedule(word, 'good', 'leitner', fixedNow);
  assert.equal(word.scheduling.leitner.dueDate, '2026-11-08');
  assert.equal(word.scheduling.leitner.reviewCount, 1);
  word = schedule(word, 'good', 'sm2', fixedNow);
  assert.equal(word.scheduling.sm2.dueDate, '2026-11-07');
  assert.equal(word.scheduling.sm2.reviewCount, 1);
});

test('invalid methods and ratings fail loudly instead of silently scheduling', () => {
  assert.throws(() => schedule(base, 'good', 'wrong', fixedNow), /Unknown scheduling method/);
  assert.throws(() => schedule(base, 'wrong', 'sm2', fixedNow), /Unknown review rating/);
  assert.throws(() => isDue(base, 'wrong', fixedNow), /Unknown scheduling method/);
});


test('Leitner button wording explains box movement and box-specific intervals', () => {
  const word = ensureSchedules({ ...base, scheduling: { leitner: { box: 3, interval: 4, dueDate: '2026-11-06', reviewCount: 2 } } }, 'leitner');
  assert.deepEqual(ratingButtonInfo(word, 'again', 'leitner'), { label: 'Forgot', detail: 'Box 1 · 1 day', interval: 1, box: 1 });
  assert.deepEqual(ratingButtonInfo(word, 'good', 'leitner'), { label: 'Remembered', detail: 'Box 4 · 7 days', interval: 7, box: 4 });
  assert.throws(() => ratingButtonInfo(word, 'hard', 'leitner'), /Unknown review rating for leitner/);
});

test('SM-2 button wording remains quality-based and shows the actual next interval', () => {
  const word = ensureSchedules(base, 'sm2');
  assert.deepEqual(ratingButtonInfo(word, 'again', 'sm2'), { label: 'Again', detail: '1 day', interval: 1 });
  assert.deepEqual(ratingButtonInfo(word, 'good', 'sm2'), { label: 'Good', detail: '1 day', interval: 1 });
});

test('a partial method-specific record does not copy its legacy mirror into the missing algorithm', () => {
  const partial = {
    ...base,
    interval: 7,
    dueDate: '2026-11-13',
    box: 4,
    scheduling: { leitner: { box: 4, interval: 7, dueDate: '2026-11-13', reviewCount: 3 } }
  };
  const migrated = ensureSchedules(partial, 'sm2', fixedNow);
  assert.equal(migrated.scheduling.leitner.box, 4);
  assert.equal(migrated.scheduling.sm2.repetitions, 0);
  assert.equal(migrated.scheduling.sm2.interval, 0);
  assert.equal(migrated.scheduling.sm2.dueDate, '2026-11-06');
});

test('ensureSchedules is deterministic: missing due dates use the injected clock, not the real one', () => {
  const later = new Date(2030, 0, 15, 9, 0, 0);
  const w = ensureSchedules({ id: 'x', german: 'gehen' }, 'leitner', later);
  assert.equal(w.scheduling.leitner.dueDate, '2030-01-15');
  assert.equal(w.scheduling.sm2.dueDate, '2030-01-15');
});

test('rating never mutates the word it was given', () => {
  const word = ensureSchedules(base, 'sm2', fixedNow);
  const snapshot = structuredClone(word);
  schedule(word, 'good', 'sm2', fixedNow);
  assert.deepEqual(word, snapshot);
});
