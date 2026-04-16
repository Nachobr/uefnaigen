# AI UEFN World Generator — Technical Specification

**Codename:** ForgeAI
**Version:** 1.0
**Status:** Build-ready v1 spec
**Primary platform:** Windows-first (UEFN is Windows-first)
**Modes:** CLI, Desktop App, Verse Copilot

---

## 1. Summary

A local-first CLI + desktop tool that converts natural-language game ideas into **UEFN project scaffolds**: Verse code, device manifests, layout plans, prefab/randomization manifests, loot tables, economy configs, balancing reports, and import/setup instructions.

Three tightly integrated modes:

1. **AI Map Studio** — Generate a full game scaffold from a prompt like:
   _"Make a cozy lumber tycoon where players chop trees, automate sawmills, unlock islands, hire NPC workers, and prestige after 20 minutes."_

2. **Verse Copilot** — Generate, repair, explain, and refactor individual Verse scripts from plain English.

3. **Prefab Randomization System** — Create AI-designed prefab libraries and runtime Verse logic that selects from pre-authored variants to create the illusion of procedural generation within UEFN's constraints.

### Core constraint
UEFN does not allow runtime AI calls, HTTP requests, or runtime asset generation. This product operates entirely **outside UEFN** as a pre-build pipeline. It produces assets and code that are then opened/imported into UEFN and published normally.

### v1 output
The tool generates a **complete working scaffold**, not a finished `.umap` binary scene. The generator owns the **design, code, manifests, and setup plan**; actual in-editor placement is guided via generated placement manifests and instructions.

**Target:** Working MVP in 2 weeks. Creator beta in 6 weeks.

---

## 2. Problem / Opportunity

### Problem

| Pain Point | Impact |
|---|---|
| Learning Verse is a steep barrier | 90%+ of UEFN creators never write custom logic |
| Map creation takes 40-200+ hours per publishable map | Limits output, burns out creators |
| Balancing tycoon economies is slow and error-prone | Manual spreadsheets and ad hoc playtesting |
| No procedural generation in UEFN | Every match feels the same |
| No UEFN-specific AI pipeline exists | Generic AI tools produce unreliable Verse snippets |

### Opportunity

- Fortnite has **100M+ monthly players**
- UEFN/Creative is a rapidly growing creator platform with real monetization via engagement payouts
- Creators increasingly treat islands as products/businesses
- The tooling layer is still immature
- "AI-assisted game creation" is a strong wedge if it's domain-specific and actually shippable

### Why this product wins

Generic AI tools can write Verse fragments but do **not**:
- Understand UEFN device architecture
- Generate genre-specific design docs and data models
- Produce economy/loot balance tables
- Create prefab randomization systems
- Emit validated project scaffolds
- Iterate against UEFN constraints

---

## 3. Goals & Non-Goals

### Goals
1. Turn natural language into a **UEFN-ready scaffold** in minutes
2. Make **tycoon maps** the strongest vertical in v1
3. Support **Verse Copilot** for script generation, repair, and explanation
4. Generate **runtime-randomized experiences** using prefab/device variants
5. Produce **human-editable outputs** (not opaque blobs)
6. Use a **typed intermediate representation (World IR)** as the source of truth
7. Keep generation **deterministic where possible** with `seed` + lock files

### Non-Goals
1. Runtime AI inside Fortnite (not possible)
2. Direct generation of arbitrary binary UEFN scene/map files
3. Bypassing Epic tooling, moderation, or publishing requirements
4. Universal support for every UEFN genre in v1
5. Perfect one-click placement automation on day 1
6. Advanced multiplayer simulation or analytics-driven balancing in MVP

---

## 4. Target Users / Personas

| Persona | Description | Key Need |
|---|---|---|
| **Solo Creator** | Strong ideas, weak scripting confidence | Prompt-to-project scaffold in one evening |
| **Technical Designer** | Comfortable with code, wants acceleration | Cut repetitive implementation by 50%+ |
| **Small Studio** | Builds branded/revenue-driven islands | Repeatable pipelines, consistency |
| **Aspiring Creator** | Familiar with Creative, can't write Verse | Plain English to map starter kit |

