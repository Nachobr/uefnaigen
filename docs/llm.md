# ForgeAI — Project Context for LLMs

> Use this document as context when asking other LLMs questions about this project.

## What Is ForgeAI?

ForgeAI is a **local-first CLI + desktop tool** that converts natural-language game ideas into **UEFN (Unreal Editor for Fortnite) project scaffolds**. It generates Verse code, device manifests, layout plans, economy configs, loot tables, balance reports, and import instructions.

**Core constraint:** UEFN does not allow runtime AI. ForgeAI operates entirely outside UEFN as a **pre-build pipeline**, producing assets and code to be imported into UEFN manually.

**Repository:** https://github.com/nachobr/uefnaigen

---

## Tech Stack

| Component | Technology |
|---|---|
| Language | TypeScript (strict mode, ESM) |
| Runtime | Node.js 20+ |
| Monorepo | pnpm workspaces + Turborepo |
| Schemas | Zod (all data models) |
| Testing | Vitest (148 tests across 12 packages) |
| Desktop | Electron + React + Vite |
| CLI | Commander.js |

---

## Package Structure

```
packages/
├── schemas/       — Zod schemas for all data models (config, devices, economy, layout, templates, etc.)
├── ai/            — LLM adapters + all AI pipeline agents
├── core/          — Pipeline orchestrator, job manager, tier guard
├── templates/     — Genre template definitions + registry
├── balance/       — Deterministic economy simulators (tycoon + arena)
├── validators/    — Structural, schema, and cross-reference validators
├── verse/         — Verse AST → .verse source code emitter
├── packager/      — Scaffold export (directory + tar.gz)
├── prefabs/       — Prefab catalog (74 prefabs across 6 theme packs)
├── knowledge/     — Cognee-inspired local knowledge store
apps/
├── cli/           — CLI entry point (uefn-ai command)
├── desktop/       — Electron desktop app
```

---

## Pipeline Architecture

The generation pipeline runs 8 sequential stages. Each stage is an LLM agent (except stage 2 which is deterministic):

```
[1] Intent Extractor    — prompt → NormalizedBrief (genre, coreLoop, session, features)
[2] Template Router     — brief → resolved TemplateDefinition (deterministic, keyword-based)
[3] World Planner       — brief + template → WorldDesign (zones, progression, pacing)
[4] Layout Planner      — WorldDesign → LayoutSpec (coordinates, footprints, spawn points)
[5] Systems Planner     — brief + world + template → SystemsDesign (economy + devices, split into 2 LLM calls)
[6] Balance Planner     — brief + systems → EconomySpec + simulator validation + auto-adjust
[7] Device Mapper       — layout + systems → concrete DeviceInstance[] with transforms/channels
[8] Verse Planner       — systems + devices + template → ModulePlan + LootTables
```

After the pipeline, the packager generates:
- JSON manifests (world, layout, devices, economy, loot, progression)
- Verse source files
- Design docs (README, import guide, design summary, systems overview, device wiring, QA checklist, balance report, handoff checklist)

---

## Supported Genres & Templates

| Genre | Templates | Description |
|---|---|---|
| **Tycoon** | `tycoon/base`, `tycoon/lumber-mill`, `tycoon/mining-empire` | Resource gathering → sell → upgrade → prestige loop |
| **Battle Arena** | `battle_arena/base` | Round-based FFA/team combat with loadouts and scoring |
| **Adventure** | `adventure/base` | Hub + quest zones, enemy waves, bosses, checkpoints |
| **Roleplay** | `roleplay/base` | Town/city hub, jobs, housing, shops, social events |

Genre detection uses keyword matching:
- Tycoon: "upgrade", "automation", "rebirth", "sell", "tycoon", "idle"
- Arena: "rounds", "weapons", "ffa", "teams", "arena", "pvp"
- Adventure: "quests", "boss", "explore", "dungeon", "checkpoint"
- Roleplay: "jobs", "city", "hangout", "social", "roleplay", "housing", "town"

---

## LLM Providers

| Provider | Model | Env Variable | Notes |
|---|---|---|---|
| Google | Gemini 2.5 Flash | `GOOGLE_API_KEY` | Thinking disabled (`thinkingBudget: 0`) for JSON reliability |
| Groq | Llama 3.3 70B | `GROQ_API_KEY` | Fast inference |
| Anthropic | Claude Sonnet 4 | `ANTHROPIC_API_KEY` | High quality |
| OpenAI | GPT-4o | `OPENAI_API_KEY` | Reliable JSON |
| Ollama | Any local model | Auto-detected | Auto-disables thinking for qwen3/deepseek-r1 models |

**Fallback chain:** Groq → Google → Anthropic → OpenAI → Ollama (local `qwen3.5:9b`)

**Default max output tokens:** 16384 (all adapters)

---

## Key Design Decisions

### LLM Response Parsing
All agents use a shared `parseJsonResponse()` helper that handles:
1. Direct JSON parse
2. Markdown code block extraction (` ```json ... ``` `)
3. Brace/bracket scanning (find first `{`/`[` to last `}`/`]`)
4. DeepSeek R1 `<think>...</think>` block stripping

### Local Model Compatibility
- Ollama adapter prepends `/no_think` for thinking models (qwen3, deepseek-r1)
- Auto-retry without `format: "json"` if model returns empty
- SystemsPlanner split into 2 smaller LLM calls (economy + devices) for small models
- Pipe-delimited enum coercion (`"starter_area|social_hub"` → `"starter_area"`)
- Creative enum value coercion (`"per_log"` → `"per_action"`, `"item_purchase"` → `"purchase"`)

