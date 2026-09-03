// The tiktok channel.
//
// Same contract as meta.js. What differs is what the provider wants: a flat
// camelCase payload instead of a nested snake_case one, two assets instead of
// one, and a transcode call between upload and create.
//
// What the provider accepts is in PROVIDERS.md. That file is the specification.

import { truncate } from '../text.js';
import { AssemblyError } from '../assemble.js';

export const CAPTION_LIMIT = 100;

export const tiktok = {
  id: 'tiktok',

  // campaignId is already required of every brief by brief.js. These four are
  // the ones only this channel needs: three go straight into the payload and
  // headline is the caption source.
  requiredBriefFields: ['advertiserId', 'headline', 'landingPageUrl', 'musicId'],

  selectAssets(brief, assets) {
    const supplied = assets.forBrief(brief);

    const video = supplied.find(
      (asset) => asset.kind === 'video' && asset.ratio === '9:16' && asset.format === 'mp4',
    );
    if (!video) {
      throw new Error('tiktok needs one 9:16 mp4 video and the brief supplies none');
    }

    // The provider checks an image's format on upload but never its ratio, so a
    // 16:9 jpg uploads cleanly and only fails later inside transcodeCover. The
    // brief supplies exactly such an asset, so the ratio filter belongs here:
    // catching it now costs nothing, catching it there costs an upload plus a
    // transcode.
    const cover = supplied.find(
      (asset) => asset.kind === 'image' && asset.ratio === '1:1' && asset.format === 'jpg',
    );
    if (!cover) {
      throw new Error('tiktok needs one 1:1 jpg cover image and the brief supplies none');
    }

    return [
      { role: 'video', assetId: video.id },
      { role: 'cover', assetId: cover.id },
    ];
  },

  /**
   * createPackage rejects a cover id that never went through transcodeCover, so
   * the cover is transcoded here, between upload and create.
   *
   * assemble() does not inspect what prepare returns, so a rejected transcode
   * has to throw from here. Letting it through would put an undefined
   * coverImageId in the payload and lose the real reason in a missing_field
   * rejection one call later.
   */
  async prepare({ uploads, provider, record }) {
    const { remoteId, asset, assetId } = uploads.cover;

    const result = await provider.transcodeCover(remoteId, asset);
    record('transcodeCover', result.creditsConsumed, assetId);

    if (!result.ok) {
      throw new AssemblyError(`cover ${assetId} failed to transcode`, result.error, result.detail);
    }

    // assemble() hands the same uploads object to prepare and to buildPayload,
    // so the id it needs travels there rather than through a signature change.
    uploads.cover.coverImageId = result.coverImageId;
  },

  buildPayload(brief, uploads) {
    return {
      channel: 'tiktok',
      advertiserId: brief.advertiserId,
      caption: truncate(brief.headline, CAPTION_LIMIT),
      videoAssetId: uploads.video.remoteId,
      coverImageId: uploads.cover.coverImageId,
      musicId: brief.musicId,
      landingPageUrl: brief.landingPageUrl,
    };
  },
};
