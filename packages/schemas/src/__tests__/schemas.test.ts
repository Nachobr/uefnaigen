import { describe, it, expect } from "vitest";
import {
  WorldProject,
  LayoutSpec,
  ZoneSpec,
  SpawnPoint,
  EconomySpec,
  CurrencySpec,
  IncomeSource,
  CurrencySink,
  DeviceInstance,
  TemplateDefinition,
  PrefabDefinition,
  VariantZone,
  VerseModule,
  VerseClass,
  VerseFunction,
  VerseField,
  JobRecord,
  ForgeAIConfig,
} from "../index.js";

// ── Helpers ──

const validZone: () => ReturnType<typeof ZoneSpec.parse> = () =>
  ZoneSpec.parse({
    zoneId: "zone_1",
    name: "Starter Camp",
    purpose: "starter_area",
    footprint: { x: 0, y: 0, w: 100, h: 100 },
  });

const validSpawn = () =>
  SpawnPoint.parse({
    id: "sp_1",
    location: { x: 50, y: 50, z: 0 },
    zoneId: "zone_1",
  });

const validLayout = () =>
  LayoutSpec.parse({
    worldType: "grid2d",
    bounds: { width: 1000, depth: 1000 },
    zones: [validZone()],
    spawnPoints: [validSpawn()],
  });

const validCurrency = () =>
  CurrencySpec.parse({
    currencyId: "gold",
    name: "Gold",
    persistent: true,
  });

const validGenerator = () =>
  IncomeSource.parse({
    sourceId: "gen_1",
    name: "Tree Chopping",
    currencyId: "gold",
    baseRate: 10,
    rateUnit: "per_action",
  });

const validSink = () =>
  CurrencySink.parse({
    sinkId: "sink_1",
    name: "Sawmill Upgrade",
    currencyId: "gold",
    cost: 100,
    type: "upgrade",
  });

const validEconomy = () =>
  EconomySpec.parse({
    currencies: [validCurrency()],
    generators: [validGenerator()],
    sinks: [validSink()],
    targetCurves: { timeToFirstUpgradeSec: 60 },
  });

const validDevice = () =>
  DeviceInstance.parse({
    id: "dev_1",
    type: "trigger",
    label: "Sell Trigger",
    transform: {
      location: { x: 0, y: 0, z: 0 },
      rotation: { pitch: 0, yaw: 0, roll: 0 },
    },
    properties: { enabled: true },
  });

const validVerseModule = () =>
  VerseModule.parse({
    kind: "module",
    name: "EconomyManager",
    imports: [{ kind: "import", path: "/Fortnite.com/Devices" }],
    declarations: [
      {
        kind: "class",
        name: "tycoon_economy_manager",
        extends: "creative_device",
        fields: [
          { kind: "field", name: "SellTrigger", type: "trigger_device", editable: true },
        ],
        methods: [
          {
            kind: "function",
            name: "OnBegin",
            params: [],
            returnType: "void",
            attributes: ["override", "suspends"],
            body: [{ kind: "statement", code: "SellTrigger.TriggeredEvent.Subscribe(HandleSell)" }],
          },
        ],
      },
    ],
  });

// ── Layout Tests ──

describe("LayoutSpec", () => {
  it("parses a valid layout", () => {
    const result = validLayout();
    expect(result.worldType).toBe("grid2d");
    expect(result.zones).toHaveLength(1);
    expect(result.spawnPoints).toHaveLength(1);
  });

  it("rejects invalid worldType", () => {
    expect(() =>
      LayoutSpec.parse({
        worldType: "invalid",
        bounds: { width: 100, depth: 100 },
        zones: [],
        spawnPoints: [],
      })
    ).toThrow();
  });

  it("accepts optional elevation on zones", () => {
    const zone = ZoneSpec.parse({
      zoneId: "z1",
      name: "High Ground",
      purpose: "combat_area",
      footprint: { x: 0, y: 0, w: 50, h: 50 },
      elevation: 200,
    });
    expect(zone.elevation).toBe(200);
  });

  it("accepts progressionGate on zones", () => {
    const zone = ZoneSpec.parse({
      zoneId: "z2",
      name: "Locked Zone",
      purpose: "unlock_gate",
      footprint: { x: 100, y: 0, w: 50, h: 50 },
      progressionGate: { currency: "gold", cost: 500, minLevel: 3 },
    });
    expect(zone.progressionGate?.cost).toBe(500);
  });

  it("rejects invalid zone purpose", () => {
    expect(() =>
      ZoneSpec.parse({
        zoneId: "z",
        name: "Bad",
        purpose: "invalid_purpose",
        footprint: { x: 0, y: 0, w: 10, h: 10 },
      })
    ).toThrow();
  });
});

// ── Economy Tests ──

