// The existing channel's suite.
//
// It passes today. It has to pass unchanged when you are done.

import test from 'node:test';
import assert from 'node:assert/strict';

import { loadBrief } from '../src/brief.js';
import { loadAssetIndex } from '../src/assets.js';
import { assemble } from '../src/assemble.js';
import { meta, HEADLINE_LIMIT } from '../src/channels/meta.js';
import { metaProvider, UPLOAD_CREDITS, CREATE_CREDITS } from '../src/providers/meta.js';

const BRIEF = new URL('../briefs/launch-2026-08.json', import.meta.url);

function run() {
  return assemble({
    brief: loadBrief(BRIEF),
    channel: meta,
    provider: metaProvider,
    assets: loadAssetIndex(),
  });
}

test('meta assembles the launch brief', async () => {
  const result = await run();

  assert.equal(result.channel, 'meta');
  assert.match(result.packageId, /^meta_pkg_/);
  assert.equal(result.payload.channel, 'meta');
  assert.equal(result.payload.campaign_id, 'cmp_88231');
  assert.equal(result.payload.link_url, 'https://example.invalid/trail-runner-gt');
});

test('meta uploads only the vertical video, not every asset in the brief', async () => {
  const brief = loadBrief(BRIEF);
  assert.equal(brief.assetIds.length, 3);

  const result = await run();
  const uploads = result.costs.filter((row) => row.call === 'uploadAsset');

  assert.equal(uploads.length, 1);
  assert.equal(uploads[0].note, 'hero-9x16');
  assert.equal(result.payload.media.length, 1);
  assert.deepEqual(
    { type: result.payload.media[0].type, ratio: result.payload.media[0].ratio, format: result.payload.media[0].format },
    { type: 'video', ratio: '9:16', format: 'mp4' },
  );
});

test('meta trims the headline to the channel limit at a word boundary', async () => {
  const brief = loadBrief(BRIEF);
  assert.ok(brief.headline.length > HEADLINE_LIMIT, 'the brief headline is meant to be over the limit');

  const result = await run();
  const headline = result.payload.creative.headline;

  assert.ok(headline.length <= HEADLINE_LIMIT);
  assert.ok(brief.headline.startsWith(headline));
  assert.ok(!headline.endsWith(' '));
  assert.ok(!/[,;:.!?-]$/u.test(headline));
});

test('meta carries the optional description and drops nothing else', async () => {
  const result = await run();

  assert.deepEqual(Object.keys(result.payload).sort(), [
    'campaign_id',
    'channel',
    'creative',
    'link_url',
    'media',
  ]);
  assert.deepEqual(Object.keys(result.payload.creative).sort(), [
    'description',
    'headline',
    'primary_text',
  ]);
});

test('one meta package costs one upload plus one create', async () => {
  const result = await run();

  assert.deepEqual(
    result.costs.map((row) => row.call),
    ['uploadAsset', 'createPackage'],
  );
  assert.equal(result.credits, UPLOAD_CREDITS + CREATE_CREDITS);
});

test('meta refuses a brief with no vertical video', async () => {
  const brief = { ...loadBrief(BRIEF), assetIds: ['still-16x9'] };
  await assert.rejects(
    () => assemble({ brief, channel: meta, provider: metaProvider, assets: loadAssetIndex() }),
    /needs one 9:16 mp4 video/,
  );
});

test('meta refuses a brief missing a field it declares', async () => {
  const brief = { ...loadBrief(BRIEF), landingPageUrl: '' };
  await assert.rejects(
    () => assemble({ brief, channel: meta, provider: metaProvider, assets: loadAssetIndex() }),
    (error) => error.code === 'invalid_brief' && error.field === 'landingPageUrl',
  );
});
