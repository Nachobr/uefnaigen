# ForgeAI — Setup & Usage Guide

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

---

## 1. Configuration

ForgeAI loads config with this priority (highest wins):

```
CLI flags  →  Environment variables  →  Config file  →  Defaults
```

### Config File

Location: **`~/.forgeai/config.yaml`**

```yaml
# AI provider: google, anthropic, openai, groq, ollama
provider: google
model: gemini-2.5-flash

# API keys — fill in whichever providers you use
apiKeys:
  google: "your-google-api-key"
  anthropic: ""
  openai: ""
  groq: ""

# Local LLM (no API key needed)
ollamaBaseUrl: http://localhost:11434

# Output
outputDir: ./output
verbose: false

# Repair loop max passes (1-5)
maxRepairPasses: 3

# Optional: stop generation if cost exceeds this
# budgetUsd: 2.00
```

> **First time?** This file doesn't exist by default. Create it manually or run `uefn-ai doctor` to check your setup.

### Environment Variables

These override the config file:

```bash
# API keys (set whichever you have)
export GOOGLE_API_KEY=AIza...
export ANTHROPIC_API_KEY=sk-ant-...
export OPENAI_API_KEY=sk-...
export GROQ_API_KEY=gsk_...

# Optional overrides
export FORGEAI_PROVIDER=google        # force a provider
export FORGEAI_MODEL=gemini-2.5-flash # force a model
export FORGEAI_OUTPUT_DIR=./my-output
export FORGEAI_VERBOSE=true
```

> **Tip:** Add these to your `~/.zshrc` or `~/.bashrc` so they persist.

### CLI Flags

Override everything per-command:

```bash
uefn-ai create "A cozy bakery tycoon with recipes and automation" --provider google --model gemini-2.5-flash --budget 1.00
```

---

## 2. Getting API Keys

| Provider | Where to get a key | Free tier? |
|---|---|---|
| **Google** | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) | Yes — generous free tier |
| **Groq** | [console.groq.com](https://console.groq.com) | Yes — free tier available |
| **Anthropic** | [console.anthropic.com](https://console.anthropic.com) | No — pay-as-you-go |
| **OpenAI** | [platform.openai.com](https://platform.openai.com) | No — pay-as-you-go |
| **Ollama** | [ollama.com](https://ollama.com) | Free — runs locally |

---

## 3. Using a Local LLM (No API Key)

Install [Ollama](https://ollama.com), then:

```bash
# Pull a model (one-time, ~6GB download)
ollama pull qwen3.5:9b

# Use it with ForgeAI
uefn-ai create "A zombie survival adventure with crafting and boss waves" --provider ollama --model yourlocalmodel

# Or set it as default in config.yaml:
# provider: ollama
# model: qwen3.5:9b
```

The fallback chain auto-pulls `qwen3.5:9b` if all API providers fail.

---

## 4. Provider Fallback Chain

If you have multiple API keys set, ForgeAI tries them in order:

```
Groq → Google → Anthropic → OpenAI → Ollama (local)
```

If one fails (rate limit, network error), it automatically tries the next. No config needed — just set the keys and it works.

---

## 5. Check Your Setup

```bash
uefn-ai doctor
```

Output:
```
ForgeAI Doctor

  Node.js:    v24.12.0 ✓
  Anthropic:  ✗ ANTHROPIC_API_KEY not set
  OpenAI:     ✗ OPENAI_API_KEY not set
  Groq:       ✗ GROQ_API_KEY not set
  Google:     ✓ key set
  Ollama:     ✗ not detected at localhost:11434

✓ Ready to go!
```

---

## 6. Generate a Project

```bash
# Basic usage
uefn-ai create "A lumber tycoon for 8 players with prestige every 20 min"

# With options
uefn-ai create "Mining empire tycoon" \
  --genre tycoon \
  --seed 42 \
  --out ./my-project \
  --budget 2.00

# Dry run (plan only, no files written)
uefn-ai create "Arena FFA for 16 players" --dry-run

# Export as .tar.gz archive
uefn-ai create "Beach resort roleplay with jobs and housing" --zip

# JSON output (for scripting)
uefn-ai create "Team deathmatch arena for 8 players with loadouts" --json
```

---

## 7. Verse Copilot

Generate, fix, or explain Verse scripts:

```bash
# Generate a new script
uefn-ai verse generate "A score tracker that awards points on elimination"

# Fix compilation errors
uefn-ai verse fix path/to/broken_script.verse --errors path/to/errors.log

# Explain existing code
uefn-ai verse explain path/to/game_manager.verse
```

---

## 8. Browse Templates & Prefabs

```bash
# List all templates
uefn-ai templates list

# Inspect a specific template
uefn-ai templates inspect tycoon/lumber-mill

# List prefabs
uefn-ai prefabs list
uefn-ai prefabs list --category industrial
uefn-ai prefabs list --tag mining --json
```

---

## 9. Validate a Generated Project

```bash
uefn-ai validate ./output
```

Runs structural, schema, cross-reference, and memory checks. Use `--json` for machine-readable output.

---

## 10. File Locations

| Path | What it is |
|---|---|
| `~/.forgeai/config.yaml` | Your config file |
| `~/.forgeai/usage.json` | Tier usage tracking (generations/month, copilot/day) |
| `~/.forgeai/jobs/` | Saved job records (for `resume`) |
| `./output/` | Default generated project output |
| `./output/manifests/` | JSON data (devices, economy, layout) |
| `./output/Verse/` | Generated Verse scripts |
| `./output/docs/` | Design docs, wiring guides, QA checklist, handoff checklist |

---

## 11. Budget Control

Cap inference costs per run:

```bash
uefn-ai create "A factory automation tycoon with conveyor belts and prestige" --budget 1.50
```

Or set globally in `~/.forgeai/config.yaml`:

```yaml
budgetUsd: 2.00
```

The pipeline stops with a `BudgetExceededError` if the limit is hit.

---

## 12. Custom Prefabs

Place `.json` files in a directory, then load them:

```json
{
  "prefabId": "pfb_my_tree",
  "name": "My Custom Tree",
  "category": "foliage",
  "tags": ["tree", "custom"],
  "footprint": { "w": 3, "d": 3, "h": 8 },
  "style": "natural",
  "supportedGenres": ["tycoon", "adventure"],
  "compatibleZones": ["resource_area"]
}
```

The `loadUserCatalog(dir)` API loads all JSON prefabs from a directory and merges them with the built-in catalog.

---

## 13. Pricing Tiers

ForgeAI enforces usage limits based on your tier (set in `~/.forgeai/config.yaml`):

```yaml
tier: free   # free | pro | studio
```

| Feature | Free | Pro ($19/mo) | Studio ($49/mo) |
|---|---|---|---|
| Generations/month | 2 | 50 | 500 |
| Copilot calls/day | 10 | 100 | 1,000 |
| Premium templates | ✗ | ✓ | ✓ |
| Desktop app | ✗ | ✓ | ✓ |
| Private catalogs | ✗ | ✗ | ✓ |
| Shared templates | ✗ | ✗ | ✓ |

Usage is tracked locally in `~/.forgeai/usage.json`.
