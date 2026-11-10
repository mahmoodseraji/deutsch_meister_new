/**
 * Scheduling rules for Deutsch Meister.
 * Dates are local calendar dates (YYYY-MM-DD), not UTC timestamps.
 * Leitner and SM-2 state are stored independently under word.scheduling.
 */
export const today = (now = new Date()) => {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const addDays = (days, from = new Date()) => {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  d.setDate(d.getDate() + Number(days));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const LEITNER_INTERVALS = Object.freeze({ 1: 1, 2: 2, 3: 4, 4: 7, 5: 14 });
const SM2_QUALITY = Object.freeze({ again: 1, hard: 3, good: 4, easy: 5 });
const METHODS = new Set(['leitner', 'sm2']);
const RATINGS = new Set(['again', 'hard', 'good', 'easy']);
const LEITNER_RATINGS = new Set(['again', 'good']);

export function ensureSchedules(word, legacyAlgorithm = 'sm2', now = new Date()) {
  if (!METHODS.has(legacyAlgorithm)) throw new RangeError(`Unknown scheduling method: ${legacyAlgorithm}`);
  const w = { ...word };
  const schedules = { ...(word.scheduling || {}) };

  // Legacy top-level fields are only a trustworthy source when neither
  // method-specific schedule existed. Otherwise they may mirror the method
  // that was last reviewed, not the currently selected method.
  const migrateLegacy = !schedules.leitner && !schedules.sm2;
  if (!schedules.leitner) {
    schedules.leitner = {
      box: migrateLegacy && legacyAlgorithm === 'leitner'
        ? Math.max(1, Math.min(5, Number(word.box || 1))) : 1,
      interval: migrateLegacy && legacyAlgorithm === 'leitner'
        ? Math.max(0, Number(word.interval || 0)) : 0,
      dueDate: migrateLegacy && legacyAlgorithm === 'leitner'
        ? (word.dueDate || today(now)) : (word.active === false ? '9999-12-31' : today(now)),
      reviewCount: migrateLegacy && legacyAlgorithm === 'leitner'
        ? Math.max(0, Number(word.reviewCount || 0)) : 0
    };
  } else {
    const leitner = schedules.leitner;
    schedules.leitner = {
      ...leitner,
      box: Math.max(1, Math.min(5, Number(leitner.box || 1))),
      interval: Math.max(0, Number(leitner.interval || 0)),
      dueDate: leitner.dueDate || today(now),
      reviewCount: Math.max(0, Number(leitner.reviewCount || 0))
    };
  }
  if (!schedules.sm2) {
    const legacyEase = Number(word.easeFactor ?? 2.5);
    schedules.sm2 = {
      repetitions: migrateLegacy && legacyAlgorithm === 'sm2' ? Math.max(0, Number(word.repetitions || 0)) : 0,
      easeFactor: migrateLegacy && legacyAlgorithm === 'sm2' && Number.isFinite(legacyEase) ? Math.max(1.3, legacyEase) : 2.5,
      interval: migrateLegacy && legacyAlgorithm === 'sm2' ? Math.max(0, Number(word.interval || 0)) : 0,
      dueDate: migrateLegacy && legacyAlgorithm === 'sm2' ? (word.dueDate || today(now)) : (word.active === false ? '9999-12-31' : today(now)),
      reviewCount: migrateLegacy && legacyAlgorithm === 'sm2' ? Math.max(0, Number(word.reviewCount || 0)) : 0
    };
  } else {
    const sm2 = schedules.sm2;
    const ease = Number(sm2.easeFactor ?? 2.5);
    schedules.sm2 = {
      ...sm2,
      repetitions: Math.max(0, Number(sm2.repetitions || 0)),
      easeFactor: Number.isFinite(ease) ? Math.max(1.3, ease) : 2.5,
      interval: Math.max(0, Number(sm2.interval || 0)),
      dueDate: sm2.dueDate || today(now),
      reviewCount: Math.max(0, Number(sm2.reviewCount || 0))
    };
  }
  w.scheduling = schedules;
  return w;
}

function nextLeitnerState(state, rating) {
  const currentBox = Math.max(1, Math.min(5, Number(state.box || 1)));
  const box = rating === 'again' ? 1 : Math.min(5, currentBox + 1);
  return { ...state, box, interval: LEITNER_INTERVALS[box] };
}

/** Classic SM-2 interval progression with explicit four-button quality mapping.
 * Again=1 (fail/reset), Hard=3, Good=4, Easy=5.
 */
function nextSm2State(state, rating) {
  const quality = SM2_QUALITY[rating];
  let repetitions = Math.max(0, Number(state.repetitions || 0));
  let interval = Math.max(0, Number(state.interval || 0));
  let easeFactor = Number(state.easeFactor ?? 2.5);
  if (!Number.isFinite(easeFactor)) easeFactor = 2.5;
  easeFactor = Math.max(1.3, easeFactor);

  const delta = 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02);
  easeFactor = Math.max(1.3, easeFactor + delta);

  if (quality < 3) {
    repetitions = 0;
    interval = 1;
  } else {
    if (repetitions === 0) interval = 1;
    else if (repetitions === 1) interval = 6;
    else interval = Math.max(1, Math.round(interval * easeFactor));
    repetitions += 1;
  }
  return { ...state, repetitions, easeFactor: Number(easeFactor.toFixed(4)), interval };
}

/** UI wording and next interval for a rating under the selected algorithm. */
export function ratingButtonInfo(word, rating, algorithm = 'sm2') {
  const next = previewSchedule(word, rating, algorithm);
  if (algorithm === 'leitner') {
    const labels = { again: 'Forgot', good: 'Remembered' };
    return {
      label: labels[rating],
      detail: `Box ${next.box} · ${next.interval} ${next.interval === 1 ? 'day' : 'days'}`,
      interval: next.interval,
      box: next.box
    };
  }
  const labels = { again: 'Again', hard: 'Hard', good: 'Good', easy: 'Easy' };
  return {
    label: labels[rating],
    detail: `${next.interval} ${next.interval === 1 ? 'day' : 'days'}`,
    interval: next.interval
  };
}

export function previewSchedule(word, rating, algorithm = 'sm2') {
  if (!METHODS.has(algorithm)) throw new RangeError(`Unknown scheduling method: ${algorithm}`);
  if (!RATINGS.has(rating) || (algorithm === 'leitner' && !LEITNER_RATINGS.has(rating))) throw new RangeError(`Unknown review rating for ${algorithm}: ${rating}`);
  const w = ensureSchedules(word, algorithm);
  const current = w.scheduling[algorithm];
  return algorithm === 'leitner' ? nextLeitnerState(current, rating) : nextSm2State(current, rating);
}

export function schedule(word, rating, algorithm = 'sm2', now = new Date()) {
  if (!METHODS.has(algorithm)) throw new RangeError(`Unknown scheduling method: ${algorithm}`);
  if (!RATINGS.has(rating) || (algorithm === 'leitner' && !LEITNER_RATINGS.has(rating))) throw new RangeError(`Unknown review rating for ${algorithm}: ${rating}`);
  const w = ensureSchedules(word, algorithm, now);
  const next = previewSchedule(w, rating, algorithm);
  next.dueDate = addDays(next.interval, now);
  next.lastReviewed = today(now);
  next.reviewCount = Math.max(0, Number(next.reviewCount || 0)) + 1;
  w.scheduling[algorithm] = next;

  // Legacy mirrors are retained for older exports/versions. They never feed the
  // other algorithm's schedule once both independent schedule objects exist.
  Object.assign(w, algorithm === 'leitner'
    ? { box: next.box, interval: next.interval, dueDate: next.dueDate, lastReviewed: next.lastReviewed, reviewCount: next.reviewCount }
    : { repetitions: next.repetitions, easeFactor: next.easeFactor, interval: next.interval, dueDate: next.dueDate, lastReviewed: next.lastReviewed, reviewCount: next.reviewCount });
  return w;
}

export const isDue = (word, algorithm = 'sm2', now = new Date()) => {
  if (!METHODS.has(algorithm)) throw new RangeError(`Unknown scheduling method: ${algorithm}`);
  const state = word.scheduling?.[algorithm];
  return (state?.dueDate || word.dueDate || today(now)) <= today(now);
};

export const sm2QualityForRating = rating => {
  if (!RATINGS.has(rating)) throw new RangeError(`Unknown review rating: ${rating}`);
  return SM2_QUALITY[rating];
};
