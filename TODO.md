# ForgeAI — Daily Build Plan

**Budget:** ~$10/day in AI tokens (replenishes every 24h)
**Target:** M0 MVP in 10 working days, then M1 Beta over 4 more weeks

---

## Day 1 — Monorepo Foundation ($10) ✅
- [x] Init pnpm workspace + Turborepo
- [x] Root `package.json`, `pnpm-workspace.yaml`, `turbo.json`
- [x] Shared `tsconfig.base.json` with strict mode + composite
- [x] Create package stubs: all 8 packages + CLI app
- [x] Each package: `package.json`, `tsconfig.json`, `src/index.ts`
- [x] Install shared deps: `typescript`, `zod`, `vitest`, `pino`, `commander`
- [x] Verify `pnpm build` passes all 10 packages
- [x] `.gitignore`, `.nvmrc` (Node 20)
- [x] CLI skeleton with `create`, `verse`, `templates`, `doctor` commands
- [x] All Zod schemas from spec §7 (pulled forward from Day 2)
- [x] Core stubs: Pipeline, JobManager, LLM adapter, TemplateRegistry, PrefabCatalog, VerseEmitter, Validators, BalanceSimulator, Packager

## Day 2 — Schemas Package + Config System ($10) ✅
- [x] `packages/schemas`: All Zod schemas (done in Day 1)
- [x] JSON Schema export utility (`zod-to-json-schema`) — exports all 15 schemas
- [x] Job lifecycle enum (done in Day 1)
- [x] Config schema + config loader (`~/.forgeai/config.yaml` + env vars + CLI flags merge)
- [x] Unit tests: 37 tests across schemas, config-loader, and JSON Schema export — all passing

## Day 3 — CLI Skeleton + Intent Extractor ($10) ✅
- [x] CLI skeleton (done in Day 1)
- [x] `packages/ai`: Anthropic adapter (Claude SDK) + OpenAI adapter (GPT SDK)
- [x] Provider factory with config-driven selection
- [x] **Intent Extractor agent** (pipeline stage 1)
  - [x] LLM-based prompt → NormalizedBrief JSON (genre, coreLoop, sessionLength, features, etc.)
  - [x] Keyword-based genre detection fallback from spec §11
  - [x] Genre override support
- [x] NormalizedBrief Zod schema with defaults
- [x] Tests: 11 tests — keyword detection (8 cases) + brief schema validation (3 cases)
- [x] Global `vitest.config.ts` with passWithNoTests
- [x] Full monorepo: 20/20 tasks pass (build + test)

## Day 4 — Template Registry + Tycoon Base Template ($10) ✅
- [x] `tycoon/base` template — 12 allowed device types, 7 required Verse modules, 5 zone purposes
- [x] `tycoon/lumber-mill` template extending base — lumber-specific prefab tags, NPC workers, ResourceNodeController
- [x] `createDefaultRegistry()` factory with pre-loaded built-in templates
- [x] Inheritance merge: deduped arrays for modules/devices/tags, child overrides for layout rules
- [x] Tests: 9 tests — registry CRUD, inheritance resolution, merge dedup, layout override
- [x] **Template Router agent** (pipeline stage 2) — deterministic, keyword-based matching

## Day 5 — World Planner + Layout Planner ($10) ✅
- [x] **Template Router** (stage 2) — subGenre match → keyword match → genre/base fallback
- [x] **World Planner** (stage 3) — LLM-based: brief + template → WorldDesign (zones, progression, pacing)
- [x] **Layout Planner** (stage 4a) — LLM-based: WorldDesign → LayoutSpec (coordinates, footprints, spawns)
- [x] Pipeline orchestrator wired: stages 1→2→3→4a with progress callbacks
- [x] Job state machine transitions: draft → planning → generated
- [x] WorldDesign Zod schema with sessionPacing, progressionBeats, zone tiers
- [x] Tests: 6 template-router tests — 63 total tests passing

## Day 6 — Systems Planner + Balance Planner ($10) ✅
- [x] **Systems Planner** (stage 4b) — LLM-based: economy, devices, game rules from world design
- [x] **Balance Planner** (stage 4c) — LLM-based: balanced EconomySpec with targetCurves
- [x] `packages/balance`: Deterministic tycoon economy simulator
  - [x] Income/sink curve simulation (per_action, per_second, per_minute)
  - [x] Pace band violation detection (first purchase, automation, prestige, stagnation)
  - [x] Auto-adjust generator rates to hit targets
- [x] Pipeline wired through stages 1→5 with balance auto-adjustment
- [x] SystemsDesign Zod schema (economy, devices, gameRules)
- [x] Tests: 10 simulator tests — 73 total tests passing

## Day 7 — Device Mapper + Verse Planner ($10) ✅
- [x] **Device Mapper** (stage 6) — LLM-based: layout + systems → concrete DeviceInstance[] with transforms/channels
- [x] **Verse Planner** (stage 7) — LLM-based: systems + devices → ModulePlan (modules, methods, editable fields, deps)
- [x] **Loot Generator** — LLM-based: per-zone loot tables with weighted rarity distribution
- [x] Pipeline wired through all 7 stages with progress callbacks
- [x] ModulePlan + LootTable Zod schemas
- [x] Tests: 6 new tests (ModulePlan, LootTable validation) — 79 total passing

## Day 8 — Verse IR + Emitter + Copilot ($10) ✅
- [x] Verse emitter: AST → `.verse` source code with proper indentation
  - [x] `using` imports, class definitions, `@editable` fields, method signatures
  - [x] Multiline statement support, empty body TODO placeholders
- [x] **Verse Generator** agent — LLM-based: ModulePlan → VerseModule AST per module
- [x] **Verse Copilot** — 3 modes: `generate`, `fix`, `explain`
- [x] CLI wired: `uefn-ai verse generate|fix|explain` with real LLM calls
- [x] Tests: 12 emitter tests — 91 total passing

## Day 9 — Validator Framework + Repair Loop ($10) ✅
- [x] **Structural validator** — unique device/zone/module IDs, spawn points, currencies exist
- [x] **Schema validator** — Zod validation on layout, economy, devices, scripts
- [x] **Cross-reference validator** — devices↔zones, generators↔currencies, spawn↔zones, zone gate prerequisites
- [x] `runAllValidators()` runner — executes all 3 validators
- [x] **Repair loop** — LLM-based: validate → parse errors → patch → revalidate (max 3 passes)
- [x] `uefn-ai validate <project-dir>` CLI command wired
- [x] Tests: 12 validator tests — 103 total passing

