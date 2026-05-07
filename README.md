# ForgeAI — AI-Powered UEFN World Generator

> Turn natural-language game ideas into **UEFN project scaffolds**: Verse code, device manifests, layout plans, economy configs, loot tables, and import instructions.

## Quick Start

```bash
# Clone and build
git clone https://github.com/nachobr/uefnaigen.git
cd uefnaigen
pnpm install && pnpm build

# Link the CLI globally
cd apps/cli && pnpm link --global && cd ../..

# Set your API key (any one provider works)
export GOOGLE_API_KEY=...
# or: export ANTHROPIC_API_KEY=sk-...
# or: export OPENAI_API_KEY=sk-...
# or: export GROQ_API_KEY=gsk_...

# Generate a project
uefn-ai create "A colorful lumber tycoon for 8 players. Chop trees, sell logs, unlock sawmills, buy pets, and prestige every 20 min."
```

## Features

- **Prompt → Scaffold** — Full UEFN project from a single sentence
- **Tycoon-first reference path** — Lumber, mining, and compact tycoon scaffolds are the priority for importability hardening
- **6 Genre Templates** — Tycoon (base, lumber-mill, mining-empire), Battle Arena, Adventure, Roleplay
- **Verse Copilot** — Generate, fix, and explain Verse scripts
- **Economy Balancer** — Deterministic simulator validates income/sink curves
- **Prefab System** — 74 prefabs across 6 theme packs with variant zone randomization
- **Validation + Repair** — Structural, schema, cross-reference checks with auto-fix + UEFN memory checker

## Commands

| Command | Description |
|---|---|
| `uefn-ai create <prompt>` | Generate a full UEFN project scaffold |
| `uefn-ai verse generate <desc>` | Generate a Verse script from English |
| `uefn-ai verse fix <file>` | Fix Verse compilation errors |
| `uefn-ai verse explain <file>` | Explain a Verse script |
| `uefn-ai templates list` | List available genre templates |
| `uefn-ai templates inspect <id>` | Show template details |
| `uefn-ai validate <dir>` | Run validators on a generated project |
| `uefn-ai prefabs list` | Browse the prefab catalog |
| `uefn-ai resume <jobId>` | Check status of a previous job |
| `uefn-ai doctor` | Check environment setup |

## Create Options

```
--genre <genre>      Override inferred genre (tycoon, battle_arena, adventure, roleplay)
--template <id>      Force a specific template
--out <path>         Output directory (default: ./output)
--seed <number>      Deterministic seed for reproducible output
--model <id>         Override LLM model
--provider <id>      Choose AI provider (anthropic, openai, groq, ollama)
--budget <usd>       Stop if inference cost exceeds threshold
--dry-run            Plan only, no file writes
--zip                Export as .tar.gz archive
--json               Machine-readable JSON output
--strict             Fail on warnings
--verbose            Detailed logs
```

## Generated Output

```
output/
├── manifests/           # JSON data files
│   ├── world.project.json
│   ├── layout.grid.json
│   ├── device_manifest.json
│   ├── economy.json
│   ├── loot_tables.json
│   └── progression.json
├── Verse/               # Verse scripts for UEFN
├── docs/                # Design docs & guides
│   ├── DESIGN-SUMMARY.md
│   ├── SYSTEMS-OVERVIEW.md
│   ├── DEVICE-WIRING.md
│   ├── QA-CHECKLIST.md
│   ├── BALANCE-REPORT.md
│   └── HANDOFF-CHECKLIST.md
├── .ai/                 # Planner artifacts
├── README.md
├── README-UEFN-IMPORT.md
└── worldgen.config.yaml
```

## Tycoon Reference Scaffolds

For importability work, start with tycoon references before broadening genre surface area:

```bash
# Canonical lumber tycoon reference
uefn-ai create "A colorful lumber tycoon for 8 players. Chop trees, sell logs, unlock sawmills, buy workers, and prestige every 20 minutes." \
  --genre tycoon --template tycoon/lumber-mill --seed 101 --out ./references/tycoon-lumber-starter

# Mining tycoon reference
uefn-ai create "A mining empire tycoon for 8 players. Mine ore, smelt bars, upgrade pickaxes and drills, unlock deeper caves, hire miners, and prestige for gem multipliers." \
  --genre tycoon --template tycoon/mining-empire --seed 202 --out ./references/tycoon-mining-starter
```

See [`docs/TYCOON-REFERENCE-SCAFFOLDS.md`](./docs/TYCOON-REFERENCE-SCAFFOLDS.md) for acceptance criteria and the deferred non-tycoon scope.

## Supported Providers

| Provider | Model | Env Variable |
|---|---|---|
| Google | Gemini 2.5 Flash | `GOOGLE_API_KEY` |
| Anthropic | Claude Sonnet 4 | `ANTHROPIC_API_KEY` |
| OpenAI | GPT-4o | `OPENAI_API_KEY` |
| Groq | Llama 3.3 70B | `GROQ_API_KEY` |
| Ollama | Any local model | Auto-detected |

Falls back automatically: Groq → Google → Anthropic → OpenAI → Ollama (local `qwen3.5:9b`).

## Architecture

- **Monorepo** — pnpm workspaces + Turborepo
- **12 packages** — schemas, ai, core, templates, balance, validators, verse, packager, prefabs, knowledge, desktop, cli
- **Pipeline** — Intent → Template → World → Layout → Systems → Balance → Devices → Verse → Validate

## Development

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests (191 tests across 9 packages)
pnpm test

# Run eval suite
npx tsx scripts/run-eval.ts
```

## License

MIT — see [LICENSE](./LICENSE).

## Disclaimer

Not affiliated with, endorsed by, or sponsored by Epic Games. **UEFN**, **Verse**, **Fortnite**, and related marks are trademarks of Epic Games, Inc. Generated Verse code, manifests, and assets are your responsibility under Epic's [Creator Rules](https://create.fortnite.com/) and the Fortnite EULA. Always review generated output before importing into UEFN or publishing an island.
