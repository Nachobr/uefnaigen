import { describe, it, expect } from "vitest";
import { StructuralValidator } from "../structural-validator.js";
import { CrossRefValidator } from "../crossref-validator.js";
import { SchemaValidator } from "../schema-validator.js";
import { VerseLintValidator } from "../verse-lint-validator.js";
import { VerseMemoryValidator } from "../verse-memory-validator.js";
import { TemplateConformanceValidator } from "../template-conformance-validator.js";
import { PackageReadinessValidator } from "../package-readiness-validator.js";
import { runAllValidators } from "../runner.js";
import type { WorldProject } from "@forgeai/schemas";

function makeProject(overrides: Partial<WorldProject> = {}): WorldProject {
  return {
    specVersion: "wg/1.0",
    projectId: "proj_1",
    name: "Test Project",
    slug: "test-project",
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
    source: { mode: "map-studio", prompt: "test", seed: 42 },
    target: { genre: "tycoon", uefnVersion: "5.5", outputMode: "scaffold" },
    design: {
      fantasy: "Test",
      coreLoop: ["gather", "sell"],
      sessionLengthMin: 20,
      progressionStyle: "linear",
    },
    layout: {
      worldType: "grid2d",
      bounds: { width: 1000, depth: 1000 },
      zones: [
        { zoneId: "zone_1", name: "Start", purpose: "starter_area", footprint: { x: 0, y: 0, w: 500, h: 500 } },
        { zoneId: "zone_2", name: "Forest", purpose: "resource_area", footprint: { x: 500, y: 0, w: 500, h: 500 } },
      ],
      spawnPoints: [{ id: "sp_1", location: { x: 250, y: 250, z: 0 }, zoneId: "zone_1" }],
    },
    economy: {
      currencies: [{ currencyId: "gold", name: "Gold", persistent: true }],
      generators: [{ sourceId: "gen_1", name: "Chop", currencyId: "gold", baseRate: 10, rateUnit: "per_action" }],
      sinks: [{ sinkId: "sink_1", name: "Upgrade", currencyId: "gold", cost: 100, type: "upgrade", repeatable: false }],
      targetCurves: { timeToFirstUpgradeSec: 60 },
    },
    devices: [
      {
        id: "dev_1",
        type: "trigger",
        label: "Sell",
        transform: { location: { x: 100, y: 100, z: 0 }, rotation: { pitch: 0, yaw: 0, roll: 0 } },
        properties: {},
        zoneId: "zone_1",
      },
      {
        id: "dev_2",
        type: "button",
        label: "Buy",
        transform: { location: { x: 600, y: 100, z: 0 }, rotation: { pitch: 0, yaw: 0, roll: 0 } },
        properties: {},
        zoneId: "zone_2",
      },
    ],
    prefabs: [],
    scripts: [
      {
        kind: "module",
        name: "EconomyManager",
        imports: [{ kind: "import", path: "/Fortnite.com/Devices" }],
        declarations: [],
      },
    ],
    validation: [],
    ...overrides,
  } as WorldProject;
}

