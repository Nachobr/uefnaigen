# UEFN Handoff Checklist — Lumber Mill Starter

## Pre-Import Checks
- [ ] UEFN version is up to date (latest stable)
- [ ] Verse compiler passes `verse build` with no errors
- [ ] Project settings match target: genre **tycoon**, session **20 min**
- [ ] Output scaffold directory reviewed (`manifests/`, `Verse/`, `docs/`)

## Asset Verification
- [ ] `manifests/world.project.json` present and valid JSON
- [ ] `manifests/layout.grid.json` present and valid JSON
- [ ] `manifests/device_manifest.json` present and valid JSON
- [ ] `manifests/economy.json` present and valid JSON
- [ ] `manifests/loot_tables.json` present and valid JSON
- [ ] `manifests/progression.json` present and valid JSON
- [ ] All Verse files in `Verse/` compile without errors

## Device Placement
- [ ] Tree Chopping Trigger (`trigger`) placed at correct coordinates
- [ ] Sell Button (`button`) placed at correct coordinates
- [ ] Sharper Axe Button (`button`) placed at correct coordinates
- [ ] Prestige Ridge Gate (`barrier`) placed at correct coordinates
- [ ] Wood Tracker (`tracker`) placed at correct coordinates
- [ ] Tree Chopping Spawner (`item_spawner`) placed at correct coordinates
- [ ] Save Progress Point (`save_point`) placed at correct coordinates
- [ ] Tycoon HUD Message (`hud_message`) placed at correct coordinates
- [ ] Upgrade Lane Import Marker (`trigger`) placed at correct coordinates
- [ ] Automation Yard Import Marker (`trigger`) placed at correct coordinates
- [ ] Rebirth Platform Import Marker (`trigger`) placed at correct coordinates
- [ ] All device channel wiring matches `docs/DEVICE-WIRING.md`

## Economy Validation
- [ ] Wood (`wood`) displays correctly
- [ ] Sharper Axe purchasable and applies effect
- [ ] Hire Mill Workers purchasable and applies effect
- [ ] Prestige Mill purchasable and applies effect
- [ ] First purchase achievable within 90 seconds of gameplay
- [ ] No currency overflow or negative balance states

## Zone Verification
- [ ] Zone "Starter Grove" loads and is reachable
- [ ] Zone "Log Yard" loads and is reachable
- [ ] Zone "Sawmill Shop" loads and is reachable
- [ ] Zone "Prestige Ridge" loads and is reachable
- [ ] Zone "Upgrade Lane" loads and is reachable
- [ ] Zone "Automation Yard" loads and is reachable
- [ ] Zone "Rebirth Platform" loads and is reachable
- [ ] Zone transitions work in both directions
- [ ] Gating requirements enforced correctly

## Playtest Protocol
- [ ] **Spawn Test:** Player spawns in starter zone, HUD visible
- [ ] **Loop Test:** Full core loop (chop trees → sell logs → buy upgrades → unlock sawmills → prestige) completable
- [ ] **Session Length Test:** Target pacing of 20 min reached without stalling
- [ ] **Edge Cases:** AFK timeout, disconnect/reconnect, max players

## Sign-Off
- [ ] Designer review complete
- [ ] Balance report reviewed (`docs/BALANCE-REPORT.md`)
- [ ] QA checklist passed (`docs/QA-CHECKLIST.md`)
- [ ] Ready for UEFN publish

**Project:** Lumber Mill Starter
**Genre:** tycoon
**Seed:** 101
