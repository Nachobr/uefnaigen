# ForgeAI Improvement Roadmap

> Consolidated enhancement plan for the UEFN AI Generator, synthesized from architectural and UX perspectives.

---

## 🔴 P0: Critical — Close the UEFN Loop

### 1. Automated `uefn-ai import` Command
**Current pain point:** Users generate files, read `README-UEFN-IMPORT.md`, then manually copy files into UEFN project directories.

**Implementation:**
```bash
uefn-ai import ./output/my-project --to "C:\Users\...\MyUEFNProject"
```
- Parse generated manifests and auto-place files into correct `Plugins/.../Content/` subfolders
- Validate target path is a legitimate UEFN project structure before writing
- Dry-run mode: `--dry-run` to preview file mappings without copying
- Idempotent: skip unchanged files, overwrite only if `--force` is passed

**Why this is P0:** The biggest drop-off risk is a user generating a project and failing to get it into UEFN. This bridges the gap.

---

### 2. Live UEFN Import Bridge (File Watcher)
**Evolution of #1:** A companion daemon/tool that watches the output directory and auto-syncs changes into a running UEFN session.

- Watch `output/` for manifest/Verse changes
- Hot-reload modified files into UEFN via file-system watching (UEFN auto-detects file changes)
- VS Code extension option for GUI feedback
- Configurable ignore patterns (e.g., skip `docs/` during dev)

---

## 🟠 P1: High — Developer Experience & Onboarding

### 3. Interactive `uefn-ai init` Wizard
Replace the manual "clone → install → link → set env var" flow with a guided setup:

```bash
$ uefn-ai init
✓ Detected UEFN at C:\Program Files\Epic Games\UEFN
✓ Select default AI provider: [Google/Anthropic/OpenAI/Groq/Ollama]
✓ Enter API key (stored in ~/.forgeai/config.json)
✓ Set default output directory: [./forgeai-projects]
✓ Enable telemetry? [y/N]
```

- Creates `~/.forgeai/config.json` with user defaults
- Detects UEFN installation paths automatically
- Validates API keys with a test ping before saving
- Supports `--reset` to reconfigure

---

### 4. Structured Interview Mode for `create`
Replace the single-string prompt with an optional interactive mode to reduce prompt engineering burden:

```bash
$ uefn-ai create --interactive
> Game title? [My UEFN Game]
> Genre? [tycoon/battle_arena/adventure/roleplay/hybrid]
> Player count? [1-100]
> Core loop? [gather/craft/combat/explore/build]
> Session length? [10min/20min/1hr/endless]
> Economy complexity? [simple/moderate/complex]
> Generate? [Y/n]
```

- Builds the natural-language prompt internally from answers
- Better reproducibility: same answers = same scaffold (with fixed seed)
- `--quick` flag to skip optional questions

---

### 5. `uefn-ai doctor --fix`
Enhance the existing `doctor` command with optional auto-remediation:

| Check | Auto-fix? | Action |
|-------|-----------|--------|
| Node.js version | Yes | Suggest nvm/fnm install command |
| Missing API key | Yes | Prompt for key and write to config |
| pnpm not installed | Yes | Provide install command for platform |
| UEFN not detected | No | Show manual path input |
| Outdated CLI | Yes | Offer `pnpm update -g uefn-ai` |

---

## 🟡 P2: Medium — Architecture & Composability

### 6. Composable Sub-Templates (Template Escape Hatches)
**Current:** 6 hardcoded genre buckets with tycoon-first priority.
**Target:** Mix-and-match mechanic modules.

```bash
# Instead of rigid genres:
uefn-ai create "..." --genre tycoon

# Support hybrid mechanics:
uefn-ai create "..." --mechanics tycoon:core,battle_arena:combat_phase,adventure:exploration
```

- Decompose existing templates into **mechanic cards** (economy loop, combat system, progression tree, social hub)
- Template engine assembles cards into coherent scaffolds
- Validation ensures mechanic compatibility (e.g., "battle_arena + roleplay" = warn about pacing conflict)

---

### 7. Library-First Architecture
**Current:** CLI is the primary interface.
**Change:** Make `@uefnaigen/core` the main product, CLI as thin wrapper.

```typescript
// Programmatic usage becomes first-class
import { ForgeAI } from '@uefnaigen/core';

const project = await ForgeAI.create({
  prompt: "A colorful lumber tycoon...",
  genre: 'tycoon',
  seed: 101,
  provider: 'anthropic'
});

await project.validate();
await project.export('./output');
```