describe("StructuralValidator", () => {
  const v = new StructuralValidator();

  it("passes a valid project", () => {
    const result = v.validate(makeProject());
    expect(result.passed).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("detects duplicate device IDs", () => {
    const project = makeProject({
      devices: [
        { id: "dev_1", type: "trigger", label: "A", transform: { location: { x: 0, y: 0, z: 0 }, rotation: { pitch: 0, yaw: 0, roll: 0 } }, properties: {} },
        { id: "dev_1", type: "button", label: "B", transform: { location: { x: 1, y: 0, z: 0 }, rotation: { pitch: 0, yaw: 0, roll: 0 } }, properties: {} },
      ],
    });
    const result = v.validate(project);
    expect(result.passed).toBe(false);
    expect(result.errors.some((e) => e.includes("Duplicate device ID"))).toBe(true);
  });

  it("detects duplicate zone IDs", () => {
    const project = makeProject();
    project.layout.zones = [
      { zoneId: "z1", name: "A", purpose: "starter_area", footprint: { x: 0, y: 0, w: 10, h: 10 } },
      { zoneId: "z1", name: "B", purpose: "shop", footprint: { x: 20, y: 0, w: 10, h: 10 } },
    ];
    const result = v.validate(project);
    expect(result.errors.some((e) => e.includes("Duplicate zone ID"))).toBe(true);
  });

  it("detects no spawn points", () => {
    const project = makeProject();
    project.layout.spawnPoints = [];
    const result = v.validate(project);
    expect(result.errors.some((e) => e.includes("no spawn points"))).toBe(true);
  });

  it("warns on empty scripts", () => {
    const project = makeProject({ scripts: [] });
    const result = v.validate(project);
    expect(result.warnings.some((w) => w.includes("No Verse scripts"))).toBe(true);
  });
});

describe("CrossRefValidator", () => {
  const v = new CrossRefValidator();

  it("passes a valid project", () => {
    const result = v.validate(makeProject());
    expect(result.passed).toBe(true);
  });

  it("detects device referencing unknown zone", () => {
    const project = makeProject({
      devices: [
        { id: "d1", type: "trigger", label: "X", transform: { location: { x: 0, y: 0, z: 0 }, rotation: { pitch: 0, yaw: 0, roll: 0 } }, properties: {}, zoneId: "nonexistent" },
      ],
    });
    const result = v.validate(project);
    expect(result.passed).toBe(false);
    expect(result.errors.some((e) => e.includes("unknown zone"))).toBe(true);
  });

  it("detects generator referencing unknown currency", () => {
    const project = makeProject();
    project.economy.generators = [
      { sourceId: "g1", name: "Bad", currencyId: "gems", baseRate: 1, rateUnit: "per_action" },
    ];
    const result = v.validate(project);
    expect(result.errors.some((e) => e.includes("unknown currency"))).toBe(true);
  });

  it("warns on zones with no devices", () => {
    const project = makeProject({ devices: [] });
    const result = v.validate(project);
    expect(result.warnings.some((w) => w.includes("has no devices"))).toBe(true);
  });
});

describe("SchemaValidator", () => {
  const v = new SchemaValidator();

  it("passes a valid project", () => {
    const result = v.validate(makeProject());
    expect(result.passed).toBe(true);
  });
});

describe("runAllValidators", () => {
  it("runs the 6 default validators", () => {
    const results = runAllValidators(makeProject());
    expect(results).toHaveLength(6);
    expect(results.map((r) => r.validator)).toEqual([
      "structural",
      "schema",
      "crossref",
      "verse-lint",
      "verse-memory",
      "package-readiness",
    ]);
    expect(results.every((r) => r.passed)).toBe(true);
  });

  it("includes template-conformance when resolvedTemplate is provided", () => {
    const results = runAllValidators(makeProject(), {
      resolvedTemplate: {
        templateId: "tycoon/test",
        version: "1.0.0",
        genre: "tycoon",
        summary: "test",
        layoutRules: {
          minZones: 1,
          maxZones: 10,
          requiredZonePurposes: ["starter_area"],
          layoutStyle: "grid2d",
        },
        systemModules: { required: [], optional: [] },
        devicePolicies: { allowedDeviceTypes: [], requiredDeviceTypes: ["trigger"] },
        verseModules: { required: ["EconomyManager"], optional: [] },
        prefabTags: [],
        validationProfiles: [],
      },
    });
    expect(results).toHaveLength(7);
    expect(results.find((r) => r.validator === "template-conformance")?.passed).toBe(true);
  });

  it("reports failures from multiple validators", () => {
    const project = makeProject({ devices: [] });
    project.layout.spawnPoints = [];
    const results = runAllValidators(project);
    const failed = results.filter((r) => !r.passed);
    expect(failed.length).toBeGreaterThan(0);
  });
});

describe("VerseLintValidator", () => {
  it("warns when emitted Verse contains lintable patterns", () => {
    const project = makeProject({
      scripts: [
        {
          kind: "module",
          name: "Bad",
          imports: [],
          declarations: [
            {
              kind: "function",
              name: "Update",
              params: [],
              returnType: "void",
              attributes: [],
              body: [{ kind: "statement", code: "Counter += 1" }],
            },
          ],
        },
      ],
    });
    const result = new VerseLintValidator().validate(project);
    expect(result.passed).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});

describe("VerseMemoryValidator", () => {
  it("flags weak_map declared with non-player key", () => {
    const project = makeProject({
      scripts: [
        {
          kind: "module",
          name: "Bad",
          imports: [],
          declarations: [
            {
              kind: "class",
              name: "bad_store",
              extends: "creative_device",
              fields: [
                {
                  kind: "field",
                  name: "Scores",
                  type: "weak_map(int, int)",
                  editable: false,
                  defaultValue: { kind: "expression", code: "map{}" },
                },
              ],
              methods: [],
            },
          ],
        },
      ],
    });
    const result = new VerseMemoryValidator().validate(project);
    expect(result.errors.some((e) => e.includes("weak-map-non-player-key"))).toBe(true);
  });
});

describe("TemplateConformanceValidator", () => {
  it("warns when required zone purposes / device types / modules are missing", () => {
    const v = new TemplateConformanceValidator({
      templateId: "tycoon/test",
      version: "1.0.0",
      genre: "tycoon",
      summary: "test",
      layoutRules: {
        minZones: 5,
        maxZones: 10,
        requiredZonePurposes: ["boss_area"],
        layoutStyle: "grid2d",
      },
      systemModules: { required: [], optional: [] },
      devicePolicies: { allowedDeviceTypes: ["trigger"], requiredDeviceTypes: ["save_point"] },
      verseModules: { required: ["MissingModule"], optional: [] },
      prefabTags: [],
      validationProfiles: [],
    });
    const result = v.validate(makeProject());
    expect(result.passed).toBe(true);
    expect(result.warnings.some((w) => w.includes('purpose "boss_area"'))).toBe(true);
    expect(result.warnings.some((w) => w.includes("at least 5 zones"))).toBe(true);
    expect(result.warnings.some((w) => w.includes('type "save_point"'))).toBe(true);
    expect(result.warnings.some((w) => w.includes("MissingModule"))).toBe(true);
    expect(result.warnings.some((w) => w.includes('"button"'))).toBe(true);
  });
});

describe("PackageReadinessValidator", () => {
  it("errors on empty zones / devices / currencies", () => {
    const project = makeProject({ devices: [] });
    project.layout.zones = [];
    project.economy.currencies = [];
    const result = new PackageReadinessValidator().validate(project);
    expect(result.passed).toBe(false);
    expect(result.errors.some((e) => e.includes("no zones"))).toBe(true);
    expect(result.errors.some((e) => e.includes("no devices"))).toBe(true);
    expect(result.errors.some((e) => e.includes("no currencies"))).toBe(true);
  });
});
