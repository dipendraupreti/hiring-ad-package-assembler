// Loading and checking a creative brief.
//
// The brief is channel-agnostic. Which of its fields a channel needs is the
// channel's business, declared as `requiredBriefFields` on the channel module.

import { readFileSync } from 'node:fs';

const ALWAYS_REQUIRED = ['briefId', 'campaignId', 'assetIds'];

export class BriefError extends Error {
  constructor(message, field) {
    super(message);
    this.name = 'BriefError';
    this.code = 'invalid_brief';
    this.field = field;
  }
}

export function loadBrief(path) {
  const brief = JSON.parse(readFileSync(path, 'utf8'));
  checkBrief(brief);
  return brief;
}

export function checkBrief(brief) {
  for (const field of ALWAYS_REQUIRED) {
    if (brief[field] === undefined || brief[field] === null || brief[field] === '') {
      throw new BriefError(`brief is missing ${field}`, field);
    }
  }
  if (!Array.isArray(brief.assetIds) || brief.assetIds.length === 0) {
    throw new BriefError('brief.assetIds must be a non-empty array', 'assetIds');
  }
  return brief;
}

/**
 * Check the fields one channel declares it needs.
 *
 * @param {object} brief
 * @param {string[]} fields
 */
export function requireBriefFields(brief, fields) {
  for (const field of fields) {
    if (brief[field] === undefined || brief[field] === null || brief[field] === '') {
      throw new BriefError(`brief is missing ${field}, which this channel requires`, field);
    }
  }
}