describe("EconomySpec", () => {
  it("parses a valid economy", () => {
    const result = validEconomy();
    expect(result.currencies).toHaveLength(1);
    expect(result.generators).toHaveLength(1);
    expect(result.sinks).toHaveLength(1);
  });

  it("rejects invalid rateUnit", () => {
    expect(() =>
      IncomeSource.parse({
        sourceId: "g",
        name: "Bad",
        currencyId: "gold",
        baseRate: 1,
        rateUnit: "per_year",
      })
    ).toThrow();
  });

  it("rejects invalid sink type", () => {
    expect(() =>
      CurrencySink.parse({
        sinkId: "s",
        name: "Bad",
        currencyId: "gold",
        cost: 1,
        type: "donation",
      })
    ).toThrow();
  });

  it("applies default persistent=true on currency", () => {
    const c = CurrencySpec.parse({ currencyId: "gems", name: "Gems" });
    expect(c.persistent).toBe(true);
  });
});

// ── Device Tests ──

describe("DeviceInstance", () => {
  it("parses a valid device", () => {
    const dev = validDevice();
    expect(dev.type).toBe("trigger");
  });

  it("accepts non-standard device types from LLM output", () => {
    const dev = DeviceInstance.parse({
      id: "d",
      type: "laser_cannon",
      label: "Laser",
      transform: {
        location: { x: 0, y: 0, z: 0 },
        rotation: { pitch: 0, yaw: 0, roll: 0 },
      },
      properties: {},
    });
    expect(dev.type).toBe("laser_cannon");
  });

  it("accepts optional channels and events", () => {
    const dev = DeviceInstance.parse({
      id: "d2",
      type: "button",
      label: "Buy Button",
      transform: {
        location: { x: 10, y: 20, z: 0 },
        rotation: { pitch: 0, yaw: 0, roll: 0 },
      },
      properties: { cost: 100 },
      channels: { listens: ["ch_buy"], transmits: ["ch_bought"] },
      events: [{ event: "OnPress", target: "economy", action: "deduct" }],
    });
    expect(dev.channels?.listens).toContain("ch_buy");
    expect(dev.events).toHaveLength(1);
  });
});

// ── Template Tests ──

describe("TemplateDefinition", () => {
  it("parses a valid template", () => {
    const t = TemplateDefinition.parse({
      templateId: "tycoon/base",
      version: "1.0.0",
      genre: "tycoon",
      summary: "Base tycoon template",
      layoutRules: {
        minZones: 6,
        maxZones: 10,
        requiredZonePurposes: ["starter_area", "resource_area", "shop"],
        layoutStyle: "hub_and_spoke",
      },
      systemModules: { required: ["economy", "progression"], optional: ["save"] },
      devicePolicies: {
        allowedDeviceTypes: ["trigger", "button", "tracker"],
        requiredDeviceTypes: ["trigger"],
      },
      verseModules: { required: ["GameManager"], optional: ["LootRoller"] },
      prefabTags: ["tycoon", "industrial"],
      validationProfiles: ["tycoon-v1"],
    });
    expect(t.genre).toBe("tycoon");
    expect(t.layoutRules.minZones).toBe(6);
  });

  it("rejects invalid genre", () => {
    expect(() =>
      TemplateDefinition.parse({
        templateId: "x",
        version: "1.0",
        genre: "moba",
        summary: "bad",
        layoutRules: { minZones: 1, maxZones: 2, requiredZonePurposes: [], layoutStyle: "grid2d" },
        systemModules: { required: [], optional: [] },
        devicePolicies: { allowedDeviceTypes: [], requiredDeviceTypes: [] },
        verseModules: { required: [], optional: [] },
        prefabTags: [],
        validationProfiles: [],
      })
    ).toThrow();
  });
});

// ── Prefab Tests ──

describe("PrefabDefinition & VariantZone", () => {
  it("parses a valid prefab", () => {
    const p = PrefabDefinition.parse({
      prefabId: "pfb_sawmill_01",
      name: "Small Sawmill",
      category: "industrial",
      tags: ["tycoon", "lumber"],
      footprint: { w: 10, d: 10, h: 5 },
      style: "rustic",
      supportedGenres: ["tycoon"],
      compatibleZones: ["resource_area"],
    });
    expect(p.category).toBe("industrial");
  });

  it("parses a valid variant zone", () => {
    const vz = VariantZone.parse({
      zoneId: "zone_a",
      selectionMode: "one_of_n",
      variants: [
        { variantId: "v1", prefabIds: ["pfb_1"], weight: 1 },
        { variantId: "v2", prefabIds: ["pfb_2"], weight: 2 },
      ],
      runtimeSeedSource: "session_seed",
    });
    expect(vz.variants).toHaveLength(2);
  });

  it("rejects invalid prefab category", () => {
    expect(() =>
      PrefabDefinition.parse({
        prefabId: "x",
        name: "x",
        category: "vehicle",
        tags: [],
        footprint: { w: 1, d: 1, h: 1 },
        style: "x",
        supportedGenres: [],
        compatibleZones: [],
      })
    ).toThrow();
  });
});

// ── Verse AST Tests ──

