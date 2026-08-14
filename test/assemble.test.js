// The shared pipeline's own suite.
//
// These pin the contract between assemble() and a channel module. Every channel
// depends on them, so they are the ones a rewrite tends to break.

import test from 'node:test';
import assert from 'node:assert/strict';

import { AssetIndex } from '../src/assets.js';
import { assemble, AssemblyError } from '../src/assemble.js';

const assets = new AssetIndex({
  'v-9x16': { file: 'v.mp4', kind: 'video', format: 'mp4', ratio: '9:16', durationSeconds: 10, bytes: 1 },
  'i-1x1': { file: 'i.jpg', kind: 'image', format: 'jpg', ratio: '1:1', bytes: 1 },
});

function fakeProvider(id, overrides = {}) {
  return {
    id,
    async uploadAsset(asset) {
      return { ok: true, remoteId: `remote_${asset.id}`, creditsConsumed: 10 };
    },
    async createPackage() {
      return { ok: true, packageId: 'pkg_1', creditsConsumed: 1 };
    },
    ...overrides,
  };
}

function fakeChannel(id, overrides = {}) {
  return {
    id,
    requiredBriefFields: [],
    selectAssets: () => [{ role: 'video', assetId: 'v-9x16' }],
    buildPayload: () => ({ channel: id }),
    ...overrides,
  };
}

const brief = { briefId: 'b1', campaignId: 'c1', assetIds: ['v-9x16'] };

test('the credit total is the sum of every provider call, and nothing else', async () => {
  const result = await assemble({
    brief,
    channel: fakeChannel('x'),
    provider: fakeProvider('x'),
    assets,
  });

  assert.deepEqual(result.costs, [
    { call: 'uploadAsset', credits: 10, note: 'v-9x16' },
    { call: 'createPackage', credits: 1 },
  ]);
  assert.equal(result.credits, 11);
});

test('prepare can make extra provider calls and they land in the same total', async () => {
  const channel = fakeChannel('x', {
    async prepare({ provider, record, uploads }) {
      const out = await provider.transcode(uploads.video.remoteId);
      record('transcode', out.creditsConsumed);
    },
  });
  const provider = fakeProvider('x', {
    async transcode() {
      return { ok: true, creditsConsumed: 5 };
    },
  });

  const result = await assemble({ brief, channel, provider, assets });

  assert.deepEqual(
    result.costs.map((row) => row.call),
    ['uploadAsset', 'transcode', 'createPackage'],
  );
  assert.equal(result.credits, 16);
});

test('a channel and a provider that do not match is an error, not a silent run', async () => {
  await assert.rejects(
    () => assemble({ brief, channel: fakeChannel('a'), provider: fakeProvider('b'), assets }),
    (error) => error instanceof AssemblyError && error.code === 'channel_provider_mismatch',
  );
});

test('a provider call that reports no credit cost is an error', async () => {
  const provider = fakeProvider('x', {
    async uploadAsset(asset) {
      return { ok: true, remoteId: `remote_${asset.id}` };
    },
  });
  await assert.rejects(
    () => assemble({ brief, channel: fakeChannel('x'), provider, assets }),
    (error) => error.code === 'cost_not_reported',
  );
});

test('a channel that selects no assets is an error', async () => {
  const channel = fakeChannel('x', { selectAssets: () => [] });
  await assert.rejects(
    () => assemble({ brief, channel, provider: fakeProvider('x'), assets }),
    (error) => error.code === 'no_assets_selected',
  );
});

test('a rejected createPackage still reports what it consumed before it throws', async () => {
  const provider = fakeProvider('x', {
    async createPackage() {
      return { ok: false, error: 'unknown_field', detail: { field: 'payload.nope' }, creditsConsumed: 1 };
    },
  });
  await assert.rejects(
    () => assemble({ brief, channel: fakeChannel('x'), provider, assets }),
    (error) => error.code === 'unknown_field',
  );
});

test('a failed upload throws and does not reach createPackage', async () => {
  let created = false;
  const provider = fakeProvider('x', {
    async uploadAsset() {
      return { ok: false, error: 'unsupported_video_format', creditsConsumed: 10 };
    },
    async createPackage() {
      created = true;
      return { ok: true, packageId: 'pkg_1', creditsConsumed: 1 };
    },
  });

  await assert.rejects(
    () => assemble({ brief, channel: fakeChannel('x'), provider, assets }),
    (error) => error.code === 'unsupported_video_format',
  );
  assert.equal(created, false);
});
