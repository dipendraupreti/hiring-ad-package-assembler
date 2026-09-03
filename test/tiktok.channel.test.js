// The tiktok channel's suite.
//
// Structured to match test/meta.channel.test.js, plus the cases that only exist
// because this channel takes two assets and makes an extra provider call.

import test from 'node:test';
import assert from 'node:assert/strict';

import { loadBrief } from '../src/brief.js';
import { AssetIndex, loadAssetIndex } from '../src/assets.js';
import { assemble } from '../src/assemble.js';
import { tiktok, CAPTION_LIMIT } from '../src/channels/tiktok.js';
import {
  tiktokProvider,
  UPLOAD_CREDITS,
  TRANSCODE_CREDITS,
  CREATE_CREDITS,
} from '../src/providers/tiktok.js';

const BRIEF = new URL('../briefs/launch-2026-08.json', import.meta.url);

function run(overrides = {}) {
  return assemble({
    brief: { ...loadBrief(BRIEF), ...overrides },
    channel: tiktok,
    provider: tiktokProvider,
    assets: loadAssetIndex(),
  });
}

test('tiktok assembles the launch brief', async () => {
  const result = await run();

  assert.equal(result.channel, 'tiktok');
  assert.match(result.packageId, /^tt_pkg_/);
  assert.equal(result.payload.channel, 'tiktok');
  assert.equal(result.payload.advertiserId, 'adv_4471');
  assert.equal(result.payload.musicId, 'trk_00912');
  assert.equal(result.payload.landingPageUrl, 'https://example.invalid/trail-runner-gt');
});

test('tiktok uploads the video and the cover, and skips the third asset', async () => {
  const brief = loadBrief(BRIEF);
  assert.equal(brief.assetIds.length, 3);

  const result = await run();
  const uploads = result.costs.filter((row) => row.call === 'uploadAsset');

  assert.deepEqual(
    uploads.map((row) => row.note),
    ['hero-9x16', 'cover-1x1'],
  );
});

test('the cover id in the payload is the transcoded one, not the uploaded one', async () => {
  const result = await run();

  // The stub derives one id from the other, so they are both stable and
  // different. Sending the upload's id is the mistake this guards against.
  assert.match(result.payload.coverImageId, /^tt_cover_/);
  assert.match(result.payload.videoAssetId, /^tt_asset_/);
  assert.notEqual(result.payload.coverImageId, result.payload.videoAssetId);

  const uploaded = await tiktokProvider.uploadAsset(loadAssetIndex().get('cover-1x1'));
  assert.notEqual(result.payload.coverImageId, uploaded.remoteId);
});

test('the payload carries exactly the keys the provider allows', async () => {
  const result = await run();

  assert.deepEqual(Object.keys(result.payload).sort(), [
    'advertiserId',
    'caption',
    'channel',
    'coverImageId',
    'landingPageUrl',
    'musicId',
    'videoAssetId',
  ]);
  // PROVIDERS.md: "There is no description field of any kind."
  assert.equal(result.payload.description, undefined);
});

test('one tiktok package costs two uploads, a transcode and a create', async () => {
  const result = await run();

  assert.deepEqual(
    result.costs.map((row) => row.call),
    ['uploadAsset', 'uploadAsset', 'transcodeCover', 'createPackage'],
  );
  assert.equal(result.credits, UPLOAD_CREDITS * 2 + TRANSCODE_CREDITS + CREATE_CREDITS);
  assert.equal(result.credits, 41);
});

test('tiktok trims the caption to the channel limit at a word boundary', async () => {
  const headline = 'Grip that holds the corner on wet rock, in the rain, in the dark, and on every descent you will ever run';
  assert.ok(headline.length > CAPTION_LIMIT);

  const result = await run({ headline });
  const { caption } = result.payload;

  assert.ok(caption.length <= CAPTION_LIMIT);
  assert.ok(headline.startsWith(caption));
  assert.ok(!caption.endsWith(' '));
  assert.ok(!/[,;:.!?-]$/u.test(caption));
});

test('tiktok refuses a brief whose only image is the wrong ratio', async () => {
  // still-16x9 is a jpg, so uploadAsset would accept it and only transcodeCover
  // would object. selectAssets has to catch it before either call is paid for.
  await assert.rejects(() => run({ assetIds: ['hero-9x16', 'still-16x9'] }), /needs one 1:1 jpg cover/);
});

test('tiktok refuses a brief with no vertical video', async () => {
  await assert.rejects(() => run({ assetIds: ['cover-1x1'] }), /needs one 9:16 mp4 video/);
});

test('tiktok refuses a brief missing a field it declares', async () => {
  for (const field of ['advertiserId', 'headline', 'landingPageUrl', 'musicId']) {
    await assert.rejects(
      () => run({ [field]: '' }),
      (error) => error.code === 'invalid_brief' && error.field === field,
      `expected a brief without ${field} to be refused`,
    );
  }
});

test('a rejected transcode stops the run instead of reaching createPackage', async () => {
  let created = false;
  const provider = {
    ...tiktokProvider,
    async transcodeCover() {
      return { ok: false, error: 'cover_must_be_square', detail: { ratio: '16:9' }, creditsConsumed: TRANSCODE_CREDITS };
    },
    async createPackage(payload) {
      created = true;
      return tiktokProvider.createPackage(payload);
    },
  };

  await assert.rejects(
    () => assemble({ brief: loadBrief(BRIEF), channel: tiktok, provider, assets: loadAssetIndex() }),
    (error) => error.code === 'cover_must_be_square',
  );
  assert.equal(created, false, 'createPackage must not run after a failed transcode');
});

test('a video over the provider limit is refused at upload', async () => {
  const assets = new AssetIndex({
    'long-9x16': { file: 'long.mp4', kind: 'video', format: 'mp4', ratio: '9:16', durationSeconds: 90, bytes: 1 },
    'cover-1x1': { file: 'c.jpg', kind: 'image', format: 'jpg', ratio: '1:1', bytes: 1 },
  });
  const brief = { ...loadBrief(BRIEF), assetIds: ['long-9x16', 'cover-1x1'] };

  await assert.rejects(
    () => assemble({ brief, channel: tiktok, provider: tiktokProvider, assets }),
    (error) => error.code === 'video_too_long',
  );
});