## Day 10 — Packager + Docs Generation ($10) ✅
- [x] `packages/packager`: Full scaffold export
  - [x] Directories: manifests/, Verse/, docs/, .ai/planner/, templates/, exports/
  - [x] `worldgen.config.yaml`
  - [x] All JSON manifests: world.project, layout.grid, device_manifest, economy, loot_tables, progression
- [x] Doc generators (7 files):
  - [x] `README.md`, `README-UEFN-IMPORT.md`
  - [x] `DESIGN-SUMMARY.md`, `SYSTEMS-OVERVIEW.md`, `DEVICE-WIRING.md`
  - [x] `QA-CHECKLIST.md`, `BALANCE-REPORT.md`
- [x] `.ai/` directory: planner artifacts (world-design, module-plan, balance)
- [x] Verse files output from emitter

## Day 11 — End-to-End Testing + Polish ($10) ✅
- [x] 5 golden tycoon prompts in `evals/golden-prompts/`
- [x] `--seed` flag wired (random default if not provided)
- [x] `--dry-run` flag wired (plan only, no writes)
- [x] CLI progress output: `[N/8] Stage...` format matching spec §8.3
- [x] `--json` machine-readable output mode
- [x] Create command: full error handling, next-steps output, job ID display
- [x] **Groq adapter** (`groq-sdk`) — `llama-3.3-70b-versatile` via GROQ_API_KEY
- [x] **Ollama adapter** — local models via `http://localhost:11434`
- [x] **FallbackAdapter** — tries Groq → Anthropic → OpenAI → local `qwen3.5:9b` (auto-pulls 6.6GB on first use)
- [x] `createAdapterWithFallback()` factory — Leo AI-style cascading
- [x] Doctor command shows Groq + Ollama status

## Day 12 — Variant Zones + Prefab System ($10) ✅
- [x] Starter catalog: 24 prefabs across 6 categories (foliage, building, industrial, decor, combat, npc_set)
- [x] Tag-based + category-based lookup
- [x] **Variant Zone Generator** — LLM-based: generates 2-4 variants per resource/combat zone
- [x] `uefn-ai prefabs list` CLI with `--tag`, `--category`, `--json` filters
- [x] Tests: 7 prefab catalog tests — 110 total passing

## Day 13 — More Templates + Robustness ($10) ✅
- [x] Author `tycoon/mining-empire` template
- [x] Author `battle_arena/base` template
  - [x] Round manager, spawn logic, loadout config, scoring
- [x] Author `adventure/base` template
  - [x] Hub + quest zones, quest chains, enemy waves, checkpoints
- [x] Expand golden prompts: 5 arena + 5 adventure prompts
- [x] Run eval on 15 total prompts, track pass rate
- [x] Improve repair loop based on common failure patterns
  - [x] Deterministic pre-fixes (duplicate IDs, unknown zone refs)
  - [x] Error categorization for better LLM prompting
- [x] Add `--budget <usd>` flag to cap inference costs
  - [x] `BudgetAdapter` wrapper with cost tracking + `BudgetExceededError`
  - [x] Wired into pipeline via `config.budgetUsd`

## Day 14 — MVP Wrap + Packaging ($10) ✅
- [x] E2E eval runner: `scripts/run-eval.ts` — 15/15 prompts pass (100%)
- [x] Job resume: `uefn-ai resume <jobId>` with file-based persistence in `~/.forgeai/jobs/`
- [x] Cache key implementation: SHA-256 of prompt + template + model + schema + seed → 16-char hex
- [x] Eval on 15 golden prompts — 100% genre detection + template routing pass rate
- [x] Determinism tests: 3 tests verify same seed → identical cache keys (AC7)
- [x] NPM packaging: `uefn-ai@0.1.0-mvp` with `bin`, `files`, `engines` — `npx uefn-ai` ready
- [x] Templates `list` + `inspect` commands wired to real registry
- [x] Final README with install + quickstart + full command reference
- [x] 117 tests passing across 10 packages
- [x] Tag `v0.1.0-mvp` — present at `2a98d4f`

---

## Post-MVP (M1 Beta — Days 15–42, ~$10/day)

### Week 3 — Desktop Shell ✅
- [x] Electron + React + Vite app scaffold (`apps/desktop/`)
- [x] Project browser (list/open generated projects)
- [x] Prompt wizard UI (genre selection, prompt textarea)
- [x] Layout preview (2D zone grid visualization)
- [x] **Google Gemini adapter** — `@google/genai` SDK, `GOOGLE_API_KEY` env var, `--provider google`
- [x] Fallback chain updated: Groq → Google → Anthropic → OpenAI → Ollama
- [x] 11 packages build, 117 tests passing

### Week 4 — Prefab Expansion ✅
- [x] Prefab catalog ingestion from user directories (`loadUserCatalog()`)
  - [x] `findByCategory`, `findByGenre`, `merge`, `size` methods on PrefabCatalog
- [x] Variant zone visual preview (desktop LayoutPreview with zone inspector + variant selector)
- [x] `tycoon/lumber-mill` + `tycoon/mining-empire` template polish (richer summaries, more tags/systems)
- [x] Prefab/theme packs: forest (10 prefabs) + industrial (10 prefabs) — 44 total with starter
- [x] 126 tests passing across 11 packages

### Week 5 — Genre Expansion + Cognee Memory ✅
- [x] `battle_arena/base` full implementation
  - [x] Arena prefab theme pack (10 prefabs: cover walls, weapon racks, jump pads, etc.)
  - [x] Polished template: expanded summary, power_ups + match_history systems
  - [x] `ArenaSimulator` — round pacing, kill estimates, power-up timing, balance score
  - [x] Visualization data: round snapshots + timeline events for desktop preview
- [x] `adventure/base` full implementation
  - [x] Adventure prefab theme pack (10 prefabs: treasure chests, boss altars, quest boards, etc.)
  - [x] Polished template: expanded summary, dialogue + inventory systems
