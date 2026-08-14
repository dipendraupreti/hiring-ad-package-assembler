// The tiktok provider stub. Costs and rules are in PROVIDERS.md.
//
// This stub ships complete. There is no channel module for it yet.

import { stableId, reject, unknownField, isString, isHttpsUrl } from './_stub.js';

export const UPLOAD_CREDITS = 15;
export const TRANSCODE_CREDITS = 8;
export const CREATE_CREDITS = 3;

const CAPTION_LIMIT = 100;
const MAX_VIDEO_SECONDS = 60;

const TOP_LEVEL = [
  'channel',
  'advertiserId',
  'caption',
  'videoAssetId',
  'coverImageId',
  'musicId',
  'landingPageUrl',
];

/** Cover ids this stub has issued, so createPackage can tell a transcoded cover from a raw upload. */
const transcoded = new Set();

export const tiktokProvider = {
  id: 'tiktok',

  async uploadAsset(asset) {
    if (asset.kind === 'video') {
      if (asset.format !== 'mp4') {
        return reject('unsupported_video_format', { format: asset.format }, UPLOAD_CREDITS);
      }
      if (asset.durationSeconds > MAX_VIDEO_SECONDS) {
        return reject(
          'video_too_long',
          { durationSeconds: asset.durationSeconds, limit: MAX_VIDEO_SECONDS },
          UPLOAD_CREDITS,
        );
      }
    }
    if (asset.kind === 'image' && asset.format !== 'jpg') {
      return reject('unsupported_image_format', { format: asset.format }, UPLOAD_CREDITS);
    }
    return {
      ok: true,
      remoteId: stableId('tt_asset', asset.id),
      creditsConsumed: UPLOAD_CREDITS,
    };
  },

  /**
   * Turn an uploaded square image into a cover. Required before createPackage
   * will accept it. Returns a different id from the one it was given.
   */
  async transcodeCover(remoteId, asset) {
    if (!isString(remoteId)) {
      return reject('missing_field', { field: 'remoteId' }, TRANSCODE_CREDITS);
    }
    if (asset?.ratio !== '1:1') {
      return reject('cover_must_be_square', { ratio: asset?.ratio }, TRANSCODE_CREDITS);
    }
    const coverImageId = stableId('tt_cover', remoteId);
    transcoded.add(coverImageId);
    return { ok: true, coverImageId, creditsConsumed: TRANSCODE_CREDITS };
  },

  async createPackage(payload) {
    const bad = (error, detail) => reject(error, detail, CREATE_CREDITS);

    if (payload?.channel !== 'tiktok') return bad('wrong_channel', { channel: payload?.channel });

    const extra = unknownField(payload, TOP_LEVEL, 'payload');
    if (extra) return bad('unknown_field', { field: extra });

    for (const field of ['advertiserId', 'caption', 'videoAssetId', 'coverImageId', 'musicId']) {
      if (!isString(payload[field])) return bad('missing_field', { field });
    }
    if (!isHttpsUrl(payload.landingPageUrl)) return bad('missing_field', { field: 'landingPageUrl' });

    if (payload.caption.length > CAPTION_LIMIT) {
      return bad('field_too_long', { field: 'caption', limit: CAPTION_LIMIT });
    }

    if (!transcoded.has(payload.coverImageId)) {
      return bad('cover_not_transcoded', { coverImageId: payload.coverImageId });
    }

    return {
      ok: true,
      packageId: stableId('tt_pkg', `${payload.advertiserId}:${payload.videoAssetId}`),
      creditsConsumed: CREATE_CREDITS,
    };
  },
};