---

## 5. System Architecture

### 5.1 High-Level Architecture

```
┌───────────────┐        ┌─────────────────────┐
│ CLI            │        │ Desktop App          │
│ - init/create  │        │ - wizard             │
│ - verse gen    │        │ - layout preview     │
│ - validate     │        │ - diffs/errors       │
└───────┬────────┘        └──────────┬───────────┘
        │                            │
        └────────────┬───────────────┘
                     ▼
          ┌─────────────────────┐
          │ Core Generation     │
          │ Engine (TypeScript) │
          └──────────┬──────────┘
                     │
       ┌─────────────┼─────────────┐
       ▼             ▼             ▼
┌────────────┐ ┌───────────┐ ┌──────────────┐
│ Template   │ │ Prefab    │ │ LLM Provider │
│ Registry   │ │ Catalog   │ │ Adapter      │
│ Genre packs│ │ Asset defs│ │ Claude/GPT   │
└─────┬──────┘ └─────┬─────┘ └──────┬───────┘
      └───────────────┼──────────────┘
                      ▼
            ┌──────────────────┐
            │    World IR      │
            │ (typed JSON)     │
            └────────┬─────────┘
                     │
          ┌──────────┴──────────┐
          ▼                     ▼
┌──────────────────┐  ┌─────────────────────┐
│ Deterministic    │  │ Validation Engine   │
│ Compilers        │  │ - schema checks     │
│ - Verse emitter  │  │ - static lint       │
│ - device emit    │  │ - compile smoke test│
│ - layout emit    │  │ - repair loop       │
└────────┬─────────┘  └──────────┬──────────┘
         └────────────┬──────────┘
                      ▼
            ┌──────────────────┐
            │ Scaffold Packager│
            │ - project files  │
            │ - docs/manifests │
            │ - reports        │
            └──────────────────┘
```

### 5.2 Generation Pipeline

```
User Prompt
    │
    ▼
[1] Intent Extractor ─── genre, constraints, style, session length
    │
    ▼
[2] Template Router ──── picks base genre template + prefab families
    │
    ▼
[3] World Planner ────── zones, progression beats, core gameplay loop
    │
    ├──────────────────┬──────────────────┐
    ▼                  ▼                  ▼
[4a] Layout       [4b] Systems       [4c] Balance
     Planner           Planner            Planner
     grid/zones        devices/rules      economy/loot
    │                  │                  │
    └──────────────────┼──────────────────┘
                       ▼
               [5] World IR Merger
                       │
                       ▼
            [6] Deterministic Compilers
         (Verse / devices / loot / prefabs)
                       │
                       ▼
              [7] Validator + Repair
                       │
                       ▼
                 [8] Packager
                       │
                       ▼
              UEFN Scaffold Workspace
```

### 5.3 Runtime Prefab Randomization

```
OFFLINE (AI generates):
  Zone_A variants: [forest_dense, forest_sparse, ruins]
  Zone_B variants: [mine_small, mine_tall, cave_split]

IN UEFN (creator places variant sets)

RUNTIME (Verse selects):
  Randomizer → picks seed → selects one variant per zone
  → enables matching props/devices → disables hidden ones
  → adjusts loot weights

RESULT: Map feels different each run, but all content is pre-authored
```

### 5.4 Job Lifecycle

```
draft → planning → generated → validating → packaged → complete
  \         \             \            \
   → cancelled  → failed    → failed    → failed_validation
```

---

## 6. Tech Stack