### Schema Flexibility
- `DeviceInstance.type` accepts any string (not strict enum) — LLMs invent device types
- `channels.listens`/`transmits` default to `[]` when omitted
- `WorldDesign.zones[].purpose` is a string (not enum) with runtime coercion

### Pricing Tiers
- Free: 2 generations/month, 10 copilot calls/day
- Pro ($19/mo): 50 gen/month, 100 copilot/day, premium templates
- Studio ($49/mo): 500 gen/month, 1000 copilot/day, private catalogs
- Usage tracked in `~/.forgeai/usage.json`

---

## CLI Commands

```bash
uefn-ai create <prompt>           # Generate full UEFN scaffold
uefn-ai create <prompt> --zip     # Generate + export as .tar.gz
uefn-ai create <prompt> --dry-run # Plan only, no file writes
uefn-ai create <prompt> --seed 42 # Deterministic output
uefn-ai create <prompt> --budget 2.00  # Cap inference cost

uefn-ai verse generate <desc>     # Generate Verse script
uefn-ai verse fix <file>          # Fix Verse compilation errors
uefn-ai verse explain <file>      # Explain Verse code

uefn-ai templates list            # List genre templates
uefn-ai templates inspect <id>    # Show template details
uefn-ai prefabs list              # Browse prefab catalog
uefn-ai validate <dir>            # Run validators on project
uefn-ai doctor                    # Check environment setup
uefn-ai resume <jobId>            # Check previous job status
```

**Provider flags:** `--provider ollama --model qwen3.5:9b`

---

## Configuration

Priority: CLI flags > env vars > `~/.forgeai/config.yaml` > defaults

```yaml
provider: google
model: gemini-2.5-flash
apiKeys:
  google: "..."
  anthropic: ""
  openai: ""
  groq: ""
ollamaBaseUrl: http://localhost:11434
outputDir: ./output
verbose: false
maxRepairPasses: 3
tier: free
# budgetUsd: 2.00
```

---

## File Locations

| Path | Purpose |
|---|---|
| `~/.forgeai/config.yaml` | User config |
| `~/.forgeai/usage.json` | Tier usage tracking |
| `~/.forgeai/jobs/` | Saved job records |
| `~/.forgeai/knowledge/entries.json` | Knowledge store |
| `./output/` | Default generated output |

---

## Key Source Files

| File | Purpose |
|---|---|
| `packages/schemas/src/config.ts` | ForgeAIConfig, PricingTier, TierLimits |
| `packages/schemas/src/devices.ts` | DeviceInstance, Transform, DeviceType |
| `packages/schemas/src/economy.ts` | EconomySpec (currencies, generators, sinks) |
| `packages/schemas/src/layout.ts` | LayoutSpec, ZoneSpec, ZonePurpose, WorldType |
| `packages/schemas/src/templates.ts` | Genre enum, TemplateDefinition |
| `packages/ai/src/parse-json.ts` | Shared robust JSON extractor |
| `packages/ai/src/intent-extractor.ts` | Stage 1: prompt → NormalizedBrief |
| `packages/ai/src/template-router.ts` | Stage 2: deterministic template selection |
| `packages/ai/src/world-planner.ts` | Stage 3: WorldDesign with zones |
| `packages/ai/src/layout-planner.ts` | Stage 4: spatial coordinates |
| `packages/ai/src/systems-planner.ts` | Stage 5: economy + devices (2 LLM calls) |
| `packages/ai/src/balance-planner.ts` | Stage 6: balanced EconomySpec |
| `packages/ai/src/device-mapper.ts` | Stage 7: concrete DeviceInstance[] |
| `packages/ai/src/verse-planner.ts` | Stage 8: ModulePlan |
| `packages/ai/src/ollama-adapter.ts` | Local LLM adapter with thinking suppression |
| `packages/ai/src/gemini-adapter.ts` | Google adapter with thinking disabled |
| `packages/core/src/pipeline.ts` | Pipeline orchestrator (8 stages) |
| `packages/core/src/tier-guard.ts` | Pricing tier enforcement |
| `packages/templates/src/builtin/` | All 6 template definitions |
| `packages/balance/src/tycoon-simulator.ts` | Deterministic economy simulator |
| `packages/packager/src/scaffold-packager.ts` | Output generation + zip export |
| `apps/cli/src/commands/create.ts` | CLI create command |
| `scripts/run-eval.ts` | Eval runner (40 golden prompts) |

---

## Known Issues & Workarounds

| Issue | Workaround |
|---|---|
| Gemini 2.5 Flash thinking eats output tokens | `thinkingBudget: 0` in adapter config |
| Gemini 503 (high demand) | Retry or use `--provider groq` |
| Local models return empty with `format: "json"` | Auto-retry without JSON mode |
| Thinking models (qwen3, R1) output chain-of-thought | `/no_think` prepended to system prompt |
| LLMs invent enum values | Coercion maps in SystemsPlanner + WorldPlanner |
| LLMs use pipe-delimited purposes | Split on `\|`, take first value |
| Large prompts overwhelm small models | SystemsPlanner split into 2 calls |

---

## Build & Test

```bash
pnpm install          # Install dependencies
pnpm build            # Build all 12 packages
pnpm test             # Run 148 tests
npx tsx scripts/run-eval.ts  # Run 40-prompt eval (100% pass rate)
```

---

## Current Version

- **Tag:** `v0.2.0-beta`
- **Milestone:** M1 Beta complete (Week 6)
- **Packages:** 12 (10 packages + 2 apps)
- **Tests:** 148 passing
- **Prefabs:** 74 across 6 theme packs
- **Golden prompts:** 40 (100% genre detection pass rate)
- **Templates:** 6 across 4 genres
