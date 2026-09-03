# ad-package-assembler

Assembles advertising packages from a creative brief and submits them to a
channel's provider. Two channels: `meta`, which was already here, and `tiktok`,
which is what I added.

The original assignment text is preserved unchanged in [ASSIGNMENT.md](ASSIGNMENT.md).
The design I wrote before starting is in [ARCHITECTURE.md](ARCHITECTURE.md).

## Running it

Node 20 or newer. No API keys, nothing reaches the network, nothing spends money.

```
npm test            # the whole suite, both channels — 30 tests
npm run verify      # the regression check, see below
npm run run:meta    # assemble one package on meta
npm run run:tiktok  # assemble one package on tiktok
```

With Docker instead:

```
docker build -t ad-package-assembler .
docker run --rm ad-package-assembler                  # npm test
docker run --rm ad-package-assembler npm run verify
```

The `Dockerfile` is yours, unchanged. Its `CMD` is `npm test`, which picks up the
new suite for free because it globs `test/*.test.js`. I could not run this myself
— no Docker daemon on my machine — so unlike everything else here, take it as
reasoned rather than demonstrated. Every command above was run under plain Node.

## Dependencies

None, and I did not add any. The tests run on Node's own test runner, the check
is a plain script, and both were already available. Adding a framework would
have meant asking you to install something to review four hours of work.

## What I changed

| File | Change |
|---|---|
| `src/channels/tiktok.js` | new — the channel module |
| `src/channels/index.js` | one import, one registry entry |
| `package.json` | `run:tiktok` and `verify` scripts |
| `test/tiktok.channel.test.js` | new — 11 tests for the new channel |
| `scripts/verify.mjs` | new — the check below |

Nothing else. `assemble.js`, `brief.js`, `assets.js`, `text.js`, `run.js`, both
provider stubs and `channels/meta.js` are untouched, and so are all three
supplied test files.

## The check that proves meta still works

```
npm run verify
```

It asserts three things, and fails on any of them:

1. **The supplied tests are unmodified.** It sha256s `test/assemble.test.js`,
   `test/meta.channel.test.js` and `test/text.test.js` against the hashes of the
   files as I received them. Hash your own pristine copies to confirm those are
   the originals rather than something I rewrote to fit.
2. **meta is unchanged** — same payload, same package id `meta_pkg_1bvi8g5`,
   same 15 credits, same trimmed headline.
3. **tiktok works** — its own payload shape, package id `tt_pkg_0h7ljnn`, and 41
   credits.

Every id is derived from its input by the stubs, so it prints the same thing on
your machine as on mine.

**It fails when my change is reverted.** Deleting `src/channels/tiktok.js` and
restoring the original registry gives:

```
3. tiktok works
Error: unknown channel: tiktok. Known: meta
```

and exit code 1. I ran that before writing this down.

## Cost estimate

**Basis:** the `creditsConsumed` each stub reports, summed by `assemble()`, which
`PROVIDERS.md` says is the only place they are counted. I measured it rather than
multiplying by hand — 1000 assemblies per channel in one process, credits summed
per call.

| | meta | tiktok |
|---|---|---|
| uploads | 12 (1 asset) | 30 (2 assets) |
| transcode | — | 8 |
| create | 3 | 3 |
| **one package** | **15** | **41** |
| **1000 packages** | **15,000** | **41,000** |
| asset handling as a share of the run | 80.0% | 92.7% |

Running both channels off one brief is 56 credits, so 56,000 for a thousand.

**Which part becomes the problem first: uploading assets.** Two ways.

*On credits*, it is already most of the bill — 92.7% of a tiktok run is upload
plus transcode, and every one of those calls is paid again on the next run for
the same asset. The stub makes this visible: `uploadAsset` derives its `remoteId`
from the asset id, so the second upload of `hero-9x16` returns the identical
`tt_asset_03tcdr2` and still charges 15 credits. For a thousand packages built
from one brief's assets, the asset work is genuinely needed once:

