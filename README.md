# Part 2 — Extension

**Time: 4 to 6 hours. Deadline: 5 days from when you receive this.**

This repository assembles advertising packages from a creative brief and submits them to one
channel, `meta`. It works today.

**Add a second channel, `tiktok`.**

The two channels want different object shapes, different required fields and different assets. What
each provider accepts is in `PROVIDERS.md`, and that file is the specification. The `tiktok` provider
stub already ships. What is missing is the channel.

## Constraints

- **No rebuild.** `test/meta.channel.test.js` and `test/assemble.test.js` pass unchanged at the end.
  Rewriting shared logic so the new channel fits is the thing this is watching for.
- **Providers stay stubbed.** They return canned responses and report a simulated credit cost per
  call. Do not replace them, do not call a real API, do not add a dependency that reaches the
  network.
- **Assets are supplied.** Do not generate anything. `assets/MANIFEST.json` carries each asset's
  properties, and nothing in this repository decodes media.

## What to deliver

1. **An architecture note, 1 to 2 pages, written before you write code.** The high-level design, the
   data flow, the failure modes you expect, and anything you would want clarified before building
   this for real. **Send it when it is done rather than holding it to the end.**
2. **The working code**, running with a single command, both channels passing.
3. **A README** covering how to run it, dependencies, and known limitations.
4. **A cost estimate per run, with the basis stated.** The stub reports simulated credits. What does
   one package cost, what do a thousand cost, and which part of the pipeline becomes the problem
   first.
5. **A check that proves the existing channel still works**, that we can run ourselves. It has to
   fail when your change is reverted.
6. **One thing in the supplied code you would change before this ran for real, and why you did not
   change it now.** One paragraph. The code you were given is not above criticism and finding what
   is wrong with it is part of the job.
7. **One thing your AI tools got wrong on this task, and how you found out.** One paragraph. We
   build with AI here every day and we expect you to. What we want to see is the moment you stopped
   and checked, because that moment is most of the job.

**Send all of it back the way the assessment reached you**, as a zip or as a link to a repository of
your own. Your access here is read-only, so there is nothing to push back. Send the architecture note
on its own, as soon as it is done, rather than holding it until the rest is finished. Keep your own
copy of what you build, because this access is closed once the round finishes.

## Running it

No API keys. Nothing here reaches the network. Nothing spends money.

```
node --version     # 20 or newer
npm test
npm run run:meta
```

Or with Docker, if you would rather not install Node:

```
docker build -t ad-package-assembler .
docker run --rm ad-package-assembler
```

There are no dependencies to install. The tests run on Node's own test runner. Add a dependency if
you want one, and say why in the README.

## What is in here

| Path | What |
|---|---|
| `PROVIDERS.md` | What each provider accepts, and what each call costs. |
| `briefs/` | The creative brief. |
| `assets/MANIFEST.json` | Asset properties. The files beside it are placeholders. |
| `src/assemble.js` | The shared pipeline. Channel-agnostic. |
| `src/channels/` | One module per channel, plus the registry. |
| `src/providers/` | The stubs. Both channels have one. |
| `src/run.js` | The CLI. |
| `test/` | The suite. It passes. |

## Notes

Every brief, asset, account and id in this repository is synthetic and was written for this exercise.
Nothing here shares code with any system we run.
