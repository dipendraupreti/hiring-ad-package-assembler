// Shared text helpers.
//
// Every channel has its own length limits and they do not agree, so trimming
// copy to fit is shared work rather than channel work.

/**
 * Trim `text` to at most `limit` characters, cutting at a word boundary and
 * dropping trailing punctuation. Returns the input unchanged when it fits.
 *
 * @param {string} text
 * @param {number} limit
 * @returns {string}
 */
export function truncate(text, limit) {
  if (typeof text !== 'string') throw new TypeError('truncate expects a string');
  if (!Number.isInteger(limit) || limit <= 0) throw new RangeError('limit must be a positive integer');
  if (text.length <= limit) return text;

  const cut = text.slice(0, limit);
  const lastSpace = cut.lastIndexOf(' ');
  const atBoundary = lastSpace > 0 ? cut.slice(0, lastSpace) : cut;
  return atBoundary.replace(/[\s,;:.!?-]+$/u, '');
}
