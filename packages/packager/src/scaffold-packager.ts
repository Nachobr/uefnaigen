import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, dirname, basename } from "node:path";
import type { WorldProject, EconomySpec, DeviceInstance, TemplateDefinition, JobRecord } from "@forgeai/schemas";
import type { SimulationResult } from "@forgeai/balance";
import type { LootTable, ModulePlan, WorldDesign } from "@forgeai/ai";

export interface PackagerInput {
  project: WorldProject;
  worldDesign: WorldDesign;
  modulePlan: ModulePlan;
  lootTables: LootTable[];
  balanceReport: SimulationResult;
  verseFiles: Map<string, string>;
  resolvedTemplate?: TemplateDefinition;
  templateId?: string;
  job?: JobRecord;
}

export class ScaffoldPackager {
  async package(input: PackagerInput, outputDir: string): Promise<string> {
    const { project, worldDesign, modulePlan, lootTables, balanceReport, verseFiles, resolvedTemplate, templateId, job } = input;

    const dirs = [
      "",
      "manifests",
      "Verse",
      "docs",
      ".ai/planner",
      ".ai/validation",
      "templates",
      "exports",
    ];
    for (const d of dirs) {
      mkdirSync(join(outputDir, d), { recursive: true });
    }

    // Manifests
    this.writeJson(outputDir, "manifests/world.project.json", project);
    this.writeJson(outputDir, "manifests/layout.grid.json", project.layout);
    this.writeJson(outputDir, "manifests/device_manifest.json", project.devices);
    this.writeJson(outputDir, "manifests/economy.json", project.economy);
    this.writeJson(outputDir, "manifests/loot_tables.json", lootTables);
    this.writeJson(outputDir, "manifests/variant_zones.json", project.variantZones ?? []);
    this.writeJson(outputDir, "manifests/prefab_manifest.json", project.prefabs);
    this.writeJson(outputDir, "manifests/progression.json", {
      progressionBeats: worldDesign.progressionBeats,
      sessionPacing: worldDesign.sessionPacing,
    });

    // Verse files
    for (const [filename, code] of verseFiles) {
      writeFileSync(join(outputDir, "Verse", filename), code, "utf-8");
    }

    // AI planner artifacts
    this.writeJson(outputDir, ".ai/planner/world-design.json", worldDesign);
    this.writeJson(outputDir, ".ai/planner/module-plan.json", modulePlan);
    this.writeJson(outputDir, ".ai/planner/balance.json", project.economy);
    this.writeJson(outputDir, ".ai/job.json", job ?? {
      jobId: project.slug,
      projectId: project.projectId,
      prompt: project.source.prompt,
      seed: project.source.seed,
    });
    this.writeJson(outputDir, ".ai/validation/summary.json", project.validation);
    for (const result of project.validation) {
      this.writeJson(outputDir, `.ai/validation/${this.safeFileName(result.validator)}.json`, result);
    }

    // Templates
    this.writeJson(
      outputDir,
      "templates/resolved-template.json",
      resolvedTemplate ?? { templateId: templateId ?? "(unknown)", note: "Resolved template not provided to packager." },
    );

    // Docs
    writeFileSync(join(outputDir, "README.md"), this.genReadme(project, worldDesign), "utf-8");
    writeFileSync(join(outputDir, "README-UEFN-IMPORT.md"), this.genImportGuide(project), "utf-8");
    writeFileSync(join(outputDir, "docs/DESIGN-SUMMARY.md"), this.genDesignSummary(project, worldDesign), "utf-8");
    writeFileSync(join(outputDir, "docs/SYSTEMS-OVERVIEW.md"), this.genSystemsOverview(project), "utf-8");
    writeFileSync(join(outputDir, "docs/DEVICE-WIRING.md"), this.genDeviceWiring(project.devices), "utf-8");
    writeFileSync(join(outputDir, "docs/QA-CHECKLIST.md"), this.genQAChecklist(project), "utf-8");
    writeFileSync(join(outputDir, "docs/BALANCE-REPORT.md"), this.genBalanceReport(project.economy, balanceReport), "utf-8");
    writeFileSync(join(outputDir, "docs/HANDOFF-CHECKLIST.md"), this.genHandoffChecklist(project), "utf-8");

    // Config
    writeFileSync(join(outputDir, "worldgen.config.yaml"), `specVersion: "wg/1.0"\nprojectId: ${project.projectId}\nname: ${project.name}\nseed: ${project.source.seed}\ngenre: ${project.target.genre}\n`, "utf-8");
    this.writeJson(outputDir, "worldgen.lock.json", {
      specVersion: project.specVersion,
      projectId: project.projectId,
      projectName: project.name,
      seed: project.source.seed,
      genre: project.target.genre,
      templateId: resolvedTemplate?.templateId ?? templateId ?? null,
      templateVersion: resolvedTemplate?.version ?? null,
      artifacts: {
        zones: project.layout.zones.length,
        devices: project.devices.length,
        prefabs: project.prefabs.length,
        variantZones: project.variantZones?.length ?? 0,
        scripts: project.scripts.length,
        validators: project.validation.length,
      },
    });

    return outputDir;
  }