describe("Verse AST", () => {
  it("parses a valid module", () => {
    const m = validVerseModule();
    expect(m.name).toBe("EconomyManager");
    expect(m.declarations).toHaveLength(1);
  });

  it("parses a standalone function declaration", () => {
    const m = VerseModule.parse({
      kind: "module",
      name: "Helpers",
      imports: [],
      declarations: [
        {
          kind: "function",
          name: "Clamp",
          params: [
            { name: "Value", type: "int" },
            { name: "Min", type: "int" },
            { name: "Max", type: "int" },
          ],
          returnType: "int",
          body: [{ kind: "statement", code: "return Min.Max(Value).Min(Max)" }],
        },
      ],
    });
    expect(m.declarations[0].kind).toBe("function");
  });

  it("parses a field with editable + default", () => {
    const f = VerseField.parse({
      kind: "field",
      name: "Speed",
      type: "float",
      editable: true,
      defaultValue: { kind: "expression", code: "1.0" },
    });
    expect(f.editable).toBe(true);
    expect(f.defaultValue?.code).toBe("1.0");
  });
});

// ── Job Tests ──

describe("JobRecord", () => {
  it("parses a valid job", () => {
    const j = JobRecord.parse({
      jobId: "550e8400-e29b-41d4-a716-446655440000",
      projectId: "proj_1",
      status: "draft",
      currentStage: 1,
      startedAt: "2025-01-01T00:00:00Z",
      updatedAt: "2025-01-01T00:00:00Z",
      seed: 42,
      prompt: "A lumber tycoon",
    });
    expect(j.status).toBe("draft");
  });

  it("rejects invalid status", () => {
    expect(() =>
      JobRecord.parse({
        jobId: "550e8400-e29b-41d4-a716-446655440000",
        projectId: "p",
        status: "running",
        currentStage: 1,
        startedAt: "2025-01-01T00:00:00Z",
        updatedAt: "2025-01-01T00:00:00Z",
        seed: 1,
        prompt: "x",
      })
    ).toThrow();
  });

  it("accepts all valid statuses", () => {
    const statuses = [
      "draft", "planning", "generated", "validating",
      "packaged", "complete", "cancelled", "failed", "failed_validation",
    ];
    for (const status of statuses) {
      const j = JobRecord.parse({
        jobId: "550e8400-e29b-41d4-a716-446655440000",
        projectId: "p",
        status,
        currentStage: 1,
        startedAt: "2025-01-01T00:00:00Z",
        updatedAt: "2025-01-01T00:00:00Z",
        seed: 1,
        prompt: "x",
      });
      expect(j.status).toBe(status);
    }
  });
});

// ── Config Tests ──

describe("ForgeAIConfig", () => {
  it("applies defaults", () => {
    const c = ForgeAIConfig.parse({ apiKeys: {} });
    expect(c.provider).toBe("anthropic");
    expect(c.model).toBe("claude-sonnet-4-20250514");
    expect(c.verbose).toBe(false);
    expect(c.maxRepairPasses).toBe(3);
  });

  it("rejects invalid provider", () => {
    expect(() =>
      ForgeAIConfig.parse({ provider: "invalid-provider", apiKeys: {} })
    ).toThrow();
  });

  it("accepts budget", () => {
    const c = ForgeAIConfig.parse({ apiKeys: {}, budgetUsd: 5.0 });
    expect(c.budgetUsd).toBe(5.0);
  });
});

// ── WorldProject Tests ──

describe("WorldProject", () => {
  it("parses a minimal valid project", () => {
    const p = WorldProject.parse({
      specVersion: "wg/1.0",
      projectId: "proj_1",
      name: "Lumber Legends",
      slug: "lumber-legends",
      createdAt: "2025-01-01T00:00:00Z",
      updatedAt: "2025-01-01T00:00:00Z",
      source: { mode: "map-studio", prompt: "A lumber tycoon", seed: 42 },
      target: { genre: "tycoon", uefnVersion: "5.5", outputMode: "scaffold" },
      design: {
        fantasy: "Cozy lumber empire",
        coreLoop: ["chop", "sell", "upgrade", "prestige"],
        sessionLengthMin: 20,
        progressionStyle: "linear",
      },
      layout: validLayout(),
      economy: validEconomy(),
      devices: [validDevice()],
      prefabs: [],
      scripts: [validVerseModule()],
      validation: [{ validator: "schema", passed: true }],
    });
    expect(p.specVersion).toBe("wg/1.0");
    expect(p.target.genre).toBe("tycoon");
  });

  it("rejects wrong specVersion", () => {
    expect(() =>
      WorldProject.parse({
        specVersion: "wg/2.0",
        projectId: "p",
        name: "x",
        slug: "x",
        createdAt: "2025-01-01T00:00:00Z",
        updatedAt: "2025-01-01T00:00:00Z",
        source: { mode: "map-studio", prompt: "x", seed: 1 },
        target: { genre: "tycoon", uefnVersion: "5.5", outputMode: "scaffold" },
        design: { fantasy: "x", coreLoop: [], sessionLengthMin: 10, progressionStyle: "linear" },
        layout: validLayout(),
        economy: validEconomy(),
        devices: [],
        prefabs: [],
        scripts: [],
        validation: [],
      })
    ).toThrow();
  });
});
