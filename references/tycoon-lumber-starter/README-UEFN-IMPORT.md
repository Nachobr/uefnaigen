# UEFN Import Guide — Lumber Mill Starter

## Step 1: Create UEFN Project
1. Open UEFN and create a new project
2. Name it "Lumber Mill Starter"

## Step 2: Import Verse Files
1. In UEFN, open **Verse → Verse Explorer** from the top menu
2. For each file in `Verse/`:
   - Right-click the **Content** folder → **Create New Verse File**
   - Copy-paste the contents of the generated `.verse` file
3. Click **Verse → Build Verse Code** to compile

## Step 3: Place Devices
1. Open `manifests/device_manifest.json`
2. For each device, place the corresponding UEFN device at the specified coordinates
3. Configure properties as listed

## Step 4: Configure Devices
1. Wire device channels as described in `docs/DEVICE-WIRING.md`
2. Set editable properties on Verse devices to reference placed devices

## Tycoon Import Pass

Use this pass before general QA so the core resource → sell → upgrade loop works in UEFN before visual polish.

### 1. Place the playable loop first
1. Place spawn and HUD devices in the starter area.
2. Place resource generators/spawners in resource zones:
- Log Yard (`zone_log_yard`)
- Automation Yard (`zone_worker_yard`)
3. Place shop, upgrade, and gate devices in progression zones:
- Sawmill Shop (`zone_sawmill`, shop)
- Prestige Ridge (`zone_prestige`, unlock_gate)
- Upgrade Lane (`zone_upgrade_lane`, upgrade_lane)
- Rebirth Platform (`zone_rebirth`, unlock_gate)

### 2. Verify economy data
Currencies:
- Wood (`wood`)

Income sources:
- Tree Chopping: 10/per_action in `zone_log_yard`
- Hire Mill Workers: 20/per_second in `zone_sawmill`

Purchases/upgrades:
- Sharper Axe: 600 wood (upgrade)
- Hire Mill Workers: 1200 wood (unlock)
- Prestige Mill: 4000 wood (prestige)

### 3. Known-good tycoon acceptance checks
- [ ] Player can earn the primary currency from the first resource zone without admin intervention.
- [ ] First upgrade purchase is reachable in the target 45–90 second band.
- [ ] A locked zone visibly blocks access before purchase and opens after purchase.
- [ ] HUD/tracker reflects currency changes after resource collection and purchase.
- [ ] Save/rejoin preserves currency and purchased upgrades.
- [ ] Prestige/rebirth path is either functional or clearly disabled in the imported island.


## Step 5: Test
1. Follow `docs/QA-CHECKLIST.md`
2. Playtest the full session loop
