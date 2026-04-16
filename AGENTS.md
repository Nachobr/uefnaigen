# ForgeAI — Agent Guidelines

Behavioral guidelines to reduce common LLM coding mistakes. Project-specific conventions follow.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

- State assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them — don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.
- Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it — don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

Always verify: `pnpm build && pnpm test` must pass before declaring work done.

---

## Project-Specific Conventions

### Architecture

- **Monorepo:** pnpm workspaces + Turborepo. 8 packages + 1 CLI app.
- **Language:** TypeScript, strict mode, ESM (`"type": "module"`).
- **Runtime:** Node.js 20+.
- **Schemas:** All data models defined as Zod schemas in `packages/schemas/src/`.
- **LLM agents:** All AI pipeline stages live in `packages/ai/src/`. Each agent is a class with a single responsibility.
- **Pipeline:** Orchestrated in `packages/core/src/pipeline.ts`. Stages run sequentially: Intent → Template → World → Layout → Systems → Balance → Devices → Verse → Validate → Package.

### Code Style

- **Imports:** Use `.js` extension for local imports (ESM requirement). Use `type` imports for type-only.
- **Naming:** PascalCase for classes/types/interfaces. camelCase for functions/variables. snake_case only in Verse output code.
- **Exports:** Re-export from `index.ts` in each package. No barrel files beyond the package entry.
- **Errors:** Throw typed errors, don't return error objects. Let pipeline handle failures.
- **No comments** unless the code is genuinely non-obvious. The code should be self-documenting.

### Testing

- **Framework:** Vitest. Config in root `vitest.config.ts` with `passWithNoTests: true`.
- **Test location:** `src/__tests__/*.test.ts` within each package.
- **Test style:** Use `describe`/`it`/`expect`. Group by feature. Name tests as behavior descriptions.
- **No mocking LLM calls** in unit tests. Test schemas, deterministic logic, and data transformations. LLM-dependent tests go in `evals/`.
- **Verify command:** `pnpm build && pnpm test` (runs all 10 packages).

### LLM Agent Pattern

Every AI agent follows this pattern:
```typescript
class AgentName {
  constructor(private llm: LLMAdapter) {}

  async methodName(input: InputType): Promise<OutputType> {
    // 1. Build system prompt (const, top of file)
    // 2. Build user message from structured input
    // 3. Call this.llm.chat() with appropriate temperature
    // 4. Parse JSON response (handle markdown code blocks as fallback)
    // 5. Validate with Zod schema
    // 6. Return typed result
  }
}
```

Temperature guidance from spec:
- Planning/creative stages: `0.4–0.5`
- Code/system stages: `0.1–0.3`
- Repair stages: `0.0–0.2`

### Adding a New Package

1. Create `packages/<name>/` with `package.json`, `tsconfig.json`, `src/index.ts`
2. Add `@forgeai/schemas` as dependency if using shared types
3. Add `"references"` to tsconfig if depending on other packages
4. Re-run `pnpm install` then verify `pnpm build`

### Key Files

| File | Purpose |
|---|---|
| `spec.md` | Full product specification — source of truth |
| `TODO.md` | Daily build plan with task tracking |
| `packages/schemas/src/` | All Zod schemas (7 files) |
| `packages/ai/src/` | All LLM agents (intent, template, world, layout, systems, balance, devices, verse, loot) |
| `packages/core/src/pipeline.ts` | Pipeline orchestrator |
| `packages/templates/src/builtin/` | Genre template definitions |
| `packages/balance/src/tycoon-simulator.ts` | Deterministic economy simulator |
| `apps/cli/src/` | CLI entry point + commands |

### Budget Awareness

- We operate on ~$10/day in AI tokens.
- Prefer deterministic logic over LLM calls where possible (e.g., template routing is keyword-based, not LLM-based).
- Keep LLM prompts focused — one well-crafted prompt > multiple retries.
- Always update `TODO.md` when completing a day's tasks.