**Benefits:**
- IDE plugins can embed without shelling out
- CI pipelines for automated game balance testing
- Web dashboards for non-technical designers
- Testing: unit tests against the library, not CLI stdout

---

### 8. UEFN-Native Output Structure
**Current:** Custom `manifests/` + `Verse/` + `docs/` layout.
**Option:** Emit `.fnproject` or flattened structure mapping 1:1 to UEFN Content Browser hierarchy.

```
output/
├── Content/
│   ├── FirstPerson/
│   ├── UI/
│   └── Verse/
├── Plugins/
│   └── MyGame/
│       └── Content/
└── .fnproject          # UEFN project descriptor
```

- `--format native` flag for UEFN-direct output
- `--format scaffold` (default) keeps current structure for human review
- Reduces cognitive load: "where does this file go in UEFN?" → already there

---

### 9. Verse Copilot Context Awareness
**Current:** `verse fix` appears file-local.
**Target:** Ingest entire project context for cross-file safe fixes.

- Parse all `.verse` files in project to build symbol table
- Read `device_manifest.json` to know available device APIs
- Read `economy.json` to understand game loop constraints
- Fix suggestions include impact analysis: "This change affects `player_manager.verse` line 42"

---

## 🟢 P3: Nice-to-Have — Polish & Power User Features

### 10. Prompt Versioning & A/B Diff (`uefn-ai diff`)
Store full generation metadata for reproducibility and comparison:

```bash
uefn-ai create "A colorful lumber tycoon... prestige every 20 min." --tag baseline
uefn-ai create "A colorful lumber tycoon... prestige every 15 min." --tag faster

uefn-ai diff baseline faster
# Output: 
#   economy.json: prestige_interval 1200s → 900s
#   balance-report.md: avg_session_revenue +12%
#   verse/prestige_manager.verse: 3 lines changed
```

- Store: prompt, seed, model, provider, output hash, timestamp
- Job registry in `.ai/jobs.json`
- `--resume <jobId>` already exists; extend to `--fork <jobId>` for iterative tuning

---

### 11. Multiplayer Balance Simulation
**Current:** Economy balancer is deterministic (single-player).
**Add:** Discrete-event simulation modeling 2–16 players competing.

- Race conditions: two players chop the same tree
- Inflation spikes: resource flood when all players prestige simultaneously
- Bottleneck detection: shared sawmill queue analysis
- Output: `MULTIPLAYER-BALANCE-REPORT.md` with recommended caps/cooldowns

---

### 12. Asset Gallery / Thumbnail Previews
**Current:** `prefabs list` is text-only JSON.
**Add:** Rich visual browsing.

- Terminal: use `chafa` or unicode block rendering for preview thumbnails
- Web: optional local server `uefn-ai gallery --port 3000` with filterable grid
- Link prefabs to existing Fortnite Creative asset IDs where applicable
- Export prefab catalog as HTML for sharing with art teams

---

### 13. `uefn-ai watch` Mode (Verse Hot-Fix Loop)
Rapid iteration for Verse development:

```bash
uefn-ai watch ./Verse/player_manager.verse
# Watches file → on save, runs verse fix → shows diff → confirms apply
```

- Integrate with `uefn-ai import` to push fixes back to UEFN automatically
- `--auto-apply` for trusted fix patterns (syntax errors only, not logic changes)

---

### 14. Expanded Structural Validation
Add UEFN-specific deep checks:

- **Verse context violations:** `player`-only functions in `module` context
- **Device naming collisions:** Custom names conflicting with Epic's standard device API
- **Cross-reference integrity:** `economy.json` currencies referenced in `loot_tables.json`
- **Performance warnings:** Verse loops without sleep/tick boundaries
- **Security:** No hardcoded API keys in generated Verse

---

### 15. `uefn-ai device add` Command
Incremental project building:

```bash
uefn-ai device add "Billboard" --project ./output/my-game
# Generates:
# - Device manifest entry
# - Verse snippet for billboard interaction
# - Wiring notes for DESIGN-SUMMARY.md
```

---

### 16. Loot Table Visualizer
Rich terminal output for `loot_tables.json`:

```bash
$ uefn-ai visualize loot_tables
📦 Legendary Crate
├── 🪓 Diamond Axe (5%) 
│   └── Condition: player.level >= 10
├── 🪵 Oak Log (45%)
│   └── Quantity: 10-20
└── 💰 Gold Coin (50%)
    └── Quantity: 50-100
```

- Color-coded by rarity
- Probability tree with cumulative odds
- Export to PNG/SVG for design docs

---

### 17. Template Creator
Codify custom best practices:

```bash
# From an existing project:
uefn-ai template create ./output/my-game --name "nacho-tycoon-v2" --genre tycoon
# Scaffolds new template from project's manifests + Verse patterns
```

- Extracts common patterns into reusable template
- Publishes to local template registry
- `--share` flag to export as `.tar.gz` for team distribution

---

### 18. Provider Cost Transparency
Real-time cost tracking per pipeline stage:

```
[Intent]        $0.02  |  4K tokens  |  Gemini Flash
[Template]      $0.01  |  2K tokens  |  Gemini Flash  
[World]         $0.08  |  12K tokens |  Claude Sonnet
[Layout]        $0.03  |  5K tokens  |  Claude Sonnet
[Balance]       $0.00  |  local      |  deterministic
[Verse]         $0.12  |  18K tokens |  Claude Sonnet
─────────────────────────────────────────────
Total: $0.26  |  Budget: $1.00  |  Remaining: $0.74
```

- `--budget` currently stops execution; add `--budget-warn 80%` for soft alerts
- Cost history in `.ai/costs.json` for project budgeting

---

### 19. Configurable Provider Fallback Chain
**Current:** Hardcoded `Groq → Google → Anthropic → OpenAI → Ollama`.
**Change:** User-configurable priority in `~/.forgeai/config.yaml`:

```yaml
providers:
  priority: [anthropic, groq, google, openai]
  routing:
    default: anthropic
    low_latency: groq        # --fast flag
    high_quality: anthropic  # --best flag
    free: ollama             # --local flag
  failover: true             # auto-fallback on error
```

- Per-command override: `uefn-ai create "..." --provider-priority fast`
- Regional latency detection: auto-prefer lowest-RTT provider

---

### 20. Collaborative / Versioning Layer (`.ai/overrides/`)
Git-like diffing for human edits vs. AI generation:

```
output/
├── .ai/
│   ├── generated/          # AI output (read-only baseline)
│   ├── overrides/            # Human edits (win on merge)
│   └── merge.log             # Conflict resolution history
```

- `uefn-ai regenerate --preserve-overrides` merges instead of overwriting
- Three-way diff: original prompt → generated output → human edits
- Team workflow: commit `overrides/` to git, regenerate safely

---

### 21. Error Telemetry (Opt-in `--report`)
Anonymous quality dataset for model improvement:

```bash
uefn-ai create "..." --report
# On validation failure, uploads:
# - Anonymized prompt
# - Model output
# - Error type + location
# - Fix attempt success/failure
```

- GDPR/CCPA compliant: no PII, no API keys
- Public dashboard showing common failure modes
- Future: train specialized Verse-repair model on this dataset

---

### 22. Community Health Files
- **`ROADMAP.md`:** Public-facing plan translating `TODO.md` into timeframes
- **`CONTRIBUTING.md`:** Monorepo structure (turbo/pnpm), how the 12 packages connect, where to add genre templates / prefab packs
- **Quick-start one-liners:** Complete copy-paste examples for all 6 genre templates in README
- **30-second demo GIF:** Terminal recording of `create` → `import` → UEFN result

---

## Implementation Phasing

| Phase | Focus | Deliverables |
|-------|-------|-------------|
| **Sprint 1** | Close the loop | `import` command, `init` wizard, `doctor --fix` |
| **Sprint 2** | Composability | Library-first refactor, composable templates, native output format |
| **Sprint 3** | Intelligence | Context-aware Verse copilot, multiplayer simulation, expanded validation |
| **Sprint 4** | Ecosystem | `watch` mode, gallery, template creator, telemetry, community docs |

---

## Bottom Line

The project has excellent validation hygiene and a solid monorepo foundation. The highest-leverage improvements are:

1. **Closing the UEFN import loop** — reduce friction from generation to playable island
2. **Making the generator composable** — escape rigid genre buckets to support hybrid games
3. **Library-first architecture** — enable IDE plugins, CI, and web dashboards
4. **Interactive onboarding** — `init` wizard and `--interactive` mode lower the barrier for non-technical creators
