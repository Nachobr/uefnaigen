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

### Week 3 — Desktop Shell
- [ ] Electron + React + Vite app scaffold
- [ ] Project browser (list/open generated projects)
- [ ] Prompt wizard UI
- [ ] Layout preview (2D zone grid visualization)

### Week 4 — Prefab Expansion
- [ ] Prefab catalog ingestion from user directories
- [ ] Variant zone visual preview
- [ ] `tycoon/lumber-mill` + `tycoon/mining-empire` template polish
- [ ] Prefab/theme packs: forest, industrial

### Week 5 — Genre Expansion
- [ ] `battle_arena/base` full implementation
- [ ] `adventure/base` full implementation
- [ ] Improved repair loop with error categorization
- [ ] Balance simulator with visualization

### Week 6 — Beta Hardening
- [ ] `roleplay/base` template
- [ ] Export polish (zip, checklist, handoff docs)
- [ ] 40 cross-genre golden prompts eval (target ≥75% — AC12)
- [ ] Pricing hooks (free/pro/studio tier enforcement)
- [ ] Tag `v0.2.0-beta`

---

## Notes
- Each day assumes ~1 focused session with $10 token budget
- If a day's tasks overflow, carry remainder to next day
- Priority: working pipeline > perfect output quality
- Keep LLM calls minimal per stage (one well-crafted prompt > multiple retries)