| Layer | Choice | Rationale |
|---|---|---|
| **Language** | TypeScript | Fast iteration, shared types across CLI/desktop/core |
| **Runtime** | Node.js 20 LTS | Stable, mature ecosystem |
| **Monorepo** | pnpm workspaces + Turborepo | Fast local dev, package boundaries |
| **CLI** | Commander.js | Simple, reliable CLI ergonomics |
| **Desktop** | Electron + React + Vite | Windows-first, good filesystem/process integration |
| **UI** | React + Tailwind + Zustand | Fast implementation, low complexity |
| **Local DB** | SQLite (`better-sqlite3`) | Local-first metadata, prompt history, cache |
| **Schema** | Zod + JSON Schema export | Strong typing, runtime validation |
| **LLM** | Anthropic/OpenAI SDK abstraction | Provider flexibility |
| **Logging** | Pino | Fast structured logging |
| **Testing** | Vitest + Playwright | Unit + desktop automation |
| **Config** | YAML + JSON | Human-friendly configs, machine-readable outputs |

---

## 7. Data Models

### 7.1 World Project Schema

```ts
interface WorldProject {
  specVersion: "wg/1.0";
  projectId: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;

  source: {
    mode: "map-studio" | "verse-copilot";
    prompt: string;
    seed: number;
    references?: string[];
  };

  target: {
    genre: "tycoon" | "battle_arena" | "adventure" | "roleplay";
    uefnVersion: string;
    outputMode: "scaffold" | "scaffold_plus_automation";
  };

  design: {
    fantasy: string;
    coreLoop: string[];
    sessionLengthMin: number;
    progressionStyle: "linear" | "branching" | "round-based" | "sandbox";
  };

  layout: LayoutSpec;
  systems: SystemsSpec;
  devices: DeviceInstance[];
  prefabs: PrefabPlacementPlan;
  scripts: VerseModuleSpec[];
  balance: BalanceSpec;
  outputs: OutputManifest;
  validation: ValidationReport[];
}
```

### 7.2 Layout Schema

```ts
interface LayoutSpec {
  worldType: "grid2d" | "hub_and_spoke" | "lane" | "open_world_zones";
  bounds: { width: number; depth: number; height?: number };
  zones: ZoneSpec[];
  spawnPoints: SpawnPoint[];
}

interface ZoneSpec {
  zoneId: string;
  name: string;
  purpose: "starter_area" | "resource_area" | "combat_area" | "shop"
    | "upgrade_lane" | "boss_area" | "social_hub" | "unlock_gate";
  footprint: { x: number; y: number; w: number; h: number };
  elevation?: number;
  requiredDevices?: string[];
  allowedPrefabTags?: string[];
  progressionGate?: {
    currency?: string;
    cost?: number;
    minLevel?: number;
    prerequisiteZoneIds?: string[];
  };
}
```

### 7.3 Economy Schema

```ts
interface EconomySpec {
  currencies: CurrencySpec[];
  generators: IncomeSource[];
  sinks: CurrencySink[];
  targetCurves: {
    timeToFirstUpgradeSec: number;
    timeToAutomationMin?: number;
    timeToPrestigeMin?: number;
  };
}
```

### 7.4 Device Instance Schema

```ts
interface DeviceInstance {
  id: string;
  type: "trigger" | "button" | "item_granter" | "item_spawner" | "barrier"
    | "tracker" | "score_manager" | "creature_spawner" | "save_point"
    | "teleporter" | "hud_message" | "prop_mover" | "timer";
  label: string;
  transform: {
    location: { x: number; y: number; z: number };
    rotation: { pitch: number; yaw: number; roll: number };
  };
  properties: Record<string, string | number | boolean | string[]>;
  channels?: { listens: string[]; transmits: string[] };
  events?: DeviceEventBinding[];
  zoneId?: string;
  tags?: string[];
}
```

### 7.5 Template Schema

```ts
interface TemplateDefinition {
  templateId: string;          // "tycoon/lumber-mill"
  version: string;
  genre: "tycoon" | "battle_arena" | "adventure" | "roleplay";
  extends?: string;            // base template
  summary: string;
  layoutRules: {
    minZones: number;
    maxZones: number;
    requiredZonePurposes: string[];
    layoutStyle: LayoutSpec["worldType"];
  };
  systemModules: { required: string[]; optional: string[] };
  devicePolicies: {
    allowedDeviceTypes: string[];
    requiredDeviceTypes: string[];
  };
  verseModules: { required: string[]; optional: string[] };
  prefabTags: string[];
  validationProfiles: string[];
}
```