- [x] Improved repair loop with error categorization (done in Day 13)
- [x] Balance simulator with visualization (`ArenaSimulator` + `BalanceVisualization`)
- [x] `@forgeai/knowledge` package — cognee-inspired local knowledge store
  - [x] `KnowledgeStore`: tag/type/genre search, usage tracking, token-budgeted context builder
  - [x] Seed data: 8 entries (Verse patterns, device schemas, economy templates per genre)
  - [x] File-backed persistence at `~/.forgeai/knowledge/entries.json`
- [x] 64 prefabs total (24 starter + 10 forest + 10 industrial + 10 arena + 10 adventure)
- [x] 148 tests passing across 12 packages

### Week 6 — Beta Hardening ✅
- [x] `roleplay/base` template + roleplay prefab theme pack (10 prefabs)
- [x] Export polish: `packageZip()` tar.gz export, `--zip` CLI flag, `HANDOFF-CHECKLIST.md` doc
- [x] 40 cross-genre golden prompts eval — **100% pass rate** (40/40, AC12 target was ≥75%)
- [x] Pricing hooks: `PricingTier` schema, `TierLimits`, `TierGuard` enforcement in pipeline
- [x] Config-loader test fix (mock `~/.forgeai/config.yaml` in tests)
- [x] 74 prefabs total (24 starter + 10 forest + 10 industrial + 10 arena + 10 adventure + 10 roleplay)
- [x] 148 tests passing across 12 packages
- [x] Tag `v0.2.0-beta`

---

## Day 16 — Verse Stage Hardening (qwen2.5-coder via Colab/ngrok) ✅

Resumed job `d8fde5db-...` (lumber tycoon) against a remote `qwen2.5-coder:7b-instruct` Ollama tunnel and turned the silent `$.declarations.0: Invalid input` failure into a complete pipeline run.

- [x] **Better Verse schema errors** — `VerseModule.declarations` switched from `z.union` to `z.discriminatedUnion("kind", ...)` in `packages/schemas/src/verse-ast.ts`; surfaces real per-branch missing-field errors instead of `Invalid input`
- [x] **Recursive Zod issue formatter** — `formatZodIssues` in `packages/ai/src/structured-output.ts` now expands `invalid_union` issues into per-branch sub-errors so the repair LLM gets actionable diagnostics
- [x] **Stage-level normalizer hook** — `GenerateValidatedOptions.normalize?: (data) => unknown` runs after `parseJsonResponse` on first pass and every repair pass
- [x] **`normalizeVerseModule`** — coerces stray `body[]` items into `{kind:"statement", code:"…"}`: handles wrong `kind` (`"if"` / `"expression"`), bare strings, and unknown structured objects (serialized into `// TODO:` statement so model intent is never silently dropped)
- [x] **Strengthened `VerseGenerator` system prompt** — adds CRITICAL `body[]` rules and a multi-statement example so the model learns to encode control flow as raw Verse strings, not nested AST nodes
- [x] **Verse hallucination lint rules** in `VerseLintValidator`:
  - Errors on literal prompt-example placeholders (`SomeDevice.SomeEvent`, `SomeEvent.Subscribe`, `Subscribe(Handler)`)
  - Errors when a method's body uses `[Agent]` failable bind without `Agent:agent` in scope (params or class members)
  - Errors when `.Subscribe(Identifier)` references an identifier that is not declared anywhere in the module (still allows literal `Handler` so existing fixture stays compatible — the placeholder rule above catches that case)
- [x] **Colab notebook hardening** (`notebooks/forgeai_colab_t4_ollama_ngrok.ipynb`):
  - `OLLAMA_CONTEXT_LENGTH=8192`, `OLLAMA_KEEP_ALIVE=30m`, `OLLAMA_FLASH_ATTENTION=1` env knobs (root cause of original Verse stage failure was 2048-token default truncating the response)
  - Default model switched to `qwen2.5-coder:7b-instruct`
  - Smoke test now mirrors ForgeAI's actual call shape and asserts a Verse-module-shaped response with `declarations[0].kind` set
  - Removed invalid `request_header_add` ngrok option that caused HTTP 400; ngrok-free interstitial is documented as a non-issue for non-browser API clients
- [x] **Tests:** new `verse-generator.test.ts` (3 normalizer cases) + 4 new validator tests (placeholder leakage, unbound Agent, declared-Agent allow, undeclared subscribe target)
- [x] **End-to-end verification:** lumber tycoon resumed completes 11/11 modules + all 7 validators (5 advisory warnings, 0 errors) + zip archive on remote qwen2.5-coder:7b-instruct via ngrok

### Day 16 — Known follow-ups (size estimates in token cost legend at top of file)
- [x] **Stronger UEFN API surface in the Verse system prompt** *(Cost: S–M)* ✅
  - Reworked `packages/knowledge/src/seed-knowledge.ts` to be per-entry idempotent (was all-or-nothing) so users with an existing `~/.forgeai/knowledge/entries.json` get new cheat-sheet entries on next run
  - Added 6 new `verse_pattern` entries that directly target the hallucination patterns observed in qwen2.5-coder runs:
    - `verse_subscribe_handler_must_be_method` — Subscribe args must be class methods, never `Handler`
    - `verse_agent_parameter_required` — `Agent` must come from a Subscribe handler param, never appear in `OnBegin`
    - `verse_no_invented_player_members` — `Player.Currency`, `Player.PrestigeLevel`, etc. don't exist; teaches `var ScoresByAgent : [agent]int = map{}` pattern
    - `verse_no_global_system_objects` — no `PrestigeSystem.Initialize()`; everything goes through `@editable` device fields
    - `verse_real_device_events_cheatsheet` — real event names per device type (`TriggeredEvent`, `InteractedWithEvent`, `ItemPickedUpEvent`, `EliminatedEvent`, etc.)
    - `verse_class_skeleton_with_handler` — full canonical class skeleton with mutable agent-keyed map state
  - Tags chosen so the existing `VerseGenerator` knowledge query (`tags: ["verse", "pattern", "editable", "failable"]`, `type: "verse_pattern"`) picks them up without any pipeline changes
  - Tests: 10 knowledge tests pass (was 9; replaced obsolete "does not re-seed" test with two new ones for per-entry idempotence and user-entry preservation)
  - Verified: 24/24 turbo tasks; 224 tests pass

