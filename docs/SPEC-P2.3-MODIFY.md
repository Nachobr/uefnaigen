# Spec Plan — P2.3 Modify, reconciled with FORGEAI_IMPROVEMENTS

> Continuation context, written from my perspective. Reconciles `TODO.md` **P2.3 — AI-assisted modification of generated tycoon projects** with the relevant items in `FORGEAI_IMPROVEMENTS.md`. Focused on behavior, requirements, constraints, open questions. No implementation details.

---

## 1. What I'm actually trying to ship

P2.3 in `TODO.md` is the headline: a `uefn-ai modify` flow that takes an existing generated project and a natural-language request ("add a snowy premium forest zone", "make the first upgrade cheaper", "add another worker automation tier") and produces an updated, still-valid scaffold without regenerating from scratch.

When I read `FORGEAI_IMPROVEMENTS.md` next to it, P2.3 is not a standalone feature. It's the missing center of a cluster of items that all assume the same capability — read an existing project as canonical state, change it safely, get the change back into UEFN. The plan below treats P2.3 as the spine and folds the adjacent improvements into it as scope decisions.

---

## 2. Mapping P2.3 ↔ FORGEAI_IMPROVEMENTS

| Improvement | Relationship to P2.3 | Decision for this spec |
|---|---|---|
| #15 `uefn-ai device add` | Strict subset of `modify` (a hard-coded patch shape). | **Subsume.** Ship `modify` first; expose `device add` later as a thin alias that builds a fixed prompt. |
| #9 Verse Copilot Context Awareness | Same prerequisite: load full project (`manifests/*`, `Verse/`, `.ai/`) into a typed in-memory model. | **Share the project loader.** `verse fix` and `modify` must read through the same `loadProject()`. |
| #20 `.ai/overrides/` versioning layer | Defines what happens to human edits when AI re-touches the project. P2.3 will overwrite human Verse changes today. | **In scope as a constraint, not a feature.** `modify` MUST detect human-edited files and refuse / warn unless `--force`. Full override merge can be a follow-up. |
| #1 `uefn-ai import` (P0 in IMPROVEMENTS) | Without it, `modify` produces files the user still hand-copies into UEFN. | **Hard dependency.** `modify` must be runnable as `modify ... && import ...` and ideally one chained command. Spec assumes import lands first or in parallel. |
| #2 Live UEFN file-watcher bridge | Natural extension once `modify` works incrementally. | **Out of scope** for first cut, but `modify`'s output layout must not block it. |
| #13 `uefn-ai watch` (Verse hot-fix) | Same loop as `modify` but file-scoped and Verse-only. | **Out of scope**, share project loader when built. |
| #10 Prompt versioning / `diff` / `--fork` | `modify` is a forking operation; needs lineage tracking. | **Partially in scope.** Each modify writes a job entry referencing the parent project + diff summary. Full `diff` UI deferred. |
| #14 Expanded structural validation | The validators run after modify. The new ones from #14 (Verse context, naming collisions, perf, security) apply equally. | **In scope as integration.** `modify` runs the existing validator set; if #14 adds new validators, modify gets them for free. |
| #17 Template creator | Inverse direction — extracting a template from a project. Reuses the same project loader. | **Out of scope**, but loader API must be reusable. |
| #18 Cost transparency / #19 fallback chain | `modify` is another LLM-spending command; must obey `--budget` and provider config. | **In scope as a non-functional requirement.** No new infra. |

---

## 3. Behavior — what `modify` must do

1. **Locate the project.** Accept a path to a generated scaffold (the directory written by `packager`). Refuse if it isn't recognizably one of ours (no `manifests/world.project.json` or no `.ai/` directory).
2. **Load canonical state.** Reconstruct an in-memory `WorldProject` from disk. Source of truth on read:
   - `manifests/world.project.json` (and the rest of `manifests/` for any drift)
   - `Verse/*.verse`
   - `.ai/planner/*` (world design, module plan, balance)
   - `templates/resolved-template.json`
   - `prefab_manifest.json`, `variant_zones.json`, `worldgen.lock.json`