### 7.6 Prefab & Variant Zone Schema

```ts
interface PrefabDefinition {
  prefabId: string;
  name: string;
  category: "building" | "foliage" | "industrial" | "decor" | "combat" | "npc_set";
  tags: string[];
  footprint: { w: number; d: number; h: number };
  style: string;
  supportedGenres: string[];
  compatibleZones: string[];
}

interface VariantZone {
  zoneId: string;
  selectionMode: "one_of_n" | "weighted_pool" | "daily_rotation";
  variants: VariantChoice[];
  runtimeSeedSource: "project_seed" | "session_seed" | "round_seed";
}

interface VariantChoice {
  variantId: string;
  prefabIds: string[];
  weight: number;
  deviceOverrides?: Record<string, Record<string, unknown>>;
}
```

### 7.7 Verse AST Schema

```ts
type VerseNode = VerseModule | VerseImport | VerseClass | VerseField
  | VerseFunction | VerseStatement | VerseExpression;

interface VerseModule {
  kind: "module";
  name: string;
  imports: VerseImport[];
  declarations: Array<VerseClass | VerseFunction>;
}

interface VerseClass {
  kind: "class";
  name: string;
  extends?: string;
  fields: VerseField[];
  methods: VerseFunction[];
}

interface VerseField {
  kind: "field";
  name: string;
  type: string;
  editable?: boolean;
  defaultValue?: VerseExpression;
}

interface VerseFunction {
  kind: "function";
  name: string;
  params: VerseParam[];
  returnType?: string;
  attributes?: string[];      // "suspends", "override", etc.
  body: VerseStatement[];
}
```

---

## 8. CLI Interface

### 8.1 Commands

```bash
# Project
uefn-ai init <name> --genre <genre>          # Scaffold workspace config
uefn-ai create "<prompt>" --genre --template --out --seed  # Full generation
uefn-ai plan <project-dir> --interactive      # Design artifacts only
uefn-ai generate <project-dir> --strict       # Compile from existing plan
uefn-ai validate <project-dir>               # Run all validators
uefn-ai export <project-dir> --format zip    # Package handoff bundle
uefn-ai resume <jobId>                       # Resume failed run

# Verse Copilot
uefn-ai verse generate "<description>" --context <dir> --out <file>
uefn-ai verse fix <file> --errors <error-log>
uefn-ai verse explain <file>

# Library
uefn-ai templates list
uefn-ai templates inspect <id>
uefn-ai prefabs list
uefn-ai prefabs build-pack <dir> --name "<name>"

# System
uefn-ai doctor                               # Check local env
uefn-ai config                               # Edit config
```

### 8.2 Global Flags

| Flag | Description |
|---|---|
| `--out <path>` | Output directory |
| `--seed <number>` | Deterministic seed |
| `--model <id>` | Override default model |
| `--provider <id>` | Choose AI provider |
| `--template <id>` | Force template |
| `--genre <id>` | Override inferred genre |
| `--dry-run` | Plan only, no writes |
| `--budget <usd>` | Stop if inference cost exceeds threshold |
| `--verbose` | Detailed logs |
| `--json` | Machine-readable output |
| `--interactive` | Ask clarifying questions |
| `--strict` | Fail on warnings |

### 8.3 Example Session — Full Tycoon Generation

```bash
$ uefn-ai create \
  "A colorful lumber tycoon for 8 players. Chop trees, sell logs, \
   unlock sawmills, buy pets, and prestige into a new biome every 20 min." \
  --genre tycoon \
  --template tycoon/lumber-mill \
  --out ./projects/lumber-legends \
  --seed 42
```