- [x] **Verse hallucination repair loop wiring** *(Cost: S; M if regenerate-on-fail)* ✅
  - `RepairLoop` now accepts optional Verse repair context and regenerates modules that fail `verse-lint` before falling back to JSON patch repair
  - Pipeline passes the existing stage-8 `VerseGenerator`, `VerseEmitter`, and `ModulePlan`, preserving BudgetAdapter/RetryAdapter behavior
  - Added regression coverage for placeholder leakage repaired by module regeneration; focused validators/core builds pass
- [x] **Per-stage provider override** *(Cost: M)* ✅
  - Added `stageOverrides` config schema plus `--verse-provider`, `--verse-model`, and `--verse-ollama-url` flags for create/resume
  - Pipeline now uses a stage-specific adapter for `8-verseFiles`, with RetryAdapter/BudgetAdapter wrapping and a shared budget pool across adapters
  - Memo-cache keys include stage override config so hybrid Verse outputs do not collide with pure-Ollama runs
  - Doctor reports configured stage overrides and warns when hosted-provider keys are missing; Colab guide documents hybrid Ollama + paid Verse usage
- [ ] **Try `qwen2.5-coder:14b-instruct-q4_K_M` on T4** *(Cost: XS to try, no code)* — see spec plan below

---

## Day 16 — Spec plans for remaining follow-ups

These specs are written so a cheap/lightweight LLM (qwen2.5-coder:7b-instruct or similar) can execute them in isolation, without re-reading this whole TODO. Each spec includes goal, files to touch, step-by-step plan, risks, and acceptance criteria. Read AGENTS.md before starting any spec.

### Spec A — Verse-aware repair loop *(Cost: S–M)*

**Goal**
When `runAllValidators` returns errors from the `verse-lint` validator (literal prompt placeholders, unbound `Agent`, undeclared `Subscribe(...)` targets), the existing `RepairLoop` should *regenerate the affected Verse module* via `VerseGenerator.generate()` instead of emitting a JSON patch over `WorldProject`. JSON-patching individual `scripts[i].declarations[j].methods[k].body[l].code` strings is unreliable; a fresh module-level generation with the strengthened prompt + cheat-sheet knowledge is much more likely to fix the hallucinations.

**Files to touch**
- `packages/validators/src/repair-loop.ts` — add Verse-regeneration branch
- `packages/core/src/pipeline.ts` — pass `VerseGenerator`, `VerseEmitter`, and `ModulePlan` to `RepairLoop`
- `packages/validators/src/__tests__/validators.test.ts` (or a new `repair-loop.test.ts`) — mock-LLM test for the regeneration path

**Step-by-step**
1. Extend `RepairLoop` constructor with optional `verseRepairContext?: { generator: VerseGenerator; emitter: VerseEmitter; modulePlan: ModulePlan }`. Keep all existing call sites compiling — make it optional.
2. In `RepairLoop.run()`, after `runAllValidators(project, this.validatorOptions)`:
   - Filter results for `validator === "verse-lint"` and `passed === false`.
   - For each error message, the format is `"<ModuleName>: ..."`. Extract the module name (everything before the first `:`).
   - Look up the matching entry in `modulePlan.modules` by `m.className === moduleName`.
   - Call `await generator.generate(planEntry)` to regenerate the AST.
   - Re-emit via `emitter.emit(ast)` and `lintVerseCode()`.
   - Replace `project.scripts[i]` (matched by `name === moduleName`) with the new AST.
   - Record the action in `repairs` as `[pass N][verse-regen] <moduleName>`.
   - Cap regen attempts per module at **2**; if it still fails, fall through to the JSON-patch path (so we never spin forever).
3. After Verse regeneration, re-run validators. If everything passes, return early. Otherwise, fall through to the existing JSON-patch loop for any remaining non-verse-lint errors.
4. In `pipeline.ts`, when constructing the `RepairLoop` (search for `new RepairLoop(`), pass `verseRepairContext: { generator: verseGenerator, emitter, modulePlan }` (these objects are already in scope at that point in `Pipeline.run()`).
5. Tests:
   - New mock-LLM test where the initial `VerseGenerator` returns a module containing `SomeDevice.SomeEvent.Subscribe(Handler)` (so `verse-lint` fails). The repair loop's mock generator returns a clean module on the second call. Assert `passed === true` after repair and `repairs` contains a `verse-regen` entry.
   - Existing repair-loop tests must still pass.

**Risks**
- Adapter cost: regeneration calls the LLM. Make sure each regen still goes through `BudgetAdapter` (it does, because `VerseGenerator` already uses the wrapped adapter from the pipeline).
- Infinite loops if regenerated module also fails: enforced by the per-module cap of 2 in step 2.
- Back-compat: `RepairLoop` is constructed in `pipeline.ts` and `modifier.ts` — check both. The modifier already does its own `regenerate_verse_module` flow so it's fine if it doesn't pass the new context (graceful degradation).

**Acceptance criteria**
- `pnpm build && pnpm test` ✓ (24/24 turbo tasks)
- New regeneration test passes
- Smoke eval still 40/40
- TODO.md follow-up checked off with a short summary

---

### Spec B — Per-stage provider override *(Cost: M)*

**Goal**
Let users keep cheap planning stages (intent, world, layout, systems, balance, devices, verse-plan, loot) on a free/local provider while escalating only the *Verse generation* stage (stage 8) to a stronger paid provider (Anthropic Sonnet, GPT-4.1, Gemini 2.x). This is the highest-leverage cost/quality tradeoff for tycoon scaffolds.

**Files to touch**
- `packages/schemas/src/config.ts` — add `stageOverrides` field
- `packages/ai/src/factory.ts` — add `createAdapterForStage(config, stageName)` helper
- `packages/core/src/pipeline.ts` — replace `this.llm` for stage 8 only with a stage-specific adapter
- `apps/cli/src/commands/create.ts` and `resume.ts` — add `--verse-provider`, `--verse-model`, `--verse-ollama-url` flags
- `apps/cli/src/commands/doctor.ts` — show stage overrides if configured
- `docs/COLAB-JUPYTER-GUIDE.md` — document the hybrid Ollama-planning + paid-Verse recipe

**Step-by-step**
1. Schema: add to `ForgeAIConfig`:
   ```ts
   stageOverrides: z.record(z.string(), z.object({
     provider: z.enum(["anthropic","openai","groq","google","ollama"]).optional(),
     model: z.string().optional(),
     ollamaUrl: z.string().optional(),
   })).optional()
   ```
   Stage names should match those used in `memoOrCompute()` (e.g. `"8-verseFiles"`).
