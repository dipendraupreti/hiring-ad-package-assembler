// CLI.
//
//   node src/run.js --channel meta --brief briefs/launch-2026-08.json
//
// Prints the payload that was sent, every provider call with what it consumed,
// and the total for the run.

import { loadBrief } from './brief.js';
import { loadAssetIndex } from './assets.js';
import { channelFor } from './channels/index.js';
import { providerFor } from './providers/index.js';
import { assemble } from './assemble.js';

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i];
    if (!key?.startsWith('--')) throw new Error(`expected a --flag, got: ${key}`);
    args[key.slice(2)] = argv[i + 1];
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.channel || !args.brief) {
    process.stderr.write('usage: node src/run.js --channel <id> --brief <path>\n');
    process.exit(2);
  }

  const brief = loadBrief(args.brief);
  const assets = loadAssetIndex();
  const channel = channelFor(args.channel);
  const provider = providerFor(args.channel);

  const result = await assemble({ brief, channel, provider, assets });

  process.stdout.write(`channel:    ${result.channel}\n`);
  process.stdout.write(`packageId:  ${result.packageId}\n\n`);
  process.stdout.write(`payload:\n${JSON.stringify(result.payload, null, 2)}\n\n`);
  process.stdout.write('provider calls:\n');
  for (const row of result.costs) {
    const note = row.note ? `  (${row.note})` : '';
    process.stdout.write(`  ${String(row.credits).padStart(4)} credits  ${row.call}${note}\n`);
  }
  process.stdout.write(`\ntotal: ${result.credits} credits for one package on ${result.channel}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.name ?? 'Error'}: ${error.message}\n`);
  if (error.detail) process.stderr.write(`${JSON.stringify(error.detail, null, 2)}\n`);
  process.exit(1);
});