```
[1/8] Parsing prompt...
  Genre: tycoon | Session: 20-30 min
  Core loop: gather → process → upgrade → automate → prestige

[2/8] Selecting template...
  Using: tycoon/lumber-mill@1.0.0
  Modules: economy, progression, save, rebirth, variant-zones

[3/8] Planning world...
  Zones: 7 (Pine Camp → Frozen Ridge → Ember Island)

[4/8] Balancing economy...
  First upgrade: 65s | Automation: 6.5m | Prestige: 21m
  ⚠ Pet economy flattened to reduce early snowballing

[5/8] Generating Verse...
  12 modules emitted | Compile confidence: 0.86

[6/8] Building device manifests...
  48 devices | 6 variant zones | 5 loot tables

[7/8] Validating...
  Schema: OK | Cross-refs: OK | Verse lint: OK
  Compile: 11/12 passed
  Repairing PetBonusManager.verse ... OK

[8/8] Packaging...
  ✓ Wrote scaffold to ./projects/lumber-legends

Next steps:
  1. Open README-UEFN-IMPORT.md
  2. Import Verse files into your UEFN project
  3. Place devices using manifests/device_manifest.json
  4. Run validation checklist in docs/QA-CHECKLIST.md
```

### 8.4 Example Session — Verse Copilot Repair

```bash
$ uefn-ai verse fix ./Verse/TycoonSaveManager.verse --errors ./logs/compile-errors.txt

Loaded 3 compiler errors.
Mapped to AST nodes:
  - missing optional unwrap guard
  - invalid event subscription signature
  - type mismatch in currency map

Patched: ./Verse/TycoonSaveManager.verse
Re-ran validator: PASS
```

---

## 9. AI Pipeline Detail

### 9.1 Design Principles

1. **LLMs plan; deterministic code emits**
2. **Every stage outputs typed JSON**
3. **Specialized sub-agents, not one mega prompt**
4. **Retry invalid JSON with explicit schema feedback**
5. **Repair loops only after deterministic validation**

### 9.2 Pipeline Stages

| Stage | Agent | Input | Output |
|---|---|---|---|
| 1 | Intent Extractor | user prompt | normalized brief JSON |
| 2 | Template Router | brief + registry | template selection |
| 3 | World Planner | brief + template | zones, themes, loop |
| 4a | Layout Planner | design draft | coordinates, grid |
| 4b | Systems Planner | design draft | economy, combat, quests |
| 4c | Balance Planner | systems spec | balanced tables |
| 5 | — | all plans | merged World IR |
| 6 | Device Mapper | layout + systems | device instances |
| 7 | Verse Planner | systems + devices | module plan |
| 8 | Verse Generator | module plan | Verse AST |
| 9 | Reviewer/Fixer | AST + errors | patched AST/code |
| 10 | — | all artifacts | packaged scaffold |

### 9.3 Model Temperature Guidance

- Planning/creative stages: `0.4–0.7`
- Code/system stages: `0.1–0.3`
- Repair stages: `0.0–0.2`

### 9.4 Deterministic Balancing (Tycoon)

LLMs propose qualitative pacing; a simulation engine validates:

| Target | Value |
|---|---|
| First reward | < 30 sec |
| First purchase | 45–90 sec |
| Automation unlock | 5–8 min |
| First prestige | 15–25 min |
| Late-game stagnation | < 3 min |

If targets miss, the balancer auto-adjusts resource income, upgrade costs, loot weights, NPC efficiency, and zone unlock costs.

### 9.5 Validation & Repair Loop

```
Generate → Validate → Parse errors → Patch → Revalidate
```

- Max **3 repair passes** per module
- Fail hard after 3 with actionable report
- Repair inputs: emitted code + exact errors + surrounding interfaces + style guide

### 9.6 Caching & Reproducibility

Cache key: prompt + template version + model ID + schema version + seed + prior artifact hashes

Enables: resume, diffing, lower API cost, reproducible builds.

---

## 10. Verse Code Generation

### 10.1 Strategy

**Generate Verse through IR + AST + templates**, not direct one-shot prose-to-code.

