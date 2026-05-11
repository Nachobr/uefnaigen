# UEFN Handoff Checklist — Compact Solo Tycoon

## Pre-Import Checks
- [ ] UEFN version is up to date (latest stable)
- [ ] Verse compiler passes `verse build` with no errors
- [ ] Project settings match target: genre **tycoon**, session **12 min**
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
- [ ] Coin Collection Trigger (`trigger`) placed at correct coordinates
- [ ] Sell Button (`button`) placed at correct coordinates
- [ ] Coin Upgrade Button (`button`) placed at correct coordinates
- [ ] Bonus Alcove Gate (`barrier`) placed at correct coordinates
- [ ] Coins Tracker (`tracker`) placed at correct coordinates
- [ ] Coin Collection Spawner (`item_spawner`) placed at correct coordinates
- [ ] Save Progress Point (`save_point`) placed at correct coordinates
- [ ] Tycoon HUD Message (`hud_message`) placed at correct coordinates
- [ ] Upgrade Lane Import Marker (`trigger`) placed at correct coordinates
- [ ] Automation Yard Import Marker (`trigger`) placed at correct coordinates
- [ ] All device channel wiring matches `docs/DEVICE-WIRING.md`

## Economy Validation
- [ ] Coins (`coins`) displays correctly
- [ ] Coin Upgrade purchasable and applies effect
- [ ] Auto Collector purchasable and applies effect
- [ ] Quick Rebirth purchasable and applies effect
- [ ] First purchase achievable within 90 seconds of gameplay
- [ ] No currency overflow or negative balance states

## Zone Verification
- [ ] Zone "Starter Pad" loads and is reachable
- [ ] Zone "Coin Loop" loads and is reachable
- [ ] Zone "Upgrade Kiosk" loads and is reachable
- [ ] Zone "Bonus Alcove" loads and is reachable
- [ ] Zone "Upgrade Lane" loads and is reachable
- [ ] Zone "Automation Yard" loads and is reachable
- [ ] Zone transitions work in both directions
- [ ] Gating requirements enforced correctly

## Playtest Protocol
- [ ] **Spawn Test:** Player spawns in starter zone, HUD visible
- [ ] **Loop Test:** Full core loop (collect coins → buy upgrades → unlock a zone → save progress → rebirth) completable
- [ ] **Session Length Test:** Target pacing of 12 min reached without stalling
- [ ] **Edge Cases:** AFK timeout, disconnect/reconnect, max players

## Sign-Off
- [ ] Designer review complete
- [ ] Balance report reviewed (`docs/BALANCE-REPORT.md`)
- [ ] QA checklist passed (`docs/QA-CHECKLIST.md`)
- [ ] Ready for UEFN publish

**Project:** Compact Solo Tycoon
**Genre:** tycoon
**Seed:** 303
