# Contributing to ForgeAI

Thanks for your interest in contributing. This is a small project — keep PRs focused and we'll move fast.

## Setup

```bash
git clone https://github.com/nachobr/uefnaigen.git
cd uefnaigen
pnpm install
pnpm build
pnpm test
```

Requires Node.js 20+ and pnpm (see [.nvmrc](.nvmrc) and [package.json](package.json) `packageManager`).

## Workflow

1. Open an issue first for non-trivial changes — alignment beats rework.
2. Create a branch off `main`.
3. Make your change. Match the existing style; don't refactor adjacent code.
4. Run `pnpm build && pnpm test && pnpm lint` — all must pass.
5. Open a PR with a clear description: what changed, why, how you verified it.

## Code Conventions

See [AGENTS.md](AGENTS.md) for the full rules. The short version:

- TypeScript strict mode, ESM, `.js` extensions on local imports.
- Zod schemas in `packages/schemas/` are the source of truth for data models.
- New LLM agents follow the pattern in `packages/ai/` (one class, one responsibility).
- Tests live in `src/__tests__/` per package, written with Vitest.
- No comments unless the code is genuinely non-obvious.
- Smallest correct change. Avoid speculative abstractions.

## Adding a New LLM Agent

1. Add the Zod schema to `packages/schemas/`.
2. Create the agent class in `packages/ai/src/<name>.ts` using `generateValidated()`.
3. Wire it into the pipeline in `packages/core/src/pipeline.ts` via `cache.getOrCompute(...)`.
4. Add a stage key to `STAGE_KEYS` in `packages/core/src/stage-cache.ts` if it should be resumable.
5. Add tests with a queued mock LLM (see `packages/core/src/__tests__/pipeline.test.ts`).

## Reporting Bugs

Include:
- Provider + model used (or `--provider ollama` + local model name)
- The full prompt
- Console output with `--verbose`
- Job ID (printed at the start of `uefn-ai create`)

## Questions

Open a GitHub Discussion or issue. No private support channels for now.