```
Natural language → Module plan → Semantic IR → Verse AST → Verse emitter → Lint → Fix loop
```

### 10.2 Module Boundaries (Tycoon)

| Module | Purpose |
|---|---|
| `GameManager.verse` | Lifecycle, player join/leave |
| `EconomyManager.verse` | Currency tracking, transactions |
| `UpgradeManager.verse` | Upgrade definitions, unlocks |
| `PurchaseButtonController.verse` | Purchase interaction handling |
| `ResourceNodeController.verse` | Resource gathering logic |
| `PrestigeManager.verse` | Rebirth/reset with bonuses |
| `SaveManager.verse` | Persistence hooks |
| `VariantZoneRandomizer.verse` | Prefab variant selection |
| `LootRoller.verse` | Weighted random loot |
| `HUDController.verse` | Status display updates |

### 10.3 Verse Patterns Supported in v1

1. Device references via `@editable` fields
2. Event subscription on `OnBegin`
3. Player join/leave handling
4. Currency/resource tracking
5. Unlock checks
6. Async timers (`Sleep`, `Await`)
7. Random weighted selection
8. Zone/biome progression
9. Save/load wrappers
10. HUD/status updates

### 10.4 Validation Levels

| Level | Check |
|---|---|
| **L1 Structural** | Unique module names, resolvable imports, referenced devices exist |
| **L2 Syntax** | AST integrity, emitter sanity |
| **L3 Compile** | Smoke test where available, structured error diagnostics |
| **L4 Semantic** | Missing null guards, impossible event targets, broken progression links |

### 10.5 Example Generated Verse

```verse
using { /Fortnite.com/Devices }
using { /Verse.org/Simulation }

tycoon_economy_manager := class(creative_device):

    @editable
    SellTrigger : trigger_device = trigger_device{}

    @editable
    RewardTracker : tracker_device = tracker_device{}

    var PlayerCurrency : [player]int = map{}

    OnBegin<override>()<suspends>:void =
        SellTrigger.TriggeredEvent.Subscribe(HandleSell)

    HandleSell(Agent:agent):void =
        if (Player := player[Agent]):
            Current := GetCurrency(Player)
            set PlayerCurrency[Player] = Current + 25
            UpdateHud(Player)

    GetCurrency(Player:player):int =
        if (Value := PlayerCurrency[Player]):
            return Value
        return 0

    UpdateHud(Player:player):void =
        RewardTracker.SetValue(Player, GetCurrency(Player))
```

### 10.6 Verse Copilot Modes

| Mode | Input | Output |
|---|---|---|
| **Generate** | Plain English + project context | New Verse file |
| **Fix** | Verse file + compiler errors | Repaired file |
| **Explain** | Verse file | Plain-English summary |
| **Refactor** | Existing file | Cleaner module, same behavior |

---

## 11. Map Genre Templates

### Template Inheritance

```
tycoon/base
  ├─ tycoon/lumber-mill
  ├─ tycoon/mining-empire
  └─ tycoon/factory-line

battle_arena/base
adventure/base
roleplay/base
```

### Genre Selection Rules

| If prompt mentions... | Genre |
|---|---|
| "upgrade", "automation", "rebirth", "sell", "unlock plots" | **Tycoon** |
| "rounds", "weapons", "FFA", "teams", "arena" | **Battle Arena** |
| "quests", "boss", "explore", "collect relics" | **Adventure** |
| "jobs", "city", "hangout", "social" | **Roleplay** |

### Tycoon Template (v1 Primary)

Generates: starter resource loop, sell/bank currency, unlockable zones, purchase buttons, processors/automation, prestige/rebirth, save hooks, variant biome zones, loot/pet bonuses.

Typical output: 6–10 zones, 8–15 Verse modules, 30–80 devices, 3–6 loot tables, 1 economy simulation report.

### Battle Arena Template

Generates: round manager, spawn logic, loadout config, scoring, hazard zones, weapon rotation.

### Adventure Template

