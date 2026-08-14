// The meta provider stub. Costs and rules are in PROVIDERS.md.

import { stableId, reject, unknownField, isString, isHttpsUrl } from './_stub.js';

export const UPLOAD_CREDITS = 12;
export const CREATE_CREDITS = 3;

const HEADLINE_LIMIT = 40;
const PRIMARY_TEXT_LIMIT = 125;
const DESCRIPTION_LIMIT = 60;

const TOP_LEVEL = ['channel', 'campaign_id', 'creative', 'media', 'link_url'];
const CREATIVE = ['primary_text', 'headline', 'description'];
const MEDIA_ITEM = ['type', 'ratio', 'format', 'asset_id'];

export const metaProvider = {
  id: 'meta',

  async uploadAsset(asset) {
    if (asset.kind === 'video' && asset.format !== 'mp4') {
      return reject('unsupported_video_format', { format: asset.format }, UPLOAD_CREDITS);
    }
    return {
      ok: true,
      remoteId: stableId('meta_asset', asset.id),
      creditsConsumed: UPLOAD_CREDITS,
    };
  },

  async createPackage(payload) {
    const bad = (error, detail) => reject(error, detail, CREATE_CREDITS);

    if (payload?.channel !== 'meta') return bad('wrong_channel', { channel: payload?.channel });

    const extra = unknownField(payload, TOP_LEVEL, 'payload');
    if (extra) return bad('unknown_field', { field: extra });

    if (!isString(payload.campaign_id)) return bad('missing_field', { field: 'campaign_id' });
    if (!isHttpsUrl(payload.link_url)) return bad('missing_field', { field: 'link_url' });

    const creative = payload.creative;
    if (!creative || typeof creative !== 'object') return bad('missing_field', { field: 'creative' });

    const extraCreative = unknownField(creative, CREATIVE, 'creative');
    if (extraCreative) return bad('unknown_field', { field: extraCreative });

    if (!isString(creative.primary_text)) return bad('missing_field', { field: 'creative.primary_text' });
    if (!isString(creative.headline)) return bad('missing_field', { field: 'creative.headline' });

    if (creative.headline.length > HEADLINE_LIMIT) {
      return bad('field_too_long', { field: 'creative.headline', limit: HEADLINE_LIMIT });
    }
    if (creative.primary_text.length > PRIMARY_TEXT_LIMIT) {
      return bad('field_too_long', { field: 'creative.primary_text', limit: PRIMARY_TEXT_LIMIT });
    }
    if (creative.description !== undefined && creative.description.length > DESCRIPTION_LIMIT) {
      return bad('field_too_long', { field: 'creative.description', limit: DESCRIPTION_LIMIT });
    }

    if (!Array.isArray(payload.media) || payload.media.length !== 1) {
      return bad('media_count', { expected: 1, got: payload.media?.length ?? 0 });
    }
    const item = payload.media[0];
    const extraMedia = unknownField(item, MEDIA_ITEM, 'media[0]');
    if (extraMedia) return bad('unknown_field', { field: extraMedia });

    if (item.type !== 'video') return bad('unsupported_media_type', { type: item.type });
    if (item.ratio !== '9:16') return bad('unsupported_ratio', { ratio: item.ratio });
    if (item.format !== 'mp4') return bad('unsupported_video_format', { format: item.format });
    if (!isString(item.asset_id)) return bad('missing_field', { field: 'media[0].asset_id' });

    return {
      ok: true,
      packageId: stableId('meta_pkg', `${payload.campaign_id}:${item.asset_id}`),
      creditsConsumed: CREATE_CREDITS,
    };
  },
};