3. **Take a request.** A single natural-language string ("add a snowy premium forest zone"). Genre is inferred from the loaded project, not re-asked.
4. **Produce a constrained patch.** LLM output is NOT free-form project rewrite. It is a list of operations against `WorldProject` paths, e.g. `add zones[]`, `replace economy.generators[id=stone].rate`, `remove devices[id=...]`. The schema for patch ops is the new contract.
5. **Apply the patch in memory.** Deterministic apply, no LLM.
6. **Validate.** Run `runAllValidators(project, { resolvedTemplate })` — every validator listed in `TODO.md` P1.1 plus whatever P1.1+ adds.
7. **Repair (optional).** If validators fail and `--repair` is set (default on), run the existing repair loop, capped at `--repair-passes` (default 3).
8. **Re-emit Verse for touched modules only.** A patch that adds a worker tier should regenerate `automation.verse`, not the whole `Verse/` tree. Untouched files are byte-identical on disk.
9. **Repackage.** Write changed manifests, changed Verse, refreshed docs. Always rewrite `docs/MODIFICATION-SUMMARY.md` describing what changed and why.
10. **Record lineage.** Append a job entry to `~/.forgeai/jobs/` (or equivalent) referencing parent job ID, prompt, patch hash, cost, validation status.

---

## 4. Requirements

**Functional**
- CLI surface: `uefn-ai modify <project-dir> "<request>" [--out <dir>] [--dry-run] [--budget <usd>] [--strict] [--repair/--no-repair] [--repair-passes N] [--force] [--json]`
- `--out` defaults to in-place modification; if given, writes a copy and leaves the original untouched.
- `--dry-run` prints the patch + validation result, writes nothing.
- `--strict` promotes validator warnings to errors (matches existing convention).
- `--json` returns machine-readable `{ patch, validation, costUsd, changedFiles, jobId }`.
- `--force` is required to overwrite files whose content hash differs from what we last wrote (i.e. human edits detected).
- Patch operations must be a closed set; unknown ops fail before LLM output is applied.
- Same memo-cache discipline as the main pipeline (P0.2): cache on (parent project hash + request + provider + model + seed).

**Non-functional**
- Reuses `BudgetAdapter`, `RetryAdapter`, `FallbackAdapter`, `KnowledgeStore`, `Pino` logging, `UsageLedger` exactly as the main pipeline does. No new infra.
- Honors `~/.forgeai/config.yaml` provider/priority config.
- Windows-clean: no shell-out, uses Node `fs` and `tar`/`zip` libs already adopted in P1.2.
- Idempotent: running the same `modify` twice with same inputs and seed produces byte-identical output.

**Tests (mirroring TODO.md P2.3 line)**
- Mock-LLM modifier test: known prompt → known patch → known final project state.
- Patch application unit tests: each op type, plus rejection of bad paths / type mismatches.
- Validation failure test: patch that breaks structural validator, confirm repair loop kicks in and either succeeds or surfaces a clean error.
- Packager summary output test: `MODIFICATION-SUMMARY.md` mentions every changed manifest and every regenerated Verse module.
- Override-protection test: human-edited Verse file blocks modification without `--force`.

---

## 5. Constraints

- **Patch must be schema-bound.** The model must not be allowed to rewrite arbitrary Verse text or full manifests in one shot. This is the core safety property — it's what makes the difference between "modify" and "regenerate badly".
- **Tycoon-first.** Per the rebalanced roadmap in P2.1, focus modify acceptance criteria on tycoon scaffolds. Other genres should not crash, but goldens live in `evals/` for tycoon prompts.
- **No silent regeneration.** If the LLM cannot express the request as a patch (e.g. "convert this tycoon to a battle arena"), the command must fail with an explicit "this requires a regenerate, not a modify" error. Never fall back to whole-project rewrite.
- **Human-edit detection is mandatory.** We need it before P2.3 ships, not after, because the first thing creators will do post-import is touch Verse by hand.
- **No new persistence formats.** Reuse `~/.forgeai/jobs/`, `~/.forgeai/memo-cache/`, `~/.forgeai/usage-ledger.json`. Lineage is a field on the job record, not a new store.

