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
- [ ] Tag `v0.1.0-mvp` (awaiting manual git tag)

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

- [ ] **P1.4 — Desktop: thin client over the same core pipeline** *(Cost: L)*
  - `ProjectBrowser.tsx` uses `MOCK_PROJECTS`, `LayoutPreview.tsx` uses `MOCK_ZONES`, `PromptWizard.tsx` has no execution wiring
  - Wire desktop UI → Electron IPC → same core pipeline/packager
  - Milestones: launch generation, show stage progress, show cost + warnings, browse real projects, inspect manifests + Verse outputs

### P2 — Product focus & quick wins

- [ ] **P2.1 — Rebalance roadmap: importable tycoon scaffolds over more genre surface area** *(Cost: L–XL)*
  - Strongest wedge is reliable UEFN-ready output, not more templates
  - Ship 2–3 polished reference projects, strong import docs/screenshots/video, one known-good tycoon scaffold end-to-end, better prefab/device mapping coverage for that vertical
  - Defer broader genre expansion and speculative marketplace features

- [x] **P2.2 — Quick wins** *(Cost: S total)* ✅
  - [x] Fill `resolved-template.json` with the real resolved template — done in P0.1
  - [x] Implement `--full` in `scripts/run-eval.ts` — runs full pipeline against each prompt, records cost/duration/validation status, writes `eval-report-full.json`; supports `--limit N`
  - [x] Fix README/package drift: synced `apps/cli/package.json` from `0.1.0-mvp` → `0.2.0-beta`, updated test count `167` → `191`
  - [x] Make `--json` machine-readable — already done (`Object.fromEntries(result.verseFiles)` in `create.ts`/`resume.ts`)
  - [x] Confirm before auto-pulling Ollama fallback model — done in P0.3 (gated behind `autoPullLocalModel`, default OFF)
  - [x] Stop silently swallowing invalid prefab catalog files — `loadUserCatalogWithReport()` returns `{ catalog, report: { loaded, skipped } }`; `loadUserCatalog()` kept for back-compat
  - [x] Use `worldDesign.mapName` for project naming — `assembleProject()` accepts optional `mapName` and prefers it over the truncated `brief.fantasy` fallback; pipeline passes it on both initial and post-repair assemble calls
  - 23/23 turbo tasks pass; smoke eval `40/40 (100%)`

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
