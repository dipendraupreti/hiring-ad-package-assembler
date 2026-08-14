// Shared machinery for the provider stubs.
//
// No stub reaches the network. Every response is canned, every id is derived
// from its input, and every call reports what it consumed. Two runs of the same
// input produce the same ids and the same credit total.

/** Stable non-cryptographic hash, so remote ids reproduce across runs. */
export function stableId(prefix, text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return `${prefix}_${h.toString(36).padStart(7, '0')}`;
}

/** A rejection carrying the reason, in the shape assemble() reads. */
export function reject(error, detail, creditsConsumed) {
  return { ok: false, error, detail, creditsConsumed };
}

/**
 * Refuse any key the provider does not know about.
 *
 * @param {object} object
 * @param {string[]} allowed
 * @param {string} where
 * @returns {string|null} the offending path, or null
 */
export function unknownField(object, allowed, where) {
  for (const key of Object.keys(object)) {
    if (!allowed.includes(key)) return `${where}.${key}`;
  }
  return null;
}

export function isString(value) {
  return typeof value === 'string' && value.length > 0;
}

export function isHttpsUrl(value) {
  return isString(value) && /^https:\/\/[^\s]+$/u.test(value);
}
