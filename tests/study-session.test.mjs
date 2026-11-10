import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDailyStudyQueue, hasLearningHistory, sm2LearningStage, distributionFor } from '../js/study-session.js';

const today = '2026-11-07';
const learned = (id, method = 'sm2', dueDate = today) => ({
  id, german: id,
  scheduling: {
    leitner: { box: 2, interval: 2, dueDate, reviewCount: method === 'leitner' ? 1 : 0 },
    sm2: { repetitions: 1, interval: 1, dueDate, reviewCount: method === 'sm2' ? 1 : 0 }
  }
});
const fresh = id => ({ id, german: id, scheduling: {
  leitner: { box: 1, interval: 0, dueDate: today, reviewCount: 0 },
  sm2: { repetitions: 0, interval: 0, dueDate: today, reviewCount: 0 }
} });

test('due learned words are queued before new vocabulary', () => {
  const due = learned('due');
  const queue = buildDailyStudyQueue({ words: [fresh('new-1'), due, fresh('new-2')], reviewLogs: [], duePredicate: w => w.id === 'due', date: today, newWordsPerDay: 10 });
  assert.deepEqual(queue.map(w => w.id), ['due', 'new-1', 'new-2']);
});

test('daily new-word limit is independent and counts words introduced earlier today', () => {
  const words = Array.from({ length: 15 }, (_, i) => fresh(`w${i}`));
  const logs = Array.from({ length: 8 }, (_, i) => ({ id: `n${i}`, type: 'new_word', date: today, wordId: `w${i}` }));
  const queue = buildDailyStudyQueue({ words, reviewLogs: logs, duePredicate: () => false, date: today, newWordsPerDay: 10 });
  assert.deepEqual(queue.map(w => w.id), ['w8', 'w9']);
});

test('a word reviewed under SM-2 never becomes new after switching to Leitner', () => {
  const word = fresh('old');
  const logs = [{ id: 'r1', type: 'review', date: '2026-11-06', wordId: 'old', algorithm: 'sm2' }];
  assert.equal(hasLearningHistory(word, logs), true);
  const queue = buildDailyStudyQueue({ words: [word, fresh('brand-new')], reviewLogs: logs, duePredicate: () => true, date: today, newWordsPerDay: 10, method: 'leitner' });
  assert.deepEqual(queue.map(w => w.id), ['old', 'brand-new']);
});

test('words already introduced today are not repeated as new in another session', () => {
  const logs = [{ id: 'n1', type: 'new_word', date: today, wordId: 'w1' }];
  const queue = buildDailyStudyQueue({ words: [fresh('w1'), fresh('w2')], reviewLogs: logs, duePredicate: () => false, date: today, newWordsPerDay: 10 });
  assert.deepEqual(queue.map(w => w.id), ['w2']);
});

test('SM-2 stages use repetition history rather than the most recent rating', () => {
  const word = { id: 'w', scheduling: { sm2: { repetitions: 0, reviewCount: 2, lastRating: 'again' } } };
  assert.equal(sm2LearningStage(word, []), 'Learning');
  assert.equal(sm2LearningStage(fresh('n'), []), 'New');
  assert.equal(sm2LearningStage({ id: 'd', scheduling: { sm2: { repetitions: 2, reviewCount: 3 } } }, []), 'Developing');
  assert.equal(sm2LearningStage({ id: 'e', scheduling: { sm2: { repetitions: 4, reviewCount: 4 } } }, []), 'Established');
});

test('Leitner distribution counts every word in its current box', () => {
  const words = [1, 1, 2, 3, 3, 3, 5].map((box, i) => ({ id: String(i), scheduling: { leitner: { box } } }));
  assert.deepEqual(distributionFor(words, 'leitner').counts, [2, 1, 3, 0, 1]);
  assert.equal(distributionFor(words, 'leitner').total, 7);
});

test('SM-2 distribution totals all four learning stages', () => {
  const words = [fresh('n'),
    { id: 'l', scheduling: { sm2: { repetitions: 0, reviewCount: 1 } } },
    { id: 'd', scheduling: { sm2: { repetitions: 2, reviewCount: 3 } } },
    { id: 'e', scheduling: { sm2: { repetitions: 4, reviewCount: 4 } } }
  ];
  const distribution = distributionFor(words, 'sm2');
  assert.deepEqual(distribution.labels, ['New', 'Learning', 'Developing', 'Established']);
  assert.deepEqual(distribution.counts, [1, 1, 1, 1]);
  assert.equal(distribution.total, 4);
});

test('legacy interval-only review state is recognised as learned', () => {
  assert.equal(hasLearningHistory({ id: 'legacy', interval: 6, box: 1 }, []), true);
});


test('learned words that are not due are not added to the daily review queue', () => {
  const notDue = learned('not-due', 'sm2', '2026-11-09');
  const due = learned('due', 'sm2', today);
  const queue = buildDailyStudyQueue({ words: [notDue, due], reviewLogs: [], duePredicate: w => w.scheduling.sm2.dueDate <= today, date: today, newWordsPerDay: 0 });
  assert.deepEqual(queue.map(w => w.id), ['due']);
});


test('legacy SM-2 repetition count alone is enough to avoid the New stage', () => {
  assert.equal(sm2LearningStage({ id: 'legacy-sm2', scheduling: { sm2: { repetitions: 2 } } }, []), 'Developing');
});


test('an opened but unrated new word remains available after an interrupted session', () => {
  const words = [fresh('w1'), fresh('w2')];
  const noRatingLogs = [];
  const afterRestart = buildDailyStudyQueue({ words, reviewLogs: noRatingLogs, duePredicate: () => false, date: today, newWordsPerDay: 1 });
  assert.deepEqual(afterRestart.map(w => w.id), ['w1']);
  const afterRatingLogs = [{ id: 'r1', type: 'review', date: today, wordId: 'w1', algorithm: 'sm2' }, { id: 'n1', type: 'new_word', date: today, wordId: 'w1' }];
  const afterRating = buildDailyStudyQueue({ words, reviewLogs: afterRatingLogs, duePredicate: () => false, date: today, newWordsPerDay: 2 });
  assert.deepEqual(afterRating.map(w => w.id), ['w2']);
});
