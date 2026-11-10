/** Build only the conjugation details actually supplied with a vocabulary entry. */
export function conjugationRows(word = {}) {
  const present = [['ich', word.presentIch], ['du', word.presentDu], ['er/sie/es', word.presentEr],
    ['wir', word.presentWir], ['ihr', word.presentIhr], ['sie/Sie', word.presentSie]]
    .filter(([, value]) => String(value || '').trim())
    .map(([person, value]) => `${person}: ${String(value).trim()}`)
    .join(' · ');
  return [
    ['Präsens', present],
    ['Präteritum', word.prateritum],
    ['Perfekt', word.perfekt],
    ['Auxiliary', word.auxiliary]
  ].filter(([, value]) => String(value || '').trim()).map(([label, value]) => [label, String(value).trim()]);
}

/** Verbformen's search endpoint is built from the vocabulary itself. */
export function dictionaryHref(word) {
  const value = String(word || '').trim();
  return value ? `https://www.verbformen.com/?w=${encodeURIComponent(value).replace(/[!'()*]/g, c => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)}` : '';
}
