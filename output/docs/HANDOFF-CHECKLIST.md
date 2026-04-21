# UEFN Handoff Checklist — Explore the vibrant and quirky Lobby to interact with NPCs a

## Pre-Import Checks
- [ ] UEFN version is up to date (latest stable)
- [ ] Verse compiler passes `verse build` with no errors
- [ ] Project settings match target: genre **roleplay**, session **15 min**
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
- [ ] Lobby Entry Trigger (`trigger`) placed at correct coordinates
- [ ] Spawn Pad for Players (`spawn_pad`) placed at correct coordinates
- [ ] Welcome Gift Item Granter (`item_granter`) placed at correct coordinates
- [ ] Lobby Welcome Message (`hud_message`) placed at correct coordinates
- [ ] Shop Entry Trigger (`trigger`) placed at correct coordinates
- [ ] Upgrade Item Granter (`item_granter`) placed at correct coordinates
- [ ] Shop Upgrade Message (`hud_message`) placed at correct coordinates
- [ ] Job Board Entry Trigger (`trigger`) placed at correct coordinates
- [ ] Quest Item Spawner (`item_spawner`) placed at correct coordinates
- [ ] Job Board Quest Message (`hud_message`) placed at correct coordinates
- [ ] All device channel wiring matches `docs/DEVICE-WIRING.md`

## Economy Validation
- [ ] Gold (`gold`) displays correctly
- [ ] Silver (`silver`) displays correctly
- [ ] NPC Upgrade purchasable and applies effect
- [ ] Job Board Subscription purchasable and applies effect
- [ ] First purchase achievable within 90 seconds of gameplay
- [ ] No currency overflow or negative balance states

## Zone Verification
- [ ] Zone "Lively Lobby" loads and is reachable
- [ ] Zone "NPC Shop" loads and is reachable
- [ ] Zone "Job Board" loads and is reachable
- [ ] Zone transitions work in both directions
- [ ] Gating requirements enforced correctly

## Playtest Protocol
- [ ] **Spawn Test:** Player spawns in starter zone, HUD visible
- [ ] **Loop Test:** Full core loop (interact → upgrade) completable
- [ ] **Session Length Test:** Target pacing of 15 min reached without stalling
- [ ] **Edge Cases:** AFK timeout, disconnect/reconnect, max players

## Sign-Off
- [ ] Designer review complete
- [ ] Balance report reviewed (`docs/BALANCE-REPORT.md`)
- [ ] QA checklist passed (`docs/QA-CHECKLIST.md`)
- [ ] Ready for UEFN publish

**Project:** Explore the vibrant and quirky Lobby to interact with NPCs a
**Genre:** roleplay
**Seed:** 293550
