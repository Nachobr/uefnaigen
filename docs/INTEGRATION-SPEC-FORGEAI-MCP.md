# ForgeAI Live — Spec & Execution Plan

> **Status:** Approved plan, partially implemented. This document is written for an execution model to implement task-by-task.
> **Goal:** `uefn-ai create` generates a scaffold offline → `uefn-ai apply` materializes it in a live UEFN editor via the (vendored) UEFN MCP listener.
> **Upstream actuator:** `KirChuvakov/uefn-mcp-server` (3 Python files). We talk to its `uefn_listener.py` directly over HTTP (Transport B). MCP-native transport (A) comes later.

---

## 0. How to execute this document

1. Work the tasks **in order** (A1, A2, …). Each task is self-contained: goal, files, steps, acceptance criteria.
2. After **every** task run `pnpm build && pnpm test` from the repo root. Both must pass before moving on.
3. **Stage B is a human gate.** It requires Windows + a running UEFN editor. Do NOT attempt it as an LLM. Stop at the gate and report.
4. Do not re-decide anything in §1. Do not refactor code outside the listed files. Follow `AGENTS.md` (ESM `.js` imports, `type` imports, no comments unless non-obvious, tests in `src/__tests__/*.test.ts`, no LLM calls in unit tests).
5. If a task's acceptance criteria cannot be met as written, stop and report the blocker — do not improvise an alternative design.

---

## 1. Frozen decisions (context only — no action)

| Decision | Value |
|---|---|
| Product name | **ForgeAI Live**; bridge package `@forgeai/uefn-bridge` |
| Repo shape | Monorepo extension of `Nachobr/uefnaigen`. No new repo. Vendored fork of the MCP server in `vendor/uefn-mcp/` |
| Transport | **B — direct HTTP** from the TS bridge to `uefn_listener.py` (ports 8765–8770). Transport A (MCP stdio for Claude Code) is Stage C |
| Planner purity | `planApply()` is a **pure function** `manifests → ordered command list`. No IO, no network. All side effects live in `executor.ts` |
| Device identity | Abstract `DeviceType` → UEFN asset path mapping lives in **data** (`devices.catalog.json`), never hardcoded in logic. Real paths are discovered in Stage B; until then they are `null` and the executor skips those spawns |
| Idempotency identity | Spawned actors carry tags `forgeai`, `forgeai:<deviceId>`, `zone:<zoneId>` plus label set to the ForgeAI label. Re-apply matches by tag, falls back to label |
| Fallback | If Stage B shows Fortnite devices cannot be spawned/configured headlessly → pivot to "assisted placement" (CLI prints guided instructions). That pivot is a human decision, not yours |
| Verse compilation | Assume manual ("Build Verse Code" in UEFN). Stage B investigates automation; do not assume it exists |

---

## 2. Verified wire protocol (source of truth for all client code)

Verified against upstream `uefn_listener.py` (protocol version 0.2.0). **The bridge client MUST follow this exactly.**

### 2.1 Endpoints

There is **one endpoint**: the root path. There are **no per-tool paths**.

```
GET  http://127.0.0.1:{port}/   → health check + tool manifest
POST http://127.0.0.1:{port}/   → execute any command
```

- Port: listener binds the first free port in **8765–8770** (loopback only). Client must scan that range with `GET /` and use the first port whose response body has `"status": "ok"`.
- `Content-Type: application/json`.

### 2.2 Request envelope (POST body)

```json
{ "command": "<command_name>", "params": { } }
```

Both fields required. Params are spread as kwargs into the Python handler — **sending an unknown param key makes the command fail** (TypeError). Send only documented params.

### 2.3 Response envelope

| Case | HTTP | Body |
|---|---|---|
| Success | 200 | `{ "success": true, "result": { … } }` |
| Handler error | 200 | `{ "success": false, "error": "…", "traceback": "…" }` |
| Bad JSON / missing command | 400 | `{ "success": false, "error": "…" }` |
| Queue timeout (>30 s) | 504 | `{ "success": false, "error": "Command '…' timed out" }` |

`GET /` success body (no envelope): `{ "status": "ok", "version": "0.2.0", "port": 8765, "commands": [ … ] }`

### 2.4 Throughput