  private writeJson(base: string, path: string, data: unknown): void {
    writeFileSync(join(base, path), JSON.stringify(data, null, 2), "utf-8");
  }

  private safeFileName(value: string): string {
    return value.toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-|-$/g, "") || "validator";
  }

  private genReadme(project: WorldProject, design: WorldDesign): string {
    return `# ${project.name}

> ${project.design.fantasy}

**Genre:** ${project.target.genre}
**Session Length:** ${project.design.sessionLengthMin} minutes
**Core Loop:** ${project.design.coreLoop.join(" → ")}

## Zones (${project.layout.zones.length})

${design.zones.map((z) => `- **${z.name}** — ${z.description}`).join("\n")}

## Generated Files

- \`manifests/\` — JSON manifests for all game data
- \`Verse/\` — Verse scripts for UEFN
- \`docs/\` — Design docs, wiring guides, QA checklist

See \`README-UEFN-IMPORT.md\` for setup instructions.
`;
  }

  private genImportGuide(project: WorldProject): string {
    return `# UEFN Import Guide — ${project.name}

## Step 1: Create UEFN Project
1. Open UEFN and create a new project
2. Name it "${project.name}"

## Step 2: Import Verse Files
1. In UEFN, open **Verse → Verse Explorer** from the top menu
2. For each file in \`Verse/\`:
   - Right-click the **Content** folder → **Create New Verse File**
   - Copy-paste the contents of the generated \`.verse\` file
3. Click **Verse → Build Verse Code** to compile

## Step 3: Place Devices
1. Open \`manifests/device_manifest.json\`
2. For each device, place the corresponding UEFN device at the specified coordinates
3. Configure properties as listed

## Step 4: Configure Devices
1. Wire device channels as described in \`docs/DEVICE-WIRING.md\`
2. Set editable properties on Verse devices to reference placed devices

## Step 5: Test
1. Follow \`docs/QA-CHECKLIST.md\`
2. Playtest the full session loop
`;
  }

  private genDesignSummary(project: WorldProject, design: WorldDesign): string {
    return `# Design Summary — ${project.name}

## Fantasy
${project.design.fantasy}

## Theme
${design.theme}

## Core Loop
${project.design.coreLoop.map((s, i) => `${i + 1}. ${s}`).join("\n")}

## Session Pacing
- **Early Game:** ${design.sessionPacing.earlyGame}
- **Mid Game:** ${design.sessionPacing.midGame}
- **Late Game:** ${design.sessionPacing.lateGame}

## Progression Beats
${design.progressionBeats.map((b) => `- ${b}`).join("\n")}
`;
  }

  private genSystemsOverview(project: WorldProject): string {
    const currencies = project.economy.currencies.map((c) => `- **${c.name}** (\`${c.currencyId}\`)`).join("\n");
    const generators = project.economy.generators.map((g) => `- ${g.name}: ${g.baseRate}/${g.rateUnit}`).join("\n");
    const sinks = project.economy.sinks.map((s) => `- ${s.name}: $${s.cost} (${s.type})`).join("\n");

    return `# Systems Overview — ${project.name}

## Economy

### Currencies
${currencies}

### Income Sources
${generators}

### Sinks
${sinks}

## Devices
${project.devices.length} devices across ${project.layout.zones.length} zones.
See \`docs/DEVICE-WIRING.md\` for full wiring diagram.
`;
  }

  private genDeviceWiring(devices: DeviceInstance[]): string {
    const rows = devices.map((d) => {
      const listens = d.channels?.listens?.join(", ") || "—";
      const transmits = d.channels?.transmits?.join(", ") || "—";
      return `| ${d.id} | ${d.type} | ${d.label} | ${d.zoneId ?? "global"} | ${listens} | ${transmits} |`;
    });

    return `# Device Wiring — ${devices.length} Devices

| ID | Type | Label | Zone | Listens | Transmits |
|---|---|---|---|---|---|
${rows.join("\n")}
`;
  }

  private genQAChecklist(project: WorldProject): string {
    const zoneChecks = project.layout.zones.map((z) => `- [ ] Zone "${z.name}" accessible and correctly gated`);
    return `# QA Checklist

## Spawn & Navigation
- [ ] Player spawns in starter area
- [ ] All zones reachable via intended progression

## Zones
${zoneChecks.join("\n")}

## Economy
- [ ] First purchase achievable within 90 seconds
- [ ] Currency displays correctly on HUD
- [ ] All upgrade buttons functional

## Verse Scripts
- [ ] All scripts compile without errors
- [ ] Device references properly wired
- [ ] Save/load works across sessions

## Balance
- [ ] Session pacing feels correct (${project.design.sessionLengthMin} min target)
- [ ] No stagnation points > 3 minutes
`;
  }

  private genBalanceReport(economy: EconomySpec, report: SimulationResult): string {
    return `# Balance Report

## Pace Bands
| Metric | Value | Target |
|---|---|---|
| First Upgrade | ${report.timeToFirstUpgradeSec.toFixed(0)}s | 45–90s |
| Automation | ${report.timeToAutomationMin?.toFixed(1) ?? "N/A"} min | 5–8 min |
| Prestige | ${report.timeToPrestigeMin?.toFixed(1) ?? "N/A"} min | 15–25 min |
| Income/min | ${report.incomePerMinute.toFixed(0)} | — |

## Violations
${report.violations.length === 0 ? "✓ None — all pace bands within target." : report.violations.map((v) => `- ⚠ ${v}`).join("\n")}

## Adjustments
${report.adjustments.length === 0 ? "None needed." : report.adjustments.map((a) => `- ${a}`).join("\n")}

## Currencies
${economy.currencies.map((c) => `- **${c.name}** (persistent: ${c.persistent})`).join("\n")}
`;
  }

  private genHandoffChecklist(project: WorldProject): string {
    const deviceChecks = project.devices.map((d) => `- [ ] ${d.label} (\`${d.type}\`) placed at correct coordinates`);
    const currencyChecks = project.economy.currencies.map((c) => `- [ ] ${c.name} (\`${c.currencyId}\`) displays correctly`);
    const sinkChecks = project.economy.sinks.map((s) => `- [ ] ${s.name} purchasable and applies effect`);
    const zoneChecks = project.layout.zones.map((z) => `- [ ] Zone "${z.name}" loads and is reachable`);

    return `# UEFN Handoff Checklist — ${project.name}

## Pre-Import Checks
- [ ] UEFN version is up to date (latest stable)
- [ ] Verse compiler passes \`verse build\` with no errors
- [ ] Project settings match target: genre **${project.target.genre}**, session **${project.design.sessionLengthMin} min**
- [ ] Output scaffold directory reviewed (\`manifests/\`, \`Verse/\`, \`docs/\`)

## Asset Verification
- [ ] \`manifests/world.project.json\` present and valid JSON
- [ ] \`manifests/layout.grid.json\` present and valid JSON
- [ ] \`manifests/device_manifest.json\` present and valid JSON
- [ ] \`manifests/economy.json\` present and valid JSON
- [ ] \`manifests/loot_tables.json\` present and valid JSON
- [ ] \`manifests/progression.json\` present and valid JSON
- [ ] All Verse files in \`Verse/\` compile without errors

## Device Placement
${deviceChecks.join("\n")}
- [ ] All device channel wiring matches \`docs/DEVICE-WIRING.md\`

## Economy Validation
${currencyChecks.join("\n")}
${sinkChecks.join("\n")}
- [ ] First purchase achievable within 90 seconds of gameplay
- [ ] No currency overflow or negative balance states

## Zone Verification
${zoneChecks.join("\n")}
- [ ] Zone transitions work in both directions
- [ ] Gating requirements enforced correctly

## Playtest Protocol
- [ ] **Spawn Test:** Player spawns in starter zone, HUD visible
- [ ] **Loop Test:** Full core loop (${project.design.coreLoop.join(" → ")}) completable
- [ ] **Session Length Test:** Target pacing of ${project.design.sessionLengthMin} min reached without stalling
- [ ] **Edge Cases:** AFK timeout, disconnect/reconnect, max players

## Sign-Off
- [ ] Designer review complete
- [ ] Balance report reviewed (\`docs/BALANCE-REPORT.md\`)
- [ ] QA checklist passed (\`docs/QA-CHECKLIST.md\`)
- [ ] Ready for UEFN publish

**Project:** ${project.name}
**Genre:** ${project.target.genre}
**Seed:** ${project.source.seed}
`;
  }

  async packageZip(input: PackagerInput, outputDir: string): Promise<string> {
    await this.package(input, outputDir);

    const parent = dirname(outputDir);
    const dirName = basename(outputDir);
    const archivePath = join(parent, `${dirName}.zip`);

    this.writeZipArchive(outputDir, archivePath);

    return archivePath;
  }

  private writeZipArchive(sourceDir: string, archivePath: string): void {
    const files = this.collectFiles(sourceDir).sort();
    const dataParts: Buffer[] = [];
    const centralParts: Buffer[] = [];
    let offset = 0;

    for (const file of files) {
      const data = readFileSync(join(sourceDir, file));
      const name = file.split(/[\\/]/).join("/");
      const nameBuffer = Buffer.from(name, "utf-8");
      const crc = crc32(data);

      const local = Buffer.alloc(30);
      local.writeUInt32LE(0x04034b50, 0);
      local.writeUInt16LE(20, 4);
      local.writeUInt16LE(0, 6);
      local.writeUInt16LE(0, 8);
      local.writeUInt16LE(0, 10);
      local.writeUInt16LE(0, 12);
      local.writeUInt32LE(crc, 14);
      local.writeUInt32LE(data.length, 18);
      local.writeUInt32LE(data.length, 22);
      local.writeUInt16LE(nameBuffer.length, 26);
      local.writeUInt16LE(0, 28);

      dataParts.push(local, nameBuffer, data);

      const central = Buffer.alloc(46);
      central.writeUInt32LE(0x02014b50, 0);
      central.writeUInt16LE(20, 4);
      central.writeUInt16LE(20, 6);
      central.writeUInt16LE(0, 8);
      central.writeUInt16LE(0, 10);
      central.writeUInt16LE(0, 12);
      central.writeUInt16LE(0, 14);
      central.writeUInt32LE(crc, 16);
      central.writeUInt32LE(data.length, 20);
      central.writeUInt32LE(data.length, 24);
      central.writeUInt16LE(nameBuffer.length, 28);
      central.writeUInt16LE(0, 30);
      central.writeUInt16LE(0, 32);
      central.writeUInt16LE(0, 34);
      central.writeUInt16LE(0, 36);
      central.writeUInt32LE(0, 38);
      central.writeUInt32LE(offset, 42);
      centralParts.push(central, nameBuffer);

      offset += local.length + nameBuffer.length + data.length;
    }

    const centralOffset = offset;
    const centralSize = centralParts.reduce((size, part) => size + part.length, 0);
    const end = Buffer.alloc(22);
    end.writeUInt32LE(0x06054b50, 0);
    end.writeUInt16LE(0, 4);
    end.writeUInt16LE(0, 6);
    end.writeUInt16LE(files.length, 8);
    end.writeUInt16LE(files.length, 10);
    end.writeUInt32LE(centralSize, 12);
    end.writeUInt32LE(centralOffset, 16);
    end.writeUInt16LE(0, 20);

    writeFileSync(archivePath, Buffer.concat([...dataParts, ...centralParts, end]));
  }

  private collectFiles(dir: string, prefix = ""): string[] {
    if (!existsSync(dir)) return [];
    const files: string[] = [];
    for (const entry of readdirSync(join(dir, prefix), { withFileTypes: true })) {
      const rel = prefix ? join(prefix, entry.name) : entry.name;
      const fullPath = join(dir, rel);
      if (entry.isDirectory()) {
        files.push(...this.collectFiles(dir, rel));
      } else if (statSync(fullPath).isFile()) {
        files.push(rel);
      }
    }
    return files;
  }
}

const crcTable = new Uint32Array(256);
for (let i = 0; i < crcTable.length; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[i] = c >>> 0;
}

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
