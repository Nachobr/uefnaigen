import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { WorldProject, EconomySpec, LayoutSpec, DeviceInstance } from "@forgeai/schemas";
import type { SimulationResult } from "@forgeai/balance";
import type { LootTable, ModulePlan, WorldDesign } from "@forgeai/ai";

export interface PackagerInput {
  project: WorldProject;
  worldDesign: WorldDesign;
  modulePlan: ModulePlan;
  lootTables: LootTable[];
  balanceReport: SimulationResult;
  verseFiles: Map<string, string>;
}

export class ScaffoldPackager {
  async package(input: PackagerInput, outputDir: string): Promise<string> {
    const { project, worldDesign, modulePlan, lootTables, balanceReport, verseFiles } = input;

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

    // Templates
    this.writeJson(outputDir, "templates/resolved-template.json", {});

    // Docs
    writeFileSync(join(outputDir, "README.md"), this.genReadme(project, worldDesign), "utf-8");
    writeFileSync(join(outputDir, "README-UEFN-IMPORT.md"), this.genImportGuide(project), "utf-8");
    writeFileSync(join(outputDir, "docs/DESIGN-SUMMARY.md"), this.genDesignSummary(project, worldDesign), "utf-8");
    writeFileSync(join(outputDir, "docs/SYSTEMS-OVERVIEW.md"), this.genSystemsOverview(project), "utf-8");
    writeFileSync(join(outputDir, "docs/DEVICE-WIRING.md"), this.genDeviceWiring(project.devices), "utf-8");
    writeFileSync(join(outputDir, "docs/QA-CHECKLIST.md"), this.genQAChecklist(project), "utf-8");
    writeFileSync(join(outputDir, "docs/BALANCE-REPORT.md"), this.genBalanceReport(project.economy, balanceReport), "utf-8");

    // Config
    writeFileSync(join(outputDir, "worldgen.config.yaml"), `specVersion: "wg/1.0"\nprojectId: ${project.projectId}\nname: ${project.name}\nseed: ${project.source.seed}\ngenre: ${project.target.genre}\n`, "utf-8");

    return outputDir;
  }

  private writeJson(base: string, path: string, data: unknown): void {
    writeFileSync(join(base, path), JSON.stringify(data, null, 2), "utf-8");
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
1. Copy all files from \`Verse/\` into your project's Verse directory
2. Build to verify compilation

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
}