Listener processes ≤ **5 commands per editor tick**, 30 s max wait per command (then 504). HTTP requests are synchronous (each POST blocks until processed), so a serial client self-limits — no client-side rate limiting needed. Client timeout should be ≥ 35 s.

### 2.5 Commands used by the bridge (exact shapes)

| Command | params | result |
|---|---|---|
| `ping` | `{}` | `{ status, version, python_version, port, timestamp, commands }` |
| `get_project_info` | `{}` | `{ project_name, content_root, project_dir }` — `content_root` like `/MyProject/`, `project_dir` is an absolute Windows path |
| `get_all_actors` | `{ class_filter?: string }` | `{ actors: Actor[], count }` |
| `spawn_actor` | `{ asset_path?: string, actor_class?: string, location?: [x,y,z], rotation?: [pitch,yaw,roll] }` — **no `label` param** | `{ actor: Actor }` |
| `set_actor_transform` | `{ actor_path: string, location?: [x,y,z], rotation?: [p,y,r], scale?: [x,y,z] }` — `actor_path` accepts path name **or** label | `{ actor: Actor }` |
| `set_actor_properties` | `{ actor_path: string, properties: object }` | `{ actor_path, properties: { <key>: "ok" \| "<error: …>" } }` (per-key result; failures are per-property, not fatal) |
| `execute_python` | `{ code: string }` — assign to a variable named `result` to return a value | `{ result, stdout, stderr }` |
| `does_asset_exist` | `{ asset_path: string }` | `{ exists: boolean, asset_path }` |
| `list_assets` | `{ directory?: string, recursive?: boolean, class_filter?: string }` | `{ assets: string[], count }` |
| `save_current_level` | `{}` | `{ success: true }` |
| `get_editor_log` | (Stage C; check fork source for params) | log lines |

`Actor` serialization (upstream): `{ name, label, class, path, location: {x,y,z}, rotation: {pitch,yaw,roll}, scale: {x,y,z} }`.
⚠️ **Upstream `Actor` has NO `tags` field.** Our vendored fork adds it (Task A5). Until the fork is installed in the editor, tag-based read-back returns nothing — code must tolerate a missing `tags` field.

---

## 3. Current state — already implemented (do not rewrite, only modify where a task says so)

All in the working tree (uncommitted):

| File | Contents | Status |
|---|---|---|
| `packages/uefn-bridge/package.json`, `tsconfig.json` | Package scaffold, deps on `@forgeai/core`, `@forgeai/schemas`, zod | OK |
| `packages/uefn-bridge/src/plan.ts` | `planApply()` pure planner → `ApplyCommand[]` (`spawn_device`, `set_properties`, `wire_channels`, `create_spawn_point`, `write_verse`, `save_current_level`), warnings, stats | OK |
| `packages/uefn-bridge/src/catalog.ts` | Zod `DeviceCatalog` schema, `defaultDeviceCatalog` (all 13 `DeviceType` values, `assetPath: null`), `resolveDeviceType()` | **Defect D3** below |
| `packages/uefn-bridge/src/asset-map/devices.catalog.json` | Same 13 entries, all `null` | Unused (D3) |
| `packages/uefn-bridge/src/client.ts` | `UefnHttpClient`, `discoverUefnListener()` | **Defects D1, D2** below |
| `packages/uefn-bridge/src/executor.ts` | `executeApplyPlan()` — spawns, transforms-if-exists, properties, spawn points, verse writes, save, tag-based read-back, reconciliation summary | **Defect D2** below |
| `packages/uefn-bridge/src/loader.ts` | `loadApplyPlan(projectDir)` via `@forgeai/core` `loadProject()` | OK |
| `packages/uefn-bridge/src/__tests__/plan.test.ts`, `executor.test.ts` | Planner + executor unit tests (mock client) | Update with A1/A2 |
| `apps/cli/src/commands/apply.ts` | `uefn-ai apply <dir> [--dry-run] [--target-port]` — prints plan table, executes, prints reconciliation | Update with A3 |

### Known defects (the why behind tasks A1/A2)

