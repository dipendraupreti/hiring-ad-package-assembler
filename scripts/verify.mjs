// The regression check. Run it with `npm run verify`.
//
// It proves three things:
//
//   1. the supplied test files are byte-identical to the ones I was given, so
//      "the existing suite passes unchanged" means unchanged and not adjusted
//   2. meta still assembles the launch brief into the same payload, the same
//      package id and the same 15 credits it did before I touched anything
//   3. tiktok assembles the same brief into its own shape for 41 credits
//
// Check 3 is what makes this fail if my change is reverted: with no tiktok
// channel the registry has nothing to return and the run stops there.
//
// Every id below is derived from its input by the stubs, so these are the same
// numbers on your machine as on mine.

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { loadBrief } from '../src/brief.js';
import { loadAssetIndex } from '../src/assets.js';
import { assemble } from '../src/assemble.js';
import { channelFor } from '../src/channels/index.js';
import { providerFor } from '../src/providers/index.js';

const BRIEF = new URL('../briefs/launch-2026-08.json', import.meta.url);

// sha256 of the files exactly as they were supplied. Hash your own pristine
// copy to confirm these are the originals rather than something I rewrote.
const SUPPLIED_TESTS = {
  'test/assemble.test.js': '01d4b2e914ad202b04cbf0cf2c95730bcd3681925a3ae6bb99f77648747b1e97',
  'test/meta.channel.test.js': 'ef3804b40724a09cae68aa2a438cb61b4bf4aab28e29dcdcd21f15d129a7af38',
  'test/text.test.js': '744c1414f22212e4f9feff5783eaae36f5ae4992495a11eb62e53b88fef3a684',
};

let failures = 0;

function check(label, actual, expected) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) {
    process.stdout.write(`  ok    ${label}\n`);
    return;
  }
  failures += 1;
  process.stdout.write(`  FAIL  ${label}\n         expected ${e}\n         actual   ${a}\n`);
}

function section(title) {
  process.stdout.write(`\n${title}\n`);
}

async function assembleOn(channelId) {
  return assemble({
    brief: loadBrief(BRIEF),
    channel: channelFor(channelId),
    provider: providerFor(channelId),
    assets: loadAssetIndex(),
  });
}

section('1. the supplied tests are unmodified');
for (const [file, expected] of Object.entries(SUPPLIED_TESTS)) {
  const url = new URL(`../${file}`, import.meta.url);
  const actual = createHash('sha256').update(readFileSync(url)).digest('hex');
  check(file, actual.slice(0, 16), expected.slice(0, 16));
}

section('2. meta is unchanged');
{
  const result = await assembleOn('meta');

  check('package id', result.packageId, 'meta_pkg_1bvi8g5');
  check('payload keys', Object.keys(result.payload).sort(), [
    'campaign_id',
    'channel',
    'creative',
    'link_url',
    'media',
  ]);
  check('creative keys', Object.keys(result.payload.creative).sort(), [
    'description',
    'headline',
    'primary_text',
  ]);
  check('headline is trimmed to 40', result.payload.creative.headline, 'Grip that holds the corner, every');
  check('one media item, the vertical video', result.payload.media, [
    { type: 'video', ratio: '9:16', format: 'mp4', asset_id: 'meta_asset_03tcdr2' },
  ]);
  check('provider calls', result.costs.map((row) => `${row.call}:${row.credits}`), [
    'uploadAsset:12',
    'createPackage:3',
  ]);
  check('total credits', result.credits, 15);
}

section('3. tiktok works');
{
  const result = await assembleOn('tiktok');

  check('package id', result.packageId, 'tt_pkg_0h7ljnn');
  check('payload keys', Object.keys(result.payload).sort(), [
    'advertiserId',
    'caption',
    'channel',
    'coverImageId',
    'landingPageUrl',
    'musicId',
    'videoAssetId',
  ]);
  check('no description field', 'description' in result.payload, false);
  check('caption', result.payload.caption, 'Grip that holds the corner, every single corner');
  check('video asset id', result.payload.videoAssetId, 'tt_asset_03tcdr2');
  check('cover id came from transcodeCover', result.payload.coverImageId, 'tt_cover_13zmasg');
  check('provider calls', result.costs.map((row) => `${row.call}:${row.credits}`), [
    'uploadAsset:15',
    'uploadAsset:15',
    'transcodeCover:8',
    'createPackage:3',
  ]);
  check('total credits', result.credits, 41);
}

section(failures === 0 ? 'PASS — both channels behave as recorded' : `FAIL — ${failures} check(s) failed`);
process.exit(failures === 0 ? 0 : 1);
