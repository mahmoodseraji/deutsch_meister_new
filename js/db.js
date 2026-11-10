const DB_NAME = 'deutsch-meister-db';
let dbRef;

export function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 2);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('words')) db.createObjectStore('words', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('settings')) db.createObjectStore('settings', { keyPath: 'key' });
      if (!db.objectStoreNames.contains('reviewLogs')) {
        const s = db.createObjectStore('reviewLogs', { keyPath: 'id' });
        s.createIndex('date', 'date');
      }
      if (!db.objectStoreNames.contains('sessions')) db.createObjectStore('sessions', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('collections')) db.createObjectStore('collections', { keyPath: 'id' });
    };
    req.onsuccess = () => {
      const db = req.result;
      // Let a newer version of the app (another tab) upgrade the schema instead of blocking it forever.
      db.onversionchange = () => db.close();
      resolve(db);
    };
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error('Close other Deutsch Meister tabs and reload.'));
  });
}

export function setDB(db) { dbRef = db; }
export function getDB() { return dbRef; }

/**
 * Runs `action(store)` inside one transaction.
 * Read-write calls resolve only when the transaction has COMMITTED. Resolving on the
 * request's `success` event (the previous behaviour) hides commit failures such as
 * QuotaExceededError, so the UI could report "saved" while nothing was persisted.
 */
export function request(store, mode, action) {
  return new Promise((resolve, reject) => {
    if (!dbRef) { reject(new Error('Database is not open.')); return; }
    let tx, result;
    try {
      tx = dbRef.transaction(store, mode);
      result = action(tx.objectStore(store));
    } catch (e) { reject(e); return; }
    const fail = () => reject(tx.error || (result && result.error) || new Error('Database transaction failed.'));
    tx.onabort = fail;
    tx.onerror = fail;
    if (mode === 'readwrite') tx.oncomplete = () => resolve(result ? result.result : undefined);
    else if (result) { result.onsuccess = () => resolve(result.result); result.onerror = fail; }
    else tx.oncomplete = () => resolve();
  });
}

export const all = store => request(store, 'readonly', s => s.getAll());
export const put = (store, value) => request(store, 'readwrite', s => s.put(value));
export const remove = (store, id) => request(store, 'readwrite', s => s.delete(id));
export const clear = store => request(store, 'readwrite', s => s.clear());

/** Atomic batch write: either every record is stored or none is. */
export function putMany(store, values) {
  return request(store, 'readwrite', s => { for (const v of values) s.put(v); });
}
/** Atomic batch delete. */
export function removeMany(store, ids) {
  return request(store, 'readwrite', s => { for (const id of ids) s.delete(id); });
}

export async function getSetting(key, fallback) {
  const v = await request('settings', 'readonly', s => s.get(key));
  return v ? v.value : fallback;
}
export const setSetting = (key, value) => put('settings', { key, value });

/** Atomically persist a vocabulary schedule and its related review-log entries. */
export function putReviewResult(word, logEntries = []) {
  return new Promise((resolve, reject) => {
    if (!dbRef) { reject(new Error('Database is not open.')); return; }
    let tx;
    try {
      tx = dbRef.transaction(['words', 'reviewLogs'], 'readwrite');
      tx.objectStore('words').put(word);
      for (const entry of logEntries) tx.objectStore('reviewLogs').put(entry);
    } catch (error) { reject(error); return; }
    tx.oncomplete = () => resolve();
    tx.onabort = tx.onerror = () => reject(tx.error || new Error('Could not save the review.'));
  });
}