- **D1 — client uses a fictional protocol.** `client.ts` POSTs to per-tool paths (`/spawn_actor`, `/ping`…) with flat bodies. Real protocol is §2: single `POST /` with `{command, params}` envelope and `{success, result}` response envelope. The current client cannot talk to a real listener at all.
- **D2 — wrong param/field names.** `actor_id` → must be `actor_path`. `spawn_actor` is sent a `label` param → upstream rejects unknown kwargs; label must instead be set via `execute_python` (`actor.set_actor_label(...)`). `getProjectInfo` consumer reads `projectPath` → real key is `project_dir` (snake_case). Spawn responses are read as `response.actor_id` → real shape is `result.actor.name` / `result.actor.path`.
- **D3 — catalog duplicated.** Catalog data exists both as code (`defaultDeviceCatalog` literal in `catalog.ts`) and as JSON (`asset-map/devices.catalog.json`, unused). Single source of truth must be the JSON file.

---

## 4. Stage A — offline-executable tasks (no UEFN needed; everything mock-tested)

> **A1 + A2 are one verification unit.** Rewriting the client's types necessarily breaks `executor.ts` compilation until A2 lands, so the full `pnpm build && pnpm test` gate applies **after A2**, not after A1. A1's own gate is narrower (see its Acceptance). Implement A1 then A2 back-to-back without stopping in between.

### Task A1 — Rewrite `client.ts` to the real wire protocol

**Files:** `packages/uefn-bridge/src/client.ts`, `packages/uefn-bridge/src/__tests__/client.test.ts` (new)

**Steps:**
1. Replace the transport core with one private method:
   ```ts
   private async command<T>(command: string, params: Record<string, unknown> = {}): Promise<T>
   ```
   - `POST ${baseUrl}/` with body `JSON.stringify({ command, params })`, header `content-type: application/json`.
   - Use `AbortSignal.timeout(35_000)`.
   - Parse JSON. If `body.success === true` return `body.result as T`. Otherwise throw `new UefnListenerError(command, body.error, response.status)` (define and export this error class in `client.ts`; include `command`, `status`, and listener `error` string in the message).
2. Define result types matching §2.5 exactly (snake_case keys, e.g. `UefnProjectInfo = { project_name?: string; content_root?: string; project_dir?: string }`, `UefnActor = { name?; label?; class?; path?; location?; rotation?; scale?; tags?: string[] }` — `tags` optional, fork-only).
3. Public methods (thin wrappers over `command`):
   - `ping(): Promise<boolean>` — `GET ${baseUrl}/` with a **2 s** timeout; return `true` iff HTTP ok and body `status === "ok"`; never throw.
   - `getProjectInfo(): Promise<UefnProjectInfo>` → `command("get_project_info")`
   - `getAllActors(classFilter?): Promise<UefnActor[]>` → `command("get_all_actors", …)`, return `result.actors ?? []`
   - `spawnActor({ asset_path, location, rotation }): Promise<UefnActor | undefined>` → `command("spawn_actor", …)`, return `result.actor`. **Do not send `label`.**
   - `setActorTransform(actorPath, location, rotation)` → params `{ actor_path, location, rotation }`
   - `setActorProperties(actorPath, properties): Promise<Record<string, string>>` → params `{ actor_path, properties }`, return `result.properties ?? {}` (per-key `"ok"` / error strings)
   - `executePython(code): Promise<{ result?: unknown; stdout?: string; stderr?: string }>`
   - `doesAssetExist(assetPath): Promise<boolean>` → `result.exists === true`
   - `saveCurrentLevel(): Promise<void>`
4. Keep `discoverUefnListener(startPort = 8765, endPort = 8770)` — scan with the new `ping()`.
5. Keep the python snippet builders (`buildCreateSpawnPointPython` etc.) but move spawn-point creation logic into the executor if it simplifies; either way `createSpawnPoint` must go through `executePython`.
6. Tests: start a real `node:http` server on port 0 inside the test (no fetch mocking). Assert that:
   - every command arrives as `POST /` with envelope `{command, params}`;
   - `{success:false, error}` responses make the client throw `UefnListenerError`;
   - `ping()` returns true for `{status:"ok"}` and false for a connection-refused port;
   - `spawn_actor` request body contains **no** `label` key.