Generates: hub + quest zones, quest chains, enemy waves, checkpoints, boss scripting, dialogue scaffolds.

### Roleplay Template

Generates: town layout, jobs/activities, currency/shop loops, housing hooks, social hub systems.

---

## 12. Generated Project Structure

```
lumber-legends/
├─ worldgen.config.yaml
├─ worldgen.lock.json
├─ README.md
├─ README-UEFN-IMPORT.md
├─ docs/
│  ├─ DESIGN-SUMMARY.md
│  ├─ SYSTEMS-OVERVIEW.md
│  ├─ DEVICE-WIRING.md
│  ├─ QA-CHECKLIST.md
│  └─ BALANCE-REPORT.md
├─ .ai/
│  ├─ job.json
│  ├─ prompt.normalized.json
│  ├─ planner/
│  │  ├─ world-design.json
│  │  ├─ layout.json
│  │  ├─ systems.json
│  │  ├─ balance.json
│  │  └─ module-plan.json
│  ├─ validation/
│  │  ├─ schema-report.json
│  │  ├─ crossref-report.json
│  │  ├─ verse-lint-report.json
│  │  └─ compile-report.json
│  └─ cache/
├─ manifests/
│  ├─ world.project.json
│  ├─ layout.grid.json
│  ├─ device_manifest.json
│  ├─ prefab_manifest.json
│  ├─ loot_tables.json
│  ├─ economy.json
│  ├─ progression.json
│  └─ variant_zones.json
├─ Verse/
│  ├─ GameManager.verse
│  ├─ EconomyManager.verse
│  ├─ UpgradeManager.verse
│  ├─ ResourceNodeController.verse
│  ├─ PurchaseButtonController.verse
│  ├─ PrestigeManager.verse
│  ├─ SaveManager.verse
│  ├─ LootRoller.verse
│  ├─ VariantZoneRandomizer.verse
│  └─ HUDController.verse
├─ templates/
│  └─ resolved-template.json
└─ exports/
   ├─ project-handoff.zip
   └─ import-checklist.txt
```

---

## 13. Source Code Structure

```
ai-uefn-world-generator/
├─ apps/
│  ├─ cli/                      # Commander.js CLI app
│  └─ desktop/                  # Electron + React desktop app
├─ packages/
│  ├─ core/                     # Orchestration engine + job state machine
│  ├─ ai/                       # Model adapters, prompt chains, agents
│  ├─ schemas/                  # Zod schemas + JSON Schema export
│  ├─ templates/                # Genre templates + inheritance
│  ├─ prefabs/                  # Prefab catalog + metadata
│  ├─ verse/                    # Verse IR, AST, emitter, lint
│  ├─ validators/               # Schema/integrity/compile validators
│  ├─ balance/                  # Economy/loot simulators
│  ├─ packager/                 # Scaffold export + docs generation
│  └─ shared-ui/                # Reusable React components
├─ evals/
│  ├─ golden-prompts/           # Test prompts per genre
│  ├─ expected-artifacts/       # Expected outputs for comparison
│  └─ benchmarks/               # Performance + quality metrics
├─ docs/
├─ scripts/
├─ package.json
└─ turbo.json
```

---

## 14. Milestones

### M0: 2-Week MVP

**Goal:** CLI that generates tycoon scaffolds + Verse Copilot

#### Week 1
| Days | Deliverable |
|---|---|
| 1–2 | Monorepo setup, schemas package, CLI skeleton, config + API key handling |
| 3–4 | Prompt normalizer, template registry, tycoon/base template, world/layout planner |
| 5 | Systems/economy planner, first pass output manifests |

#### Week 2
| Days | Deliverable |
|---|---|
| 6–7 | Verse IR + emitter, Verse Copilot generate/fix mode |
| 8 | Validator framework, schema + cross-reference checks |
| 9 | Packager, README/docs generation |
| 10 | Golden prompt tests, 3 end-to-end sample tycoon projects, MVP packaging |

### M1: 6-Week Beta

