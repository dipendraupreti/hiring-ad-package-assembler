# Providers

> **These are stubs. They are synthetic and they were written for this exercise.**
> The names are borrowed from real advertising channels and the behaviour is not. Do not read the
> real vendor documentation for either of them. **This file is the only specification that applies**,
> and the stubs in `src/providers/` are what enforces it.
>
> No stub reaches the network. No API key exists. Nothing here spends money.

## What every provider offers

| Method | Returns |
|---|---|
| `uploadAsset(asset)` | `{ ok, remoteId, creditsConsumed }` |
| `createPackage(payload)` | `{ ok, packageId, creditsConsumed }` |

A rejection is `{ ok: false, error, detail, creditsConsumed }`. **A rejected call still reports what
it consumed**, because the work happened before the rejection.

Every call reports `creditsConsumed`. `assemble()` records them and nothing else does, so the total
it returns is the total for the run.

## meta

**Cost**

| Call | Credits |
|---|---|
| `uploadAsset` | 12 each |
| `createPackage` | 3 |

**Payload.** Nested, snake_case. Unknown keys are rejected at any level.

```json
{
  "channel": "meta",
  "campaign_id": "string",
  "creative": {
    "primary_text": "string, 125 characters or fewer",
    "headline": "string, 40 characters or fewer",
    "description": "string, 60 characters or fewer, optional"
  },
  "media": [
    { "type": "video", "ratio": "9:16", "format": "mp4", "asset_id": "the remoteId from uploadAsset" }
  ],
  "link_url": "https URL"
}
```

**Rules**

- Exactly one media item. Video only, 9:16 only, mp4 only.
- `campaign_id`, `creative.primary_text`, `creative.headline` and `link_url` are required.
- `creative.description` is optional.

## tiktok

**There is no tiktok channel module. This provider ships without one.**

**Cost**

| Call | Credits |
|---|---|
| `uploadAsset` | 15 each |
| `transcodeCover` | 8 |
| `createPackage` | 3 |

**Payload.** Flat, camelCase. Unknown keys are rejected. **There is no description field of any
kind.**

```json
{
  "channel": "tiktok",
  "advertiserId": "string",
  "caption": "string, 100 characters or fewer",
  "videoAssetId": "the remoteId from uploadAsset",
  "coverImageId": "the coverImageId from transcodeCover, NOT the remoteId from uploadAsset",
  "musicId": "string",
  "landingPageUrl": "https URL"
}
```

**Rules**

- The video is 9:16 mp4 and **60 seconds or shorter**. A longer video is rejected at upload.
- A cover image is **required**. It is 1:1 and jpg.
- `transcodeCover(remoteId, asset)` takes an uploaded square image and returns a `coverImageId`.
  **`createPackage` rejects a `coverImageId` that never went through it.**
- `musicId` is required. The brief carries one.
- Every field above is required.

## Extra provider calls

`assemble()` runs upload, then the channel's optional `prepare`, then create. A channel that needs a
provider call the pipeline does not make puts it in `prepare` and reports its cost through `record`:

```js
async prepare({ brief, uploads, provider, record }) {
  const result = await provider.someCall(uploads.something.remoteId);
  record('someCall', result.creditsConsumed);
}
```

`test/assemble.test.js` pins this contract.