**Acceptance (narrow — full gate moves to A2):** `pnpm --filter @forgeai/uefn-bridge exec vitest run src/__tests__/client.test.ts` passes; `client.ts` itself compiles with no per-tool paths, no `actor_id`, and no `label` in spawn params. `executor.ts` is expected to fail compilation at this point — that is A2's job, not a blocker.

### Task A2 — Fix `executor.ts` to the corrected client

**Files:** `packages/uefn-bridge/src/executor.ts`, `packages/uefn-bridge/src/__tests__/executor.test.ts`, `apps/cli/src/commands/apply.ts`

**Steps:**
1. `spawn_device` handling:
   - `client.spawnActor(...)` now returns `UefnActor | undefined`; actor identity = `actor.path ?? actor.name`.
   - After a successful spawn, run one `executePython` that **both** sets the label (`actor.set_actor_label(<device label>)`) and appends tags `["forgeai", "forgeai:<id>", "zone:<zoneId>"]` (extend the existing `buildTagActorPython` to take the label; find the actor by `get_name()` match).
2. `set_properties`: inspect the per-key result map; any value that is not `"ok"` becomes a warning `Property "<key>" not applied to <id>: <error>` (these are the silent `Fort*` failures — surface them, don't throw).
3. Verse writes: take the project dir from `projectInfo.project_dir` (snake_case). Update `ExecuteApplyOptions` accordingly and the CLI call site in `apply.ts`.
4. Read-back (`readExistingForgeActorIds`): match `forgeai:<id>` tag when `tags` is present; **fall back** to label equality with the device label when `tags` is absent (upstream listener without our fork). Keep returning a Map keyed by ForgeAI id.
5. Add retry: on `UefnListenerError` with HTTP status 504 or a network error, retry the single command once after 1 s; if it fails again, record a warning and continue with the next command (do not abort the whole apply).
6. Update tests: mock client now follows the new method signatures/return shapes; add a test for the per-property failure warning and a test for the 504-retry path.

**Acceptance (covers A1+A2 as one unit):** `pnpm build && pnpm test` green; `grep -rn "actor_id\|/spawn_actor\|projectPath" packages/uefn-bridge/src apps/cli/src/commands/apply.ts` returns nothing (test-server assertions excepted).

### Task A3 — Make the JSON catalog the single source of truth

**Files:** `packages/uefn-bridge/src/catalog.ts`, `packages/uefn-bridge/src/asset-map/devices.catalog.json`, `packages/uefn-bridge/src/loader.ts`, `apps/cli/src/commands/apply.ts`, `packages/uefn-bridge/package.json`

**Steps:**
1. Delete the inline `defaultDeviceCatalog` object literal. Replace with `loadDeviceCatalog(filePath?: string): DeviceCatalog` that reads + Zod-parses JSON; default path resolves to the packaged `asset-map/devices.catalog.json` (copy the JSON into `dist/` on build — simplest: add `"build": "tsc && node -e \"…copy file…\""` or read it via `new URL('../asset-map/devices.catalog.json', import.meta.url)` from `src` with the file shipped alongside; pick one, make `pnpm build` + tests pass from a clean `dist`).
2. `loadApplyPlan(projectDir, options?: { catalogPath?: string })` threads the catalog through to `planApply`.
3. CLI: add `--catalog <path>` option on `apply`; pass through.
4. Test: a temp-file catalog with one mapped type is honored by `loadApplyPlan`; the default catalog still parses and contains exactly the 13 `DeviceType` enum values.

**Acceptance:** `grep -n "assetPath" packages/uefn-bridge/src/catalog.ts` shows no hardcoded device entries; all 13 keys live only in the JSON file.

### Task A4 — Vendor the MCP listener fork

**Files (new):** `vendor/uefn-mcp/uefn_listener.py`, `vendor/uefn-mcp/mcp_server.py`, `vendor/uefn-mcp/init_unreal.py`, `vendor/uefn-mcp/README.md`

**Steps:**
1. Fetch the three files from `https://github.com/KirChuvakov/uefn-mcp-server` (resolve the current main-branch commit sha via the GitHub API, then fetch raw files pinned to that sha). Record in `vendor/uefn-mcp/README.md`: the upstream commit sha, the three raw URLs used, and the sha256 of each file as fetched (before modification).
2. Modify `uefn_listener.py` only:
   - In `_serialize_actor`, add `"tags": [str(t) for t in actor.tags]` (guard with `getattr(actor, "tags", [])`).
   - Add a new handler:
     ```python
     @_register("write_project_file")
     def _cmd_write_project_file(relative_path: str, content: str) -> dict:
         # resolve against the project dir (same source get_project_info uses),
         # reject absolute paths and any ".." segments, mkdir parents, write utf-8
         # return {"path": str(target)}
     ```
   - Bump a fork marker: add `FORGEAI_FORK = "0.1.0"` near `PROTOCOL_VERSION` and include `"forgeai_fork": FORGEAI_FORK` in the `ping` handler result and `GET /` body.
3. `README.md` in `vendor/uefn-mcp/`: the provenance from step 1 plus a list of fork modifications and the install instruction (files go into `<UEFN project>/Content/Python/`).
4. Bridge: in `executor.ts`, prefer `write_project_file` for Verse files when the ping result advertises `forgeai_fork`; otherwise keep the `execute_python` fallback. (Client: expose the `GET /` body, or add a `capabilities()` method that calls `ping` and returns the parsed result.)
5. Python files cannot be unit-tested here (no `unreal` module) — validate syntax only: `python3 -m py_compile vendor/uefn-mcp/uefn_listener.py` must succeed.

**Acceptance:** `py_compile` passes for all three files; re-fetching the pinned raw files to a temp dir and diffing against `vendor/uefn-mcp/` shows changes only in the three places listed in step 2 (include that diff summary in your report, then delete the temp copy); `vendor/uefn-mcp/README.md` records sha + URLs + per-file sha256; bridge tests cover the fork-vs-fallback branch with a mock.

### Task A5 — `doctor --live` listener check

**Files:** `apps/cli/src/commands/doctor.ts`

**Steps:**
1. Add a `--live` flag. When set, append one `DoctorCheck` named `UEFN listener`: scan 8765–8770 via `discoverUefnListener` (2 s ping timeout each).
   - Found → `pass`, message `listening on port <p> (fork <ver>|upstream)`.
   - Not found → `warn` (not `fail`), message `no listener on 8765-8770 — open UEFN with the ForgeAI listener installed`.
2. Without `--live`, doctor behavior is unchanged (no network calls).

**Acceptance:** `pnpm --filter @forgeai/cli build` passes; `uefn-ai doctor` output unchanged; `uefn-ai doctor --live --json` includes the new check with status `warn` on a machine with no listener.

### Task A6 — `uefn-ai live install` (listener installer)

**Files:** `apps/cli/src/commands/live.ts` (new), `apps/cli/src/index.ts`

**Steps:**
1. New command `live` with subcommand `install --project <UEFN project dir>`:
   - Validate the dir exists and contains a `.uefnproject`/`*.uproject`-like marker — if no marker is found, print what was checked and proceed with a warning (markers vary; do not hard-fail).
   - Copy `vendor/uefn-mcp/uefn_listener.py` and `vendor/uefn-mcp/init_unreal.py` into `<project>/Content/Python/` (create dirs). Never overwrite without `--force`; without it, print which files already exist and exit 1.
2. Resolve the vendor dir relative to the repo/package install location (same technique as A3's catalog path).
3. Register the command in `apps/cli/src/index.ts` next to the other commands.

**Acceptance:** running `uefn-ai live install --project /tmp/fakeproj` creates `/tmp/fakeproj/Content/Python/{uefn_listener.py,init_unreal.py}`; second run without `--force` exits 1.

### Stage A exit criteria

- `pnpm build && pnpm test` green from clean (`pnpm clean` equivalents first if available).
- `uefn-ai apply references/tycoon-lumber-starter --dry-run` prints a plan with 0 errors; all device spawns show `unmapped:<type>` (catalog still null — expected).
- Report: files changed, test counts, and the Stage B handoff note below.

---

## 5. Stage B — HUMAN GATE: discovery spike (Windows + UEFN required)

**Not executable by the implementation model.** A human runs this with a throwaway UEFN project. Everything in Stage C depends on its findings.

Checklist (record evidence per `docs/UEFN-IMPORT-EVIDENCE-TEMPLATE.md`):

1. **Install & ping** — `uefn-ai live install --project <path>`, open the project in UEFN, then `uefn-ai doctor --live` shows the listener with `forgeai_fork`.
2. **Asset discovery** — for each of the 13 `DeviceType` values, find the real device asset path via `list_assets` / `search_assets` (content root is `/{ProjectName}/`, Fortnite devices under `/Fortnite/...`). Fill `packages/uefn-bridge/src/asset-map/devices.catalog.json`. Verify each with `does_asset_exist`.
3. **Spawn spike** — spawn one device via `apply` of a one-device manifest; confirm location/rotation in-editor match the manifest (UE cm; pitch/yaw/roll). Record any axis/handedness corrections needed.
4. **Property spike** — `set_actor_properties` on a `Fort*` device; record which keys return `"ok"` vs errors. Populate `propMap`/whitelist notes in the catalog entries.
5. **Verse spike** — apply a scaffold's Verse files; confirm UEFN sees them; investigate whether Verse build can be triggered (editor log, python API). Record yes/no.
6. **Gate decision** — devices spawnable headlessly? If no → assisted-placement pivot (human re-plans Stage C).

**Output of the gate:** filled `devices.catalog.json` (+ committed evidence doc). This alone upgrades `apply` from "spawn-points-and-verse only" to full materialization, with zero code changes — that is the point of the data-driven catalog.

---

## 6. Stage C — post-gate tasks (ordered, each gated on B's findings)

Briefer specs by design: details depend on Stage B evidence. Re-spec each as a small task before implementing.

| Task | Summary | Key constraint |
|---|---|---|
| C1 — E2E reference apply | Apply `references/tycoon-lumber-starter` into a real editor; compare actor counts vs `worldgen.lock.json`; fix mapping bugs found | Verify visually + via `get_all_actors` count |
| C2 — Diff engine & `--prune` | Read-back tagged actors → desired-vs-actual sets (create / move / delete). `apply` twice = no-op; `--prune` deletes orphaned `forgeai`-tagged actors (uses `delete_actors`) | Deletion requires explicit `--prune`; never delete untagged actors |
| C3 — Live Verse repair | `uefn-ai verse fix --live`: pull compile errors via `get_editor_log`, feed the existing repair loop, rewrite + re-place files | Log parsing is heuristic; fall back to manual paste |
| C4 — MCP Transport A | Add `forgeai_create` / `forgeai_apply` / `forgeai_modify` tools to `vendor/uefn-mcp/mcp_server.py` (shell out to the CLI); `.mcp.json` template + setup doc | Tools are thin wrappers; no logic duplication |
| C5 — Hardening | Optional shared-token header on the listener + client; CI step for `py_compile`; upstream PR for generic fork bits (`tags` serialization, `write_project_file`) | Token optional, default off (loopback) |

---

## 7. Risk register (unchanged from approved spec)

| Risk | Mitigation |
|---|---|
| Devices not spawnable headlessly | Stage B gate; assisted-placement fallback |
| `Fort*` property writes fail silently | Per-key result surfacing (A2.2) + catalog whitelist from B.4 |
| Asset paths vary by UEFN version | Data-driven catalog + `does_asset_exist` guard |
| Editor freeze on big worlds | Serial HTTP self-limits to listener tick batching (§2.4); progress output |
| Verse build not automatable | Files placed + manual Build instruction; B.5 investigates |
| Listener has no auth | Loopback-only today; token in C5 |

## Appendix — key repo files

- Bridge: `packages/uefn-bridge/src/{plan,client,executor,catalog,loader}.ts`
- CLI: `apps/cli/src/commands/{apply,doctor}.ts`, `apps/cli/src/index.ts`
- Schemas: `packages/schemas/src/devices.ts` (13-value `DeviceType` enum), `packages/schemas/src/layout.ts`
- Project loader: `packages/core/src/project-loader.ts` (`loadProject`)
- Reference scaffold for dry-run/E2E: `references/tycoon-lumber-starter/`
- Evidence template: `docs/UEFN-IMPORT-EVIDENCE-TEMPLATE.md`
- Upstream: `https://github.com/KirChuvakov/uefn-mcp-server` (`mcp_server.py`, `uefn_listener.py`, `init_unreal.py`)
