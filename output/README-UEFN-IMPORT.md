# UEFN Import Guide — Explore the vibrant and quirky Lobby to interact with NPCs a

## Step 1: Create UEFN Project
1. Open UEFN and create a new project
2. Name it "Explore the vibrant and quirky Lobby to interact with NPCs a"

## Step 2: Import Verse Files
1. In UEFN, open **Verse → Verse Explorer** from the top menu
2. For each file in \`Verse/\`:
   - Right-click the **Content** folder → **Create New Verse File**
   - Copy-paste the contents of the generated \`.verse\` file
3. Click **Verse → Build Verse Code** to compile

## Step 3: Place Devices
1. Open `manifests/device_manifest.json`
2. For each device, place the corresponding UEFN device at the specified coordinates
3. Configure properties as listed

## Step 4: Configure Devices
1. Wire device channels as described in `docs/DEVICE-WIRING.md`
2. Set editable properties on Verse devices to reference placed devices

## Step 5: Test
1. Follow `docs/QA-CHECKLIST.md`
2. Playtest the full session loop
