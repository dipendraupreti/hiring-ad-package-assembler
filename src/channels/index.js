// The channel registry.
//
// Adding a channel means adding a module beside meta.js and one line here.

import { meta } from './meta.js';

export const channels = {
  [meta.id]: meta,
};

export function channelFor(id) {
  const channel = channels[id];
  if (!channel) {
    throw new Error(`unknown channel: ${id}. Known: ${Object.keys(channels).join(', ')}`);
  }
  return channel;
}