---

## 6. Open questions

1. **How are human edits detected?** Two options:
   (a) Re-hash every file at modify-time and compare to a manifest written at last-package-time (`worldgen.lock.json` already exists per P1.2 — does it carry per-file hashes? if not, extend it).
   (b) Require `.ai/overrides/` (#20). Heavier, but cleaner story long-term. Decision needed before coding.
2. **Patch granularity for Verse.** Patch ops over typed `WorldProject` are clean for manifests, but Verse is text. Does the modifier emit patches like "regenerate module `automation` with new spec X" (we re-run the existing Verse generator on a sub-spec) or does it emit textual diffs? The first is safer and reuses the existing generator. Confirm.
3. **Scope of templates.** Does `modify` allow swapping `resolvedTemplate`? Probably no — that's effectively regeneration. But adding a prefab from a different theme pack should be fine. Need an explicit allow-list of mutable fields.
4. **Relationship to `import`.** If #1 lands, do we want `modify --push` that runs `import` afterward to a previously-registered UEFN target? Cheap to add if we have a config entry "this project's UEFN destination", expensive if we have to re-discover paths every time.
5. **Lineage in `.ai/`.** Each modify could drop a `.ai/modifications/<timestamp>.json` containing the prompt, patch, validation result, cost. Useful for `diff` (#10) later. Worth doing on day one even if we don't expose a viewer yet.
6. **Repair budget vs. modify budget.** Should `--budget` cap the entire modify+repair cycle, or is repair a separate budget? Current pipeline treats them as one — keep that.
7. **Dry-run patch output format.** Pretty diff vs. raw JSON ops? `--json` answers the machine case. For humans, a colored summary by file is probably enough; punt on fancy semantic diff.
8. **Desktop integration timing.** P2.3 says "Desktop later". With P1.4 already shipped, the desktop is a thin client over core. Adding "Edit this project" later is small, but the patch schema we pick now constrains what the desktop UI can offer (form-based vs. free-text).

---

## 7. Suggested execution order

1. **Project loader.** Reusable, used by `modify`, `verse fix` rewrite (#9), and template creator (#17) later. Lives in `packages/core`.
2. **Patch schema + applier.** Pure functions, fully unit-testable without LLM. Lives in `packages/core`.
3. **Modifier agent.** New agent in `packages/ai`, follows the existing class pattern (system prompt → user msg → JSON → Zod → typed result). Uses `KnowledgeStore` for context.
4. **Human-edit guard.** Decide #6.1 above; extend `worldgen.lock.json` if path (a) wins.
5. **CLI command.** `apps/cli/src/commands/modify.ts`, thin renderer over the core API, mirrors `create.ts` shape.
6. **Doc + summary generator.** `MODIFICATION-SUMMARY.md` in packager.
7. **Tests** (the five listed in §4).
8. **Tycoon goldens.** Add 3–5 modify prompts against existing reference scaffolds (P2.1) to `evals/`.
9. **Lineage record + memo cache wiring.** Cheap once everything else works.
10. **Desktop "Edit this project"** — only after the CLI flow is stable.

---

## 8. Out of scope (explicit, so we don't drift)

- Live UEFN file-watcher bridge (#2)
- `uefn-ai watch` Verse hot-fix loop (#13)
- Three-way merge for `.ai/overrides/` (#20) beyond simple human-edit detection
- `uefn-ai diff` between two projects (#10) beyond writing a per-modify summary
- Template extraction (#17)
- Multiplayer balance simulation (#11)
- Anything non-tycoon beyond "don't crash"