2. Factory: `createAdapterForStage(config: ForgeAIConfig, stage: string): LLMAdapter`. If `config.stageOverrides?.[stage]` exists, build a config clone with the overrides and call `createAdapterWithFallback(...)`. Otherwise return null and let caller use the default `this.llm`. Cache per (provider,model) pair so we don't rebuild for every call.
3. Pipeline: introduce a private `getAdapterForStage(stage: string): LLMAdapter` that returns the stage adapter if present, else `this.llm`. Wrap each non-default adapter with `RetryAdapter` + `BudgetAdapter`, sharing the same `Pipeline.totalSpentUsd` accumulator (extract a `SharedBudget` ref so multiple `BudgetAdapter` instances credit/debit the same total — see `BudgetAdapter` for current structure).
4. Wire stage 8 (the only one we care about right now): in the `verseGenerator = new VerseGenerator(...)` block, replace `this.llm` with `this.getAdapterForStage("8-verseFiles")`.
5. CLI: in `create.ts` and `resume.ts`, add the three flags above. If any are passed, populate `stageOverrides["8-verseFiles"]` before constructing the Pipeline.
6. Doctor: if `config.stageOverrides` exists, print a table. Include a warning if the override provider's API key isn't set.
7. Docs: add a "Hybrid Ollama + paid Verse" section to `docs/COLAB-JUPYTER-GUIDE.md` with one fully-worked example command.
8. Tests:
   - Pipeline mock test that verifies stage 8 uses the override adapter while stages 1–7 use the default.
   - Schema test for `stageOverrides` parsing.

**Risks**
- Memo-cache keys already include `provider + model`. Verify that stage 8's memo key uses the *override* provider/model, not the default — otherwise a hybrid run would hit a stale cache entry from a pure-Ollama run. Extend `cache-key.ts` with a per-stage provider/model field if needed.
- Budget aggregation: per-stage adapters need to share the budget pool. Don't accidentally create independent budgets that each allow `--budget` USD of spend.
- Doctor output should not block the run if a stage override's API key is missing — warn, don't error.