| Week | Deliverable |
|---|---|
| 3 | Electron desktop shell, project browser, prompt wizard, layout preview |
| 4 | Prefab catalog ingestion, variant zone system, lumber-mill + mining templates |
| 5 | Battle arena + adventure templates, improved repair loop, balance simulator |
| 6 | Roleplay template, export polish, telemetry, pricing hooks, beta hardening |

---

## 15. Acceptance Criteria

### MVP

| # | Criterion | Verification |
|---|---|---|
| AC1 | CLI generates tycoon scaffold from single prompt | Run `uefn-ai create` on 20 golden prompts |
| AC2 | All generated JSON passes schema validation | Automated schema test suite |
| AC3 | ≥80% of golden prompts produce valid projects on first pass | Eval benchmark |
| AC4 | ≥90% succeed after up to 3 repair passes | Eval benchmark |
| AC5 | Median e2e generation time < 8 min | Performance test |
| AC6 | Verse Copilot generates/fixes in < 45 sec | Performance test |
| AC7 | Deterministic reruns with same seed produce equivalent manifests | Diff test |
| AC8 | Runs are resumable by job ID | Resume interrupted job test |

### Beta

| # | Criterion | Verification |
|---|---|---|
| AC9 | 4 genre templates working (tycoon, arena, adventure, roleplay) | Genre coverage test |
| AC10 | Desktop app can create, inspect, and re-run repair steps | Manual QA |
| AC11 | Prefab variant zones work in ≥2 sample projects | UEFN import test |
| AC12 | ≥75% of 40 cross-genre golden prompts complete without manual fixes | Eval benchmark |
| AC13 | Generated tycoon meets target pace bands ±20% in simulation | Balance sim test |

---

## 16. Monetization

### Pricing Tiers

| Tier | Includes |
|---|---|
| **Free** | Limited Verse Copilot, 1-2 generations/month, community templates |
| **Pro** ($19/mo) | Higher limits, premium templates, prefab packs, desktop tools |
| **Studio** ($49/mo) | Shared templates, private prefab catalogs, priority support |

### Additional Revenue

- **Template marketplace** — premium genre templates, niche loops
- **Prefab/theme packs** — fantasy village, industrial, sci-fi, cozy forest
- **Credit overages** — for heavy generation/repair cycles
- **Agency/white-label** — custom template packs for studios/brands

---

## 17. Open Questions

| # | Question | Impact | Priority |
|---|---|---|---|
| Q1 | How much UEFN editor automation is truly possible? | Determines handoff UX | High |
| Q2 | Scriptable/headless compile flow available? | Validation quality | High |
| Q3 | Which Verse grammar/tooling is stable enough for parsing? | AST reliability | High |
| Q4 | UEFN device count / memory / replication limits? | Generation constraints | Medium |
| Q5 | How far should v1 go on persistence (save/load)? | Feature scope | Medium |
| Q6 | Asset licensing for commercial prefab packs? | Legal | Medium |
| Q7 | Epic policy on AI-generated Verse/configs? | Compliance | High |
| Q8 | How much template customization to expose? | UX vs reliability | Medium |

---

## 18. Future / v2 Backlog

### High Priority
- Visual layout editor (drag/drop zones, regenerate changed sections)
- Direct UEFN editor bridge (if Epic provides hooks)
- Deterministic economy/combat simulation harness
- Collaborative workflows (shared state, review, version compare)
- Template marketplace (community + premium)
- Advanced Verse refactor mode (split modules, generate tests)

### Strategic Bets
- Map evolution from playtest analytics
- Bring-your-own prefab pipeline
- Local/private model support for studios
- Map diff / UEFN version migration assistant
- Genre expansion: social deduction, survival crafting, parkour, co-op raid

---

## Appendix: Product Positioning

> **A pre-build AI operating system for UEFN creators:** from idea to scaffolded island, Verse code, balance tables, and prefab-driven replayability.

**Not:** "AI inside Fortnite" / "one-click full game" / "magic binary map generator"
