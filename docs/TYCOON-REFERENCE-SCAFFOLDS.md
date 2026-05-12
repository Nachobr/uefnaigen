# Tycoon Reference Scaffolds

ForgeAI's strongest wedge is reliable, importable tycoon scaffolds. Treat broader genre coverage as secondary until these references can be generated, imported, and playtested end to end.

## Reference set

These three scaffolds cover the core tycoon surface area without spreading into new genres.

| Reference | Template | Purpose | Command |
|---|---|---|---|
| Lumber Mill Starter | `tycoon/lumber-mill` | canonical resource → sell → upgrade → gate loop | `uefn-ai create "A colorful lumber tycoon for 8 players. Chop trees, sell logs, unlock sawmills, buy workers, and prestige every 20 minutes." --genre tycoon --template tycoon/lumber-mill --seed 101 --out ./references/tycoon-lumber-starter` |
| Mining Empire Starter | `tycoon/mining-empire` | alternate resource chain with ore, furnaces, drills, and deeper zone unlocks | `uefn-ai create "A mining empire tycoon for 8 players. Mine ore, smelt bars, upgrade pickaxes and drills, unlock deeper caves, hire miners, and prestige for gem multipliers." --genre tycoon --template tycoon/mining-empire --seed 202 --out ./references/tycoon-mining-starter` |
| Compact Solo Tycoon | `tycoon/base` | small 1–4 player import smoke test with minimal zones and fewer devices | `uefn-ai create "A compact solo-friendly starter tycoon. Collect coins, buy two upgrades, unlock one new zone, save progress, and rebirth after a short 12 minute session." --genre tycoon --template tycoon/base --seed 303 --out ./references/tycoon-compact-smoke` |

## Import acceptance criteria

A reference scaffold is only "known good" after passing this checklist in UEFN:

1. **Verse import**
   - All files in `Verse/` compile without errors.
   - All generated editable device references have matching placed devices.
   - No script exceeds current Verse memory guidance in `docs/QA-CHECKLIST.md`.

2. **Device placement**
   - Every entry in `manifests/device_manifest.json` is either placed or explicitly marked not needed.
   - Required tycoon devices are present: trigger, button, tracker, barrier, and resource spawner/granter.
   - Channel wiring matches `docs/DEVICE-WIRING.md`.

3. **Core loop**
   - Player spawns in the starter area.
   - Player can earn primary currency without manual admin setup.
   - First upgrade is purchasable within 45–90 seconds.
   - At least one locked zone opens after a purchase.
   - HUD/tracker reflects income and spending.

4. **Persistence and reset**
   - Save/rejoin preserves currency and upgrades.
   - Prestige/rebirth is functional or intentionally disabled in docs.
   - Invalid purchase attempts do not create negative balances.

5. **Handoff quality**
   - `README-UEFN-IMPORT.md` is sufficient for a creator who did not run generation.
   - `docs/HANDOFF-CHECKLIST.md` has every placed device checked off.
   - `docs/BALANCE-REPORT.md` matches playtest pacing within one minute for first purchase and first gate.

## Deferred until tycoon references pass

- More genre templates.
- Marketplace/package polish not directly needed for tycoon import.
- Screenshots/video for non-tycoon genres.
- Advanced desktop browsing beyond viewing the reference artifacts.

## Next concrete work

1. Import `tycoon-lumber-starter` into UEFN first.
2. Copy `docs/UEFN-IMPORT-EVIDENCE-TEMPLATE.md` to `references/_reports/tycoon-lumber-starter-uefn-import.md` and fill it during import.
3. Record every manual fix needed, including screenshots/video paths or links.
4. Convert repeated manual fixes into deterministic packager, template, device-mapping, or validator improvements.

## Current reference status

- The three reference scaffolds have been generated under `references/` with `.zip` archives and package/eval reports in `references/_reports/`.
- `tycoon-lumber-starter` repo-side verification passed: archive integrity, required scaffold files, 7 validation results, 7 zones, 11 devices, and 8 Verse files.
- `uefn-ai validate` now loads split manifests plus `templates/resolved-template.json`, so CLI validation includes template conformance and no longer emits the missing-template warning for generated scaffolds.
- The remaining blocker is UEFN-only evidence: Verse compiler output, device placement screenshots, playtest video, and a list of manual fixes.
