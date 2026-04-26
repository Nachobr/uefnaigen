# Patch Notes

Changes since `d61a49f` (`chore: remove all project source files, documentation, and configuration manifests`).

## Reliability Fixes

- Added `RetryAdapter` for LLM calls with retryable error detection, exponential backoff, and 120s timeout protection.
- Fixed structured-output repair loops so each pass reports the latest validation error instead of reusing the initial parse failure.
- Tightened output normalization so singleton arrays are only coerced for known numeric fields, preserving real array fields.
- Verse generation now fails loudly when a module cannot be generated instead of silently shipping partial output.
- Improved Ollama connection errors with preserved error causes.

## Pipeline Improvements

- Added per-job `StageCache` persistence under `~/.forgeai/stage-cache/<jobId>/`.
- Implemented `uefn-ai resume <jobId> --run` to continue generation from cached stages and package the resumed output.
- Added mock-LLM injection and non-persistent dry-run mode for pipeline, job, tier, and knowledge state.
- Switched battle arena balance validation to `ArenaSimulator` while keeping tycoon flows on `TycoonSimulator`.
- Wired `KnowledgeStore` context into systems, balance, device, Verse planning, and Verse generation prompts.

## Packaging And CLI

- Replaced shelling out to `tar` with the Node.js `tar` library for cross-platform archive creation.
- Doctor command now handles Ollama availability checks without swallowing control flow.
- Resume command now reports cached stage count and gives actionable resume instructions.

## Observability And Tooling

- Added Pino structured logging for pipeline stage events, enabled by verbose config or `FORGEAI_LOG_LEVEL`.
- Added ESLint flat config and Prettier config.
- Added `lint` scripts across apps and packages and installed lint/format dependencies.
- Removed unused imports/variables found by linting.

## Tests And Verification

- Added pipeline integration coverage with a queued mock LLM.
- Added StageCache progression tests and structured-output normalizer regression tests.
- Updated knowledge-store tests to avoid writing to the real user store.
- Verified with `pnpm lint` and `pnpm build && pnpm test`.
