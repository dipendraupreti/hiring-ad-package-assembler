// The asset index.
//
// No media is decoded anywhere in this repository. assets/MANIFEST.json is where
// an asset's kind, format, ratio and duration live, and it is the only source
// the channels and the provider stubs read.

import { readFileSync } from 'node:fs';

/**
 * @typedef {{ id: string, file: string, kind: 'video'|'image', format: string,
 *             ratio: string, durationSeconds?: number, bytes: number }} Asset
 */

export class AssetIndex {
  /** @param {Record<string, Omit<Asset,'id'>>} entries */
  constructor(entries) {
    /** @type {Map<string, Asset>} */
    this.byId = new Map(Object.entries(entries).map(([id, a]) => [id, { id, ...a }]));
  }

  /** @returns {Asset} */
  get(assetId) {
    const asset = this.byId.get(assetId);
    if (!asset) throw new Error(`unknown asset: ${assetId}`);
    return asset;
  }

  has(assetId) {
    return this.byId.has(assetId);
  }

  /** Every asset named by the brief, in brief order. @returns {Asset[]} */
  forBrief(brief) {
    return brief.assetIds.map((id) => this.get(id));
  }
}

export function loadAssetIndex(url = new URL('../assets/MANIFEST.json', import.meta.url)) {
  const manifest = JSON.parse(readFileSync(url, 'utf8'));
  return new AssetIndex(manifest.assets);
}
