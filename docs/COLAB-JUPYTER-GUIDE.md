# Running ForgeAI from Colab, Jupyter, or Antigravity

Use this path when you want a shared notebook to host the model instead of using a hosted API key or running a local LLM on your workstation.

ForgeAI's supported notebook path is now:

- `notebooks/forgeai_colab_t4_ollama_ngrok.ipynb`

This notebook runs an Ollama-compatible model on a Colab **T4 GPU**, exposes it through ngrok, and lets the ForgeAI CLI call that remote model with `--provider ollama --ollama-url <ngrok-url>`.

## Why we keep only the T4/Ollama notebook

The removed `forgeai_colab_tycoon.ipynb` notebook used a hosted Google Gemini API key from Colab Secrets and ran generation inside Colab. That path works, but it duplicates normal CLI/provider usage and still requires a hosted LLM API.

The T4/Ollama/ngrok notebook is the more useful collaborator workflow because it:

- uses Colab GPU compute for the model
- avoids hosted LLM API calls for generation
- keeps ForgeAI execution on your local machine or IDE terminal
- works with Antigravity's Colab extension as the notebook runner
- gives the CLI a normal Ollama-compatible HTTP endpoint

## What the notebook replaces

The notebook replaces local model hosting:

- installing Ollama locally
- downloading a multi-GB model on your workstation
- needing enough local VRAM/RAM for inference

It does **not** replace UEFN. UEFN import, Verse compilation, device placement, screenshots, and playtest evidence still happen on a Windows machine with UEFN installed.

## Colab T4 local model over ngrok

Recommended flow:

1. Open `notebooks/forgeai_colab_t4_ollama_ngrok.ipynb`.
2. In Colab, select **Runtime → Change runtime type → T4 GPU**.
3. Add `NGROK_AUTHTOKEN` in Colab Secrets, or paste it when prompted.
4. Run the notebook top-to-bottom until it prints `OLLAMA_PUBLIC_URL=https://...`.
5. Keep the Colab runtime open.
6. Run ForgeAI locally with `--provider ollama --model qwen2.5:7b-instruct --ollama-url <OLLAMA_PUBLIC_URL>`.

Example local command:

```bash
export FORGEAI_OLLAMA_BASE_URL="https://YOUR-NGROK-URL.ngrok-free.app"

uefn-ai create "A compact lumber tycoon for 4 players with one upgrade lane and worker automation." \
  --provider ollama \
  --model qwen2.5:7b-instruct \
  --ollama-url "$FORGEAI_OLLAMA_BASE_URL" \
  --genre tycoon \
  --template tycoon/lumber-mill \
  --seed 101 \
  --out ./output/colab-t4-lumber \
  --budget 0.01 \
  --zip
```

The budget can be very low because Ollama/local calls are priced at `$0` in ForgeAI's ledger. It is still useful as a guardrail if fallback providers are enabled.

## Testing with the Antigravity Colab extension

If you are using Antigravity IDE with the Colab extension, use it as the interactive runner for `notebooks/forgeai_colab_t4_ollama_ngrok.ipynb`.

Smoke test protocol:

1. Open `notebooks/forgeai_colab_t4_ollama_ngrok.ipynb` in Antigravity.
2. Connect the notebook to a Colab runtime with **T4 GPU**.
3. Add `NGROK_AUTHTOKEN` in Colab Secrets, or be ready to paste it in the prompt cell.
4. Run cells 1–7 only.
5. Confirm these outputs:
   - `nvidia-smi` shows a T4 GPU.
   - `ollama list` includes `qwen2.5:7b-instruct`.
   - the local `/api/chat` smoke test returns HTTP `200`.
   - the notebook prints `OLLAMA_PUBLIC_URL=https://...`.
   - `GET <OLLAMA_PUBLIC_URL>/api/tags` returns HTTP `200` and includes the model.
6. From this repo, run:

```bash
export FORGEAI_OLLAMA_BASE_URL="https://YOUR-NGROK-URL.ngrok-free.app"
pnpm --filter uefn-ai exec uefn-ai doctor \
  --provider ollama \
  --model qwen2.5:7b-instruct \
  --ollama-url "$FORGEAI_OLLAMA_BASE_URL"
```

Expected result: `Ollama` should pass and show the ngrok URL. Warnings about missing hosted API keys are fine when using `--provider ollama`.

Then run a small generation:

```bash
pnpm --filter uefn-ai exec uefn-ai create "A compact lumber tycoon for 4 players with one upgrade lane and worker automation." \
  --provider ollama \
  --model qwen2.5:7b-instruct \
  --ollama-url "$FORGEAI_OLLAMA_BASE_URL" \
  --genre tycoon \
  --template tycoon/lumber-mill \
  --seed 101 \
  --out ./output/colab-t4-lumber \
  --budget 0.01 \
  --zip
```

If the test fails, capture only these details before retrying: the failing cell number, the HTTP status/body from `/api/tags` or `/api/chat`, and the ForgeAI CLI error.

## Security notes

- The ngrok URL is public and Ollama has no built-in authentication.
- Keep the URL private and stop the tunnel when generation is done.
- Do not send secrets or proprietary prompts through a public unauthenticated tunnel.
- Keep the Colab runtime open until ForgeAI finishes; closing it kills the model server.

## Collaborator handoff

After ForgeAI writes the `.zip`:

1. Unzip it locally.
2. Open `README-UEFN-IMPORT.md`.
3. Import the Verse files into UEFN.
4. Place devices from `manifests/device_manifest.json`.
5. Follow `docs/HANDOFF-CHECKLIST.md`.
6. Copy `docs/UEFN-IMPORT-EVIDENCE-TEMPLATE.md` to `references/_reports/<reference>-uefn-import.md` and fill in compiler output, screenshots/video, playtest results, and manual fixes.

## Common issues

| Symptom | Fix |
|---|---|
| `nvidia-smi` does not show T4 | Change the Colab runtime type to T4 GPU and reconnect. |
| `NGROK_AUTHTOKEN` is missing | Add it in Colab Secrets and enable notebook access, or paste it when prompted. |
| Ollama installer says `requires zstd for extraction` | Re-run the install cell; it now installs `zstd` with `apt-get install -y -qq zstd` before running the Ollama installer. |
| `ollama pull` is slow | Keep the runtime active; model download can take several minutes. |
| Remote Ollama URL fails | Confirm the Colab runtime is alive, the ngrok tunnel is running, and `/api/tags` works from the public URL. |
| Generation is low quality or invalid JSON | Try a stronger Ollama model that fits T4, lower concurrency, or rerun with repair enabled. |
| UEFN import is blocked | UEFN work must happen outside Colab on a UEFN-capable Windows machine. |
