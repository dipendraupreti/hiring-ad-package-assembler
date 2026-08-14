// The meta channel.
//
// A channel module is four things:
//
//   id                    matches the provider id
//   requiredBriefFields   brief fields this channel cannot build without
//   selectAssets          which of the brief's assets this channel uploads, and
//                         what role each one plays
//   buildPayload          the object this channel's provider expects
//
// and one optional thing:
//
//   prepare               extra provider calls between upload and create
//
// What each provider accepts is in PROVIDERS.md. That file is the specification.

import { truncate } from '../text.js';

export const HEADLINE_LIMIT = 40;
export const PRIMARY_TEXT_LIMIT = 125;

export const meta = {
  id: 'meta',

  requiredBriefFields: ['campaignId', 'primaryText', 'headline', 'landingPageUrl'],

  selectAssets(brief, assets) {
    const video = assets
      .forBrief(brief)
      .find((asset) => asset.kind === 'video' && asset.ratio === '9:16' && asset.format === 'mp4');

    if (!video) {
      throw new Error('meta needs one 9:16 mp4 video and the brief supplies none');
    }
    return [{ role: 'video', assetId: video.id }];
  },

  buildPayload(brief, uploads) {
    const payload = {
      channel: 'meta',
      campaign_id: brief.campaignId,
      creative: {
        primary_text: truncate(brief.primaryText, PRIMARY_TEXT_LIMIT),
        headline: truncate(brief.headline, HEADLINE_LIMIT),
      },
      media: [
        {
          type: 'video',
          ratio: uploads.video.asset.ratio,
          format: uploads.video.asset.format,
          asset_id: uploads.video.remoteId,
        },
      ],
      link_url: brief.landingPageUrl,
    };

    if (brief.description) {
      payload.creative.description = truncate(brief.description, 60);
    }
    return payload;
  },
};
