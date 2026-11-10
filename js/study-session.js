/** Pure daily-session helpers. A word is new only if it has never been reviewed
 * under either algorithm; changing the selected method cannot make it new again. */
export function hasLearningHistory(word, reviewLogs = []) {
  const states = word?.scheduling || {};
  const hasStateHistory = Object.values(states).some(s => Number(s?.reviewCount || 0) > 0 ||
    Number(s?.repetitions || 0) > 0 || Number(s?.box || 1) > 1 || Number(s?.interval || 0) > 0 || Boolean(s?.lastReviewed));
  const hasLegacyHistory = Number(word?.reviewCount || 0) > 0 || Number(word?.repetitions || 0) > 0 ||
    Number(word?.box || 1) > 1 || Number(word?.interval || 0) > 0 || Boolean(word?.lastReviewed);
  return hasStateHistory || hasLegacyHistory || reviewLogs.some(x => x.wordId === word?.id && x.type === 'review');
}

export function buildDailyStudyQueue({ words, reviewLogs, duePredicate, date, newWordsPerDay = 10, method = 'sm2' }) {
  const active = words || [];
  const history = reviewLogs || [];
  const learned = active.filter(w => hasLearningHistory(w, history));
  const due = learned.filter(duePredicate).sort((a, b) =>
    String(a.scheduling?.[method]?.dueDate || a.dueDate || '').localeCompare(String(b.scheduling?.[method]?.dueDate || b.dueDate || '')));
  const introducedToday = new Set(history.filter(x => x.type === 'new_word' && x.date === date).map(x => x.wordId));
  const limit = Math.max(0, Number(newWordsPerDay) || 0);
  const remaining = Math.max(0, limit - introducedToday.size);
  const fresh = active.filter(w => !hasLearningHistory(w, history) && !introducedToday.has(w.id)).slice(0, remaining);
  return [...due, ...fresh];
}

export function sm2LearningStage(word, reviewLogs = []) {
  const state = word?.scheduling?.sm2 || {};
  const historyCount = Math.max(Number(state.reviewCount || 0), Number(state.repetitions || 0), reviewLogs.filter(x => x.wordId === word?.id && x.type === 'review' && x.algorithm === 'sm2').length);
  if (!historyCount) return 'New';
  const reps = Math.max(0, Number(state.repetitions || 0));
  if (reps <= 1) return 'Learning';
  if (reps <= 3) return 'Developing';
  return 'Established';
}

export function distributionFor(words, method, reviewLogs = []) {
  if (method === 'leitner') {
    const counts = [1, 2, 3, 4, 5].map(box => (words || []).filter(w => Number(w.scheduling?.leitner?.box || w.box || 1) === box).length);
    return { labels: ['Box 1', 'Box 2', 'Box 3', 'Box 4', 'Box 5'], counts, total: counts.reduce((a, b) => a + b, 0) };
  }
  const labels = ['New', 'Learning', 'Developing', 'Established'];
  const counts = labels.map(stage => (words || []).filter(w => sm2LearningStage(w, reviewLogs) === stage).length);
  return { labels, counts, total: counts.reduce((a, b) => a + b, 0) };
}