**Acceptance criteria**
- New CLI flags work end-to-end (manual smoke test on a 1-prompt run is enough; don't burn budget on full eval)
- All existing tests still pass
- Memo-cache discriminates stage 8 results between hybrid runs and pure-Ollama runs
- Doctor reports overrides
- Docs include one runnable recipe

---

### Spec C — Try `qwen2.5-coder:14b-instruct-q4_K_M` on Colab T4 *(Cost: XS, no code)*

**Goal**
Empirically verify whether the 14B coder model fits in T4's 16 GB VRAM (q4_K_M quantization is ~9 GB, KV cache for `num_ctx=8192` is ~3–4 GB, so it should just barely fit) and whether it produces materially fewer hallucinations than the 7B variant for the lumber tycoon prompt.

**Steps (manual, in the Colab notebook — no repo code changes needed)**
1. In `notebooks/forgeai_colab_t4_ollama_ngrok.ipynb` cell 4, change:
   ```python
   MODEL = "qwen2.5-coder:14b-instruct-q4_K_M"
   ```
2. Run cells 1–4 from a fresh runtime. After the pull completes, run `!nvidia-smi` and verify the VRAM after model load is **<15 GB** (leaving ~1 GB headroom for KV cache during long generations).
3. If OOM, fall back to `qwen2.5-coder:7b-instruct-fp16` or `deepseek-coder:6.7b-instruct-q5_K_M`. If still OOM, drop `OLLAMA_CONTEXT_LENGTH` from 8192 → 4096 in cell 3 and retry.
4. Run the smoke test cell (cell 5) — assert it still produces a valid Verse-module-shaped JSON with `declarations[0].kind` set.
5. Open the ngrok tunnel (cell 6), then on your laptop run the lumber tycoon resume command from this thread (`uefn-ai resume d8fde5db-... --provider ollama --model qwen2.5-coder:14b-instruct-q4_K_M --ollama-url ...`).
6. After the run, `grep -rn "Player\.\(Currency\|Score\|PrestigeLevel\|ApplyReward\)\|PrestigeSystem\." output/<dir>/Verse/` to count hallucinations. Compare to the 7B run (which had at least 6 such hallucinations).
7. Run `uefn-ai validate output/<dir>` and count `verse-lint` errors (not warnings). Compare to the 7B baseline.
8. Write findings to a new file `docs/MODEL-COMPARISON.md` with: VRAM usage, generation time per module, hallucination count, validator error count, sample diffs, and a recommendation. Commit it.

**Acceptance criteria**
- `docs/MODEL-COMPARISON.md` exists with at least the four metrics above
- Either the 7B or 14B is identified as the recommended Colab default (update notebook cell 4 accordingly)

---

### Spec D — UEFN import evidence for `tycoon-lumber-starter` *(Manual, no code)*

**Goal**
Close out the last open checkbox in P2.1 by actually importing one reference scaffold into UEFN, recording what compiles, what doesn't, and what manual fixes were needed. This is the only remaining quality signal that says "ForgeAI ships UEFN-importable output".

**Steps**
1. Install/launch UEFN (Fortnite Creative 2.0). Create a new blank Creative project.
2. From the repo, open `references/tycoon-lumber-starter/README-UEFN-IMPORT.md` and follow the import steps verbatim:
   - Copy the `Verse/` directory contents into the project's Verse folder.
   - Create the device instances listed in `manifests/device_manifest.json` and label them per the `@editable` field names in each `.verse` file.
3. Hit **Build Verse Code** in UEFN. Capture every compiler error verbatim into a fresh copy of `docs/UEFN-IMPORT-EVIDENCE-TEMPLATE.md` saved as `docs/UEFN-IMPORT-EVIDENCE-lumber.md`.
4. Apply minimal manual fixes to make it compile. For each fix, record the file, the original line, the patched line, and a one-line reason.
5. Push **Launch Session**. Record a 30-second video of: spawn → use the resource zone → buy an upgrade → see the upgrade applied. If any of those don't work, note it in the evidence file.
6. Commit `docs/UEFN-IMPORT-EVIDENCE-lumber.md` plus screenshots/video (or a public link) and check off the P2.1 checkbox.

**Acceptance criteria**
- `docs/UEFN-IMPORT-EVIDENCE-lumber.md` filled out completely
- Either: zero manual fixes needed, OR a list of fixes + matching follow-up TODO entries describing what to teach the generator so the next run produces them automatically
- Video/screenshots committed or linked
- TODO.md P2.1 final checkbox checked

---

## Day 15 — Reliability Fixes ($4 remaining)
- [x] Fix stale error in `structured-output.ts` repair loop (re-uses initial parse error on every pass)
- [x] Genre-aware simulator dispatch in pipeline (uses ArenaSimulator for battle_arena genre)
- [x] Surface Verse generation failures instead of silent catch
- [x] LLM retry/timeout wrapper (`RetryAdapter`: exponential backoff, 3 retries, 120s timeout)
- [x] Wire `KnowledgeStore` context into agent system prompts
- [x] Stage caching: `StageCache` persists each stage to `~/.forgeai/stage-cache/<jobId>/`
- [x] `uefn-ai resume <jobId> --run` actually resumes pipeline from last cached stage
- [x] Replace `tar` shell-out in packager with Node.js `tar` library (Windows compat)
- [x] Wire Pino structured logging (installed but unused)
- [x] Add ESLint + Prettier config
- [x] Mock-LLM integration tests for pipeline wiring

---

## Backlog — Oracle-Reviewed Improvements (ordered by importance)

Token cost legend (estimated ForgeAI token spend to design + implement + verify; excludes runtime LLM cost of evals):
- **XS** ≈ <20k tokens (1 short focused session)
- **S** ≈ 20–60k tokens
- **M** ≈ 60–150k tokens
- **L** ≈ 150–400k tokens
- **XL** ≈ 400k+ tokens (multi-day)

### P0 — Architectural truth & cost honesty

- [x] **P0.1 — Make `WorldProject` the canonical pipeline artifact; move validate + package into core** *(Cost: L)* ✅
  - `assembleProject()` in `packages/core/src/project-assembler.ts` builds canonical `WorldProject` from stage outputs (now populates `scripts`, `validation`, `prefabs`)
  - `Pipeline.run()` now: generate → assemble → validate → (optional repair) → package → transition job to `complete`
  - New `PipelineOptions`: `archive`, `repair`, `strict`; new `PipelineResult` fields: `project`, `validation`, `repairResult`, `verseModules`, `archivePath`
  - CLI `create.ts`/`resume.ts` reduced to thin renderers (no ad-hoc project assembly, no packager calls)
  - Packager now writes the actual resolved template to `templates/resolved-template.json` (was `{}`)
  - Verified end-to-end: `status: complete`, `scripts.length: 1`, validation passed (3 validators), `resolved-template.json templateId: tycoon/lumber-mill`
  - All 23 turbo tasks pass (build + tests, 148+ tests)

- [x] **P0.2 — Split resume cache from reuse cache; add content-addressed stage memoization** *(Cost: L)* ✅
  - `StageCache` (job-scoped) kept as-is for `resume`; new `MemoCache` in `packages/core/src/memo-cache.ts` provides content-addressed reuse
  - Memo key extended in `cache-key.ts`: `prompt + templateId + templateVersion + provider + model + seed + schemaVersion + knowledgeVersion + genreOverride + templateOverride`
  - Wired into pipeline via `memoOrCompute()` helper for the 8 expensive stages: `3-world`, `4a-layout`, `4b-systems`, `4c-economy`, `6-devices`, `7-modulePlan`, `7-lootTables`, `8-verseFiles`
  - Cheap/deterministic stages excluded: `1-brief`, `2-template`, `5-balance`
  - Guardrail: provider, model, and templateVersion all in the key, so outputs never cross models or template revisions
  - Storage at `~/.forgeai/memo-cache/<keyHash>/<stage>.json`; logged via Pino on hit
  - Tests: 6 memo-cache tests + new pipeline integration test verifying second run with same inputs makes 1 LLM call instead of 10 — 17 core tests passing, 23 turbo tasks pass

- [x] **P0.3 — Fix advertised fallback / budget / observability path** *(Cost: M; L if persistent ledger)* ✅
  - `Pipeline` now uses `createAdapterWithFallback()` (cascade re-enabled); `createAdapterWithFallback` leads with the user's configured provider/model, then appends every other available key, then local Ollama as last resort
  - New per-provider/per-model pricing table in `packages/ai/src/pricing.ts` (anthropic/openai/groq/google/ollama; prefix-matches dated model variants); `BudgetAdapter` now uses `provider` + `model` for accurate cost estimates and emits a `UsageEvent` per call
  - `FallbackAdapter` accepts a Pino-shaped `FallbackLogger` (replaces `console.error`); `Pipeline` injects its Pino logger
  - `ensureOllamaModel()` now uses the configured Ollama base URL and gates the 6.6 GB auto-pull behind `autoPullLocalModel` (default OFF — errors with install instructions instead)
  - New `UsageLedger` (`packages/core/src/usage-ledger.ts`) persists per-day, per-provider call counts + token totals + USD spend at `~/.forgeai/usage-ledger.json` (separate file from TierGuard's `usage.json` to avoid schema collision)
  - `Pipeline` always wraps with `BudgetAdapter` (budget=∞ when unset) so usage events flow into ledger + Pino logs even without `--budget`; logs `pipeline complete` with `costUsd` and `spentTodayUsd`
  - New `Pipeline.totalSpentUsd` getter exposes per-run spend
  - Tests: 7 new pricing/budget tests (`packages/ai/src/__tests__/pricing-budget.test.ts`) + 4 ledger tests (`packages/core/src/__tests__/usage-ledger.test.ts`); 33 ai tests + 21 core tests pass; 23/23 turbo tasks ✓ (191 total tests)

- [x] **P0.4 — Replace eval story with a budget-aware E2E harness** *(Cost: M; L for full reporting)* ✅
  - **`--full` mode in `scripts/run-eval.ts`** implements the live tier — runs the full Pipeline against each prompt, supports `--limit N`, writes `eval-report-full.json`
  - **Per-prompt telemetry** now captured: `firstPassPassed`, `validationPassed`, `validationWarnings`, `repairTriggered`, `repairPasses`, `packageFileCount`, `costUsd`, `durationMs`, `error`
  - **Summary report** reports first-pass valid count, repair-triggered count + repair-success count, validation OK count, and total spend
  - **Pipeline now exposes `firstPassValidation`** alongside `validation` so callers can measure repair effectiveness without re-running validators
  - **Contract test tier** (`packages/core/src/__tests__/pipeline.test.ts`):
    - "packages a real project on disk with all expected artifacts" — runs full pipeline (`dryRun:false`), validates `worldgen.config.yaml`, all 4 manifests, resolved-template, Verse files, README, README-UEFN-IMPORT, and 5 doc files
    - "produces deterministic project artifacts" — same prompt+seed+model produces functionally identical layout, economy, devices, scripts across runs
    - Existing memo + mock-LLM tests retained
  - 23 core tests pass, 23/23 turbo tasks ✓; smoke eval still 40/40 (100%)
  - Out of scope (deferred): live eval CI scheduler, expected-artifacts golden snapshots per genre, output diff reporting

### P1 — Schemas, packaging, DX

- [x] **P1.1 — Strengthen schema/validator contracts** *(Cost: M)* ✅
  - `DeviceInstance.type` is now `DeviceTypeRef = union(DeviceType, snake_case string)` — back-compat, but garbage like `"Item Granter!"` now fails schema validation
  - 4 new validators wired into `runAllValidators()`:
    - `VerseLintValidator` — re-emits each script and reports any lint fixes that would apply (warnings)
    - `VerseMemoryValidator` — runs `checkVerseMemory` per script + project-wide weak_map ≤4 enforcement
    - `TemplateConformanceValidator` — required zone purposes, zone count bounds, required/allowed device types, required Verse modules (warnings; surfaced as failures via `--strict`); only runs when `resolvedTemplate` is provided via new `RunValidatorsOptions`
    - `PackageReadinessValidator` — errors on empty zones/devices/currencies/name; warns on missing design fields and missing template metadata
  - `runAllValidators(project, options?)` and `RepairLoop(llm, passes, validatorOptions?)` now accept resolvedTemplate so repair passes use the same validator set
  - Pipeline injects `templateResult.resolvedTemplate` so all 7 validators run end-to-end
  - Tests: 17 validator tests (was 12; +5 covering new validators + runner options); 23/23 turbo tasks pass; smoke eval still 40/40

- [x] **P1.2 — Fix packaging/distribution gaps (Windows-first)** *(Cost: M)* ✅
  - `--zip` now emits a real `.zip` archive (native ZIP writer) instead of a `.tar.gz`; CLI help updated
  - Replaced `rm -rf` clean scripts with Node `fs.rmSync` cleaners across CLI/Desktop and packages so `pnpm clean` works on Windows
  - Confirmed CLI version is synced with root at `0.2.0-beta`
  - Packager now emits `variant_zones.json`, `prefab_manifest.json`, `worldgen.lock.json`, `.ai/job.json`, and `.ai/validation/*.json`
  - `templates/resolved-template.json` remains the real resolved template; pipeline contract test now covers the new artifacts and `.zip` magic header
  - Verification: `pnpm build` ✓, `pnpm test` ✓ (198 tests; 23/23 turbo tasks), smoke eval `40/40 (100%)` ✓

- [x] **P1.3 — DX: thin CLI, init command, better doctor, no silent skips** *(Cost: S–M)* ✅
  - [x] Added `uefn-ai init` calling existing `initConfig()` in `packages/schemas/src/config-loader.ts`
  - [x] Expanded `doctor`: config file presence/parse, output dir writability, cache dir writability, provider status, Ollama base URL, UEFN path/tooling, and `--json`
  - [x] `loadUserCatalog()` silently swallows invalid files — `loadUserCatalogWithReport()` already reports loaded/skipped files (P2.2)
  - [x] Deduplicate assembly/packaging logic between `create.ts` and `resume.ts` — resolved by P0.1
  - [x] `--json` output includes a `Map` (`verseFiles`) that doesn't serialize cleanly — normalized with `Object.fromEntries()` in `create.ts`/`resume.ts`
  - [x] Added root `pnpm check` = build + test + lint + eval smoke via Turbo `eval:smoke`
  - Verification: `pnpm check` ✓ (38/38 turbo tasks; smoke eval 40/40)

- [x] **P1.4 — Desktop: thin client over the same core pipeline** *(Cost: L)* ✅
  - [x] Added Electron preload + IPC handlers for `Pipeline`, generated project browsing, project details, and job listing
  - [x] Replaced `MOCK_PROJECTS`/`MOCK_ZONES` with real `world.project.json`, layout, variant zones, manifest list, and Verse output inspection
  - [x] Wired `PromptWizard` to launch generation through the same core pipeline/packager with provider/model/output/budget options
  - [x] Desktop now shows stage progress plus post-run cost, warnings, job ID, and output path
  - Verification: `pnpm --filter @forgeai/desktop build` ✓, `pnpm --filter @forgeai/desktop lint` ✓, `pnpm build && pnpm test` ✓

### P2 — Product focus & quick wins

- [ ] **P2.1 — Rebalance roadmap: importable tycoon scaffolds over more genre surface area** *(Cost: L–XL)*
  - Strongest wedge is reliable UEFN-ready output, not more templates
  - Ship 2–3 polished reference projects, strong import docs/screenshots/video, one known-good tycoon scaffold end-to-end, better prefab/device mapping coverage for that vertical
  - Defer broader genre expansion and speculative marketplace features
  - [x] Added `docs/TYCOON-REFERENCE-SCAFFOLDS.md` with 3 tycoon reference commands, import acceptance criteria, and explicit deferred non-tycoon scope
  - [x] README/GUIDE now point contributors to the tycoon-first reference path before broadening genre work
  - [x] Packager now adds a tycoon-specific import pass to generated `README-UEFN-IMPORT.md` (resource zones, progression zones, economy data, known-good checks)
  - [x] Added packager test coverage for tycoon import guidance and recorded UEFN-only handoff steps in `docs/PATCHNOTES-REVIEW.md`
  - Verification: `pnpm --filter @forgeai/packager test` ✓, `pnpm --filter @forgeai/packager build` ✓, `pnpm --filter @forgeai/packager lint` ✓, `pnpm build && pnpm test` ✓
  - [x] Generate the 3 reference scaffolds under `./references/` with budget caps and archive their eval/package reports
    - Generated `tycoon-lumber-starter`, `tycoon-mining-starter`, and `tycoon-compact-smoke` plus `.zip` archives; eval/package reports archived under `references/_reports/`; all reference validators passed with 0 warnings
  - [x] Repo-side prep for UEFN import evidence
    - Re-checked `tycoon-lumber-starter` archive integrity, required scaffold files, 7 validators, 7 zones, 11 devices, and 8 Verse files
    - Fixed `uefn-ai validate` to load generated split manifests and `templates/resolved-template.json`, so template conformance runs from the CLI without a missing-template warning
    - Added `docs/UEFN-IMPORT-EVIDENCE-TEMPLATE.md` for recording UEFN compiler output, screenshots/video, playtest results, and manual fixes
  - [x] Added `docs/COLAB-JUPYTER-GUIDE.md` and README/GUIDE links for collaborators running ForgeAI from a shared Colab/Jupyter notebook
  - [x] Added Colab T4 + Ollama + ngrok notebook path and `--ollama-url` / `FORGEAI_OLLAMA_BASE_URL` support for remote Ollama-compatible model servers
  - [x] Added Antigravity Colab extension smoke-test protocol for the T4/Ollama/ngrok notebook
  - [x] Removed the Gemini/API Colab notebook; keeping only the T4/Ollama/ngrok notebook path for collaborator testing
  - [ ] Import at least `tycoon-lumber-starter` into UEFN and record manual fixes/screenshots/video

- [x] **P2.2 — Quick wins** *(Cost: S total)* ✅
  - [x] Fill `resolved-template.json` with the real resolved template — done in P0.1
  - [x] Implement `--full` in `scripts/run-eval.ts` — runs full pipeline against each prompt, records cost/duration/validation status, writes `eval-report-full.json`; supports `--limit N`
  - [x] Fix README/package drift: synced `apps/cli/package.json` from `0.1.0-mvp` → `0.2.0-beta`, updated test count `167` → `191`
  - [x] Make `--json` machine-readable — already done (`Object.fromEntries(result.verseFiles)` in `create.ts`/`resume.ts`)
  - [x] Confirm before auto-pulling Ollama fallback model — done in P0.3 (gated behind `autoPullLocalModel`, default OFF)
  - [x] Stop silently swallowing invalid prefab catalog files — `loadUserCatalogWithReport()` returns `{ catalog, report: { loaded, skipped } }`; `loadUserCatalog()` kept for back-compat
  - [x] Use `worldDesign.mapName` for project naming — `assembleProject()` accepts optional `mapName` and prefers it over the truncated `brief.fantasy` fallback; pipeline passes it on both initial and post-repair assemble calls
  - 23/23 turbo tasks pass; smoke eval `40/40 (100%)`

- [x] **P2.3 — AI-assisted modification of generated tycoon projects** *(Cost: M–L)* ✅
  - Goal: let a creator point ForgeAI at an existing generated scaffold and ask for changes like “add a snowy premium forest zone”, “make the first upgrade cheaper”, or “add another worker automation tier” without regenerating from scratch
  - [x] Read current artifacts from `manifests/world.project.json`, split manifests, `Verse/`, `templates/resolved-template.json`, `worldgen.lock.json`, and `.ai/planner/module-plan.json` via reusable `loadProject()`
  - [x] Design a constrained patch format over canonical `WorldProject` (`add`/`replace`/`remove` paths plus `regenerate_verse_module`) so the LLM cannot freely rewrite the whole project
  - [x] Apply patch deterministically → validate with all validators → optionally run repair → write changed docs/manifests/Verse → emit `docs/MODIFICATION-SUMMARY.md`
  - [x] CLI first: `uefn-ai modify <project-dir> "<request>" --out <dir> --dry-run --budget <usd> --strict --json`
  - [x] Human-edit guard: `worldgen.lock.json` now carries per-file hashes and modify blocks changed files without `--force`
  - [x] Verse changes are module-scoped: `regenerate_verse_module` reuses `.ai/planner/module-plan.json`, `VerseGenerator`, `VerseEmitter`, and linting; no textual Verse diffs in the patch schema
  - [x] Memo-cache integration: modifier patch proposals reuse `~/.forgeai/memo-cache` keyed by parent project hash + request + provider/model/seed
  - [x] Desktop later: add an “Edit this project” flow over the same core modifier API (deferred; CLI/core flow is complete)
  - [x] Tests: mock-LLM modifier test, patch application tests, validation failure tests, override-protection tests, Verse regeneration tests, memo-cache tests, and summary output tests
  - [x] Lineage: non-dry-run modify writes `.ai/modifications/<jobId>.json` and a `~/.forgeai/jobs/<jobId>.json` entry with parent project hash, patch, changed files, validation, repair, and cost
  - [x] Validation-failure repair coverage: modify tests now cover a bad patch that trips validators and is fixed by the repair loop
  - [x] Full packager-level repackage: non-dry-run modify now routes through `ScaffoldPackager`, refreshes standard docs/manifests/config/lock, preserves untouched Verse bytes, writes regenerated modules only, and includes modification summary/records in packaged output
  - Verification: `pnpm build && pnpm test` ✓ (24/24 turbo tasks)

### Recommended execution order
1. P0.1 (canonical project assembly in core) — unblocks P1.2, P1.3, P1.4
2. P0.2 (content-addressed stage reuse) — biggest cost-savings lever
3. P0.4 (real eval + per-stage cost telemetry) — gives honest quality signal
4. P0.3 (fallback/budget/observability) — can interleave with P0.2
5. P2.2 quick wins — cheap and improve trust
6. P1.1 → P1.2 → P1.3 → P1.4 in order
7. Revisit P2.1 once P0/P1 land

### Future: SQLite consolidation (only if triggered)
Move metadata-only into SQLite (jobs, stage-cache index, usage/cost ledger, eval results, project index) when:
- Multi-job history/search/reporting is needed
- Desktop needs rich project state, filtering, diffing
- Flat-file state becomes hard to reason about
Keep `packages/core` as the only writer; CLI/Desktop stay thin clients.

---

## Notes
- Each day assumes ~1 focused session with $10 token budget
- If a day's tasks overflow, carry remainder to next day
- Priority: working pipeline > perfect output quality
- Keep LLM calls minimal per stage (one well-crafted prompt > multiple retries)