| | naive | uploading each asset once |
|---|---|---|
| 1000 tiktok packages | 41,000 | 3,038 |

That is 93% of the spend buying nothing. It only holds where assets repeat — a
thousand packages from a thousand distinct assets has no reuse to find and 41,000
is the floor. Which of those two shapes real traffic has is the number I would
want before optimising anything.

*On time*, the stubs return instantly (1000 tiktok packages in 4ms), so nothing
is slow here. Against a real API the same step is still first to hurt: uploads
are the only calls carrying megabytes, and `assemble()` awaits them one at a time
in a `for...of`, so a two-asset channel is two serial round trips before the
package is even built.

## Known limitations

- **The caption is derived from `headline`.** The brief has no tiktok copy — see
  the open question in [ARCHITECTURE.md](ARCHITECTURE.md). It is an assumption,
  not a decision.
- **A failed run reports no cost.** `assemble()` records credits before checking
  `ok`, but `AssemblyError` carries only `(message, code, detail)`, so the `costs`
  array never escapes the failure path. The credits are spent and counted, then
  dropped.
- **No retries and no rollback.** A rejected cover upload leaves the video
  uploaded and charged. Re-running is safe only because the stub's ids are
  deterministic, so a retry re-derives the same `remoteId` instead of orphaning a
  second copy.
- **A `coverImageId` is only valid in the process that made it.** The stub tracks
  issued covers in a module-level `Set`, so anything that splits `prepare` from
  `createPackage` across processes would fail `cover_not_transcoded`.
- **The 60-second video check trusts an optional field.** `durationSeconds` is
  optional in the manifest and `undefined > 60` is `false`, so a video entry
  missing it passes the limit rather than failing closed.
- **One brief, one channel, one package per run.** No batching, no concurrency.

## One thing in the supplied code I would change

Every run pays to upload assets it has already uploaded. `assemble()` calls
`provider.uploadAsset` unconditionally for each selection, and the stub charges
full price each time while returning a `remoteId` it derives from the asset id —
so the second upload of the same video costs 15 credits and produces a byte-identical
result. At the volumes in the estimate above that is 93% of the bill for repeated
assets, which makes it the first thing worth money to fix, well ahead of anything
about payload shape. I did not change it because the fix does not fit inside this
task's constraints: a useful cache has to outlive the process, and there is
nowhere to put that here without adding infrastructure the brief rules out.
Faking it in `assemble.js` would also break the suite I was told to leave passing
— several tests in `test/assemble.test.js` upload the same asset id in the same
process and each asserts its own `uploadAsset` cost row, so a process-level cache
would make the second one disappear. That is shared logic doing exactly what it
should, and rewriting it to make room for my channel is the thing the brief says
it is watching for. It belongs in a follow-up with an asset-registry of its own.

## One thing my AI tools got wrong

My first `selectAssets` picked the cover with `find(a => a.kind === 'image')` and
left the ratio to the provider. The reasoning looked sound — `uploadAsset` does
reject a wrong video *format*, so it seemed fair to assume it validates images the
same way, and both the draft code and my architecture note said so. Reading
`src/providers/tiktok.js:43-45` showed the image branch checks `format` and never
touches `ratio`. I ran it rather than trust either reading:

```
upload still-16x9 -> {"ok":true,"remoteId":"tt_asset_0im5rgw","creditsConsumed":15}
transcodeCover   -> {"ok":false,"error":"cover_must_be_square","creditsConsumed":8}
```

So a wrong cover uploads cleanly, charges 15 credits, and only fails one call
later for 8 more — 23 credits to discover a mistake that costs nothing to catch
earlier. The brief supplies exactly that asset, `still-16x9`, so this was live and
not hypothetical. The ratio filter now sits in `selectAssets` where it is free,
`test/tiktok.channel.test.js` pins it, and the note's failure-modes section says
why. The general version of the lesson: a stub rejecting one bad input is not
evidence that it rejects the neighbouring one, and checking took less time than
writing the assumption down.
