// The shared assembly pipeline.
//
// This file knows nothing about any particular channel. It runs the same four
// steps for every channel and keeps one cost record across all of them:
//
//   1. check the brief fields this channel declares it needs
//   2. upload the assets this channel selects, one provider call each
//   3. let the channel make any extra provider calls it needs (optional)
//   4. build the payload and create the package
//
// Every provider call reports what it consumed. Those numbers are recorded here
// and nowhere else, so the total is the total.

import { requireBriefFields } from './brief.js';

export class AssemblyError extends Error {
  constructor(message, code, detail) {
    super(message);
    this.name = 'AssemblyError';
    this.code = code ?? 'assembly_failed';
    this.detail = detail;
  }
}

/**
 * @typedef {{ call: string, credits: number, note?: string }} CostRow
 * @typedef {{ role: string, assetId: string, remoteId: string,
 *             asset: import('./assets.js').Asset }} Upload
 */

/**
 * @param {{
 *   brief: object,
 *   channel: object,
 *   provider: object,
 *   assets: import('./assets.js').AssetIndex
 * }} input
 */
export async function assemble({ brief, channel, provider, assets }) {
  if (!channel || !provider) throw new AssemblyError('assemble needs a channel and a provider');
  if (channel.id !== provider.id) {
    throw new AssemblyError(
      `channel ${channel.id} was given the ${provider.id} provider`,
      'channel_provider_mismatch',
    );
  }

  /** @type {CostRow[]} */
  const costs = [];
  const record = (call, credits, note) => {
    if (!Number.isFinite(credits)) {
      throw new AssemblyError(`provider call ${call} reported no credit cost`, 'cost_not_reported');
    }
    costs.push(note ? { call, credits, note } : { call, credits });
  };

  // 1. brief
  requireBriefFields(brief, channel.requiredBriefFields ?? []);

  // 2. assets
  const selections = channel.selectAssets(brief, assets);
  if (!Array.isArray(selections) || selections.length === 0) {
    throw new AssemblyError(`channel ${channel.id} selected no assets`, 'no_assets_selected');
  }

  /** @type {Record<string, Upload>} */
  const uploads = {};
  for (const selection of selections) {
    const asset = assets.get(selection.assetId);
    const result = await provider.uploadAsset(asset);
    record('uploadAsset', result.creditsConsumed, selection.assetId);
    if (!result.ok) {
      throw new AssemblyError(`upload of ${selection.assetId} failed`, result.error, result);
    }
    uploads[selection.role] = { role: selection.role, assetId: asset.id, remoteId: result.remoteId, asset };
  }

  // 3. anything else this channel needs from the provider
  if (typeof channel.prepare === 'function') {
    await channel.prepare({ brief, uploads, provider, record });
  }

  // 4. payload
  const payload = channel.buildPayload(brief, uploads);
  const created = await provider.createPackage(payload);
  record('createPackage', created.creditsConsumed);
  if (!created.ok) {
    throw new AssemblyError(
      `${channel.id} rejected the package: ${created.error}`,
      created.error,
      created.detail,
    );
  }

  return {
    channel: channel.id,
    packageId: created.packageId,
    payload,
    costs,
    credits: costs.reduce((total, row) => total + row.credits, 0),
  };
}
