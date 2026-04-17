# ForgeAI — AI-Powered UEFN World Generator

> Turn natural-language game ideas into **UEFN project scaffolds**: Verse code, device manifests, layout plans, economy configs, loot tables, and import instructions.

## Quick Start

```bash
# Install
npm install -g uefn-ai

# Set your API key (any one provider works)
export GOOGLE_API_KEY=...
# or: export ANTHROPIC_API_KEY=sk-...
# or: export OPENAI_API_KEY=sk-...
# or: export GROQ_API_KEY=gsk_...

# Generate a project
uefn-ai create "A colorful lumber tycoon for 8 players. Chop trees, sell logs, unlock sawmills, buy pets, and prestige every 20 min."

# Or use without installing
npx uefn-ai create "..."
```

## Features

- **Prompt → Scaffold** — Full UEFN project from a single sentence
- **5 Genre Templates** — Tycoon (base, lumber-mill, mining-empire), Battle Arena, Adventure
- **Verse Copilot** — Generate, fix, and explain Verse scripts
- **Economy Balancer** — Deterministic simulator validates income/sink curves
- **Prefab System** — 24 prefabs with variant zone randomization
- **Validation + Repair** — Structural, schema, and cross-reference checks with auto-fix

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
│   └── BALANCE-REPORT.md
├── .ai/                 # Planner artifacts
├── README.md
├── README-UEFN-IMPORT.md
└── worldgen.config.yaml
```

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
- **8 packages** — schemas, ai, core, templates, balance, validators, verse, packager, prefabs
- **Pipeline** — Intent → Template → World → Layout → Systems → Balance → Devices → Verse

## Development

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests (117 tests)
pnpm test

# Run eval suite
npx tsx scripts/run-eval.ts
```

## License

MIT
