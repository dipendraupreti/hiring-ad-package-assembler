import test from 'node:test';
import assert from 'node:assert/strict';

import { truncate } from '../src/text.js';

test('text that fits is returned unchanged', () => {
  assert.equal(truncate('short', 40), 'short');
  assert.equal(truncate('exactly ten', 11), 'exactly ten');
});

test('text that does not fit is cut at a word boundary', () => {
  assert.equal(truncate('one two three four', 12), 'one two');
  assert.ok(truncate('one two three four', 12).length <= 12);
});

test('trailing punctuation and space are dropped', () => {
  assert.equal(truncate('alpha, beta gamma', 8), 'alpha');
  assert.equal(truncate('alpha beta', 6), 'alpha');
});

test('a single word longer than the limit is cut mid-word', () => {
  assert.equal(truncate('antidisestablishmentarianism', 6), 'antidi');
});

test('bad input is rejected', () => {
  assert.throws(() => truncate(42, 10), TypeError);
  assert.throws(() => truncate('text', 0), RangeError);
  assert.throws(() => truncate('text', 2.5), RangeError);
});
