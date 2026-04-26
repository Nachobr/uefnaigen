# PATCHNOTES Review — Day 15 Reliability Sweep

Honest review of the changes documented in [PATCHNOTES.md](../PATCHNOTES.md).

## What's Strong

- The reliability triad — `RetryAdapter` (`packages/ai/src/retry-adapter.ts`), `StageCache` (`packages/core/src/stage-cache.ts`), and the `generateValidated()` repair-loop fix in `packages/ai/src/structured-output.ts` — directly attacks the three failure modes that hurt this kind of LLM pipeline most: transient API flakiness, expensive re-runs, and stale repair signals. These are high-leverage, low-surface changes.
- Failing loudly on Verse generation (instead of silently shipping partial output) is the right call for a tool whose output is consumed downstream by UEFN — partial scaffolds are worse than a clear error.
- `dryRun` flowing through job/tier/stage/knowledge persistence is great for testability and unblocks the new mock-LLM pipeline tests.
- Replacing the `tar` shell-out with Node `tar` removes a real Windows-portability footgun in `packages/packager/src/scaffold-packager.ts`.
- ArenaSimulator dispatch in `packages/core/src/pipeline.ts` finally makes battle_arena balance numbers meaningful instead of misapplying tycoon math.

## Worth Scrutinizing

- `pipeline.ts` grew by ~300 lines and is doing a lot: orchestration, caching, knowledge context, simulator dispatch, Verse loop, error aggregation. It's still readable, but the `cache.load(...) ?? await (async () => { ... })()` pattern repeats 8+ times — a small `cache.getOrCompute(stage, fn)` helper would cut noise and make stage names harder to typo.
- `StageCache.lastCompletedStage` is positional and breaks silently if stage keys ever change. Worth a comment tying it to the pipeline stage list, or generating both from one source.
- `RetryAdapter` classifies retryability by regex on error messages — fragile across providers. Fine for now, but if a provider ever returns a structured error, prefer that.
- The repair loop's "final attempt" at the end of `structured-output.ts` calls `schema.parse(candidate)` to throw — that's correct, but the thrown `ZodError` won't include stage context. Wrapping it (e.g. ``throw new Error(`${stage} failed after ${maxPasses} repair passes: ${...}`)``) would make pipeline failures much easier to diagnose.
- `withKnowledgeContext` in `packages/ai/src/prompt-context.ts` is a one-liner — reasonable, but make sure it isn't ballooning prompts in practice (the 1200-token default per agent across 5 agents adds up fast against the $10/day budget).
- The 778-line `pnpm-lock.yaml` churn (Pino, ESLint, tar, etc.) is the cost of paying down this debt — fine, but worth a `pnpm dedupe` pass before tagging.

## Patch Notes Themselves

Clear, grouped sensibly, and they avoid the common trap of listing files instead of behaviors. One nit: "Verified with `pnpm lint` and `pnpm build && pnpm test`" is a process note — fine to keep, but if you intend this as a release artifact rather than an internal log, drop it or move to a "How this was validated" footer.

## Net Assessment

This is a high-quality reliability sweep — exactly the kind of work that earns the `v0.2.0-beta` tag. The main risk going forward is `pipeline.ts` becoming the place where every future feature lands; extract the stage-runner abstraction before it doubles again.
