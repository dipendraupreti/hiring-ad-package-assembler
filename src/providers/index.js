// The provider registry.
//
// Both stubs ship. There is a tiktok provider and no tiktok channel.

import { metaProvider } from './meta.js';
import { tiktokProvider } from './tiktok.js';

export const providers = {
  [metaProvider.id]: metaProvider,
  [tiktokProvider.id]: tiktokProvider,
};

export function providerFor(id) {
  const provider = providers[id];
  if (!provider) {
    throw new Error(`unknown provider: ${id}. Known: ${Object.keys(providers).join(', ')}`);
  }
  return provider;
}
