import { describe, expect, it } from "vitest";
import { z } from "zod";
import { applyNormalizers, generateValidated } from "../structured-output.js";
import { normalizeDeviceList } from "../systems-planner.js";
import { normalizeDeviceInstances } from "../device-mapper.js";
import type { LLMAdapter, LLMMessage, LLMResponse } from "../adapter.js";

describe("applyNormalizers", () => {
  it("preserves singleton arrays for non-numeric fields", () => {
    const result = applyNormalizers({ keyFeatures: ["automation"] });

    expect(result).toEqual({ keyFeatures: ["automation"] });
  });

  it("coerces singleton arrays for known numeric fields", () => {
    const result = applyNormalizers({ cost: ["100"] });

    expect(result).toEqual({ cost: 100 });
  });
});

describe("normalizeDeviceList", () => {
  it("unwraps object maps of devices", () => {
    const result = normalizeDeviceList({
      dev_sell: { id: "dev_sell", type: "trigger", label: "Sell", zoneId: "zone_1" },
      dev_buy: { id: "dev_buy", type: "button", label: "Buy", zoneId: "zone_1" },
    });

    expect(result).toEqual([
      { id: "dev_sell", type: "trigger", label: "Sell", zoneId: "zone_1" },
      { id: "dev_buy", type: "button", label: "Buy", zoneId: "zone_1" },
    ]);
  });

  it("unwraps nested devices object maps", () => {
    const result = normalizeDeviceList({
      devices: {
        dev_sell: { id: "dev_sell", type: "trigger", label: "Sell", zoneId: "zone_1" },
      },
    });

    expect(result).toEqual([
      { id: "dev_sell", type: "trigger", label: "Sell", zoneId: "zone_1" },
    ]);
  });

  it("recursively extracts device-like objects from grouped objects", () => {
    const result = normalizeDeviceList({
      starter_area: {
        devices: {
          sell: { id: "dev_sell", type: "trigger", label: "Sell", zoneId: "zone_1" },
        },
      },
      metadata: { note: "not a device" },
    });

    expect(result).toEqual([
      { id: "dev_sell", type: "trigger", label: "Sell", zoneId: "zone_1" },
    ]);
  });
});

describe("generateValidated", () => {
  it("throws stage-tagged error after exhausting repair passes", async () => {
    const llm: LLMAdapter = {
      async chat(_messages: LLMMessage[]): Promise<LLMResponse> {
        return { content: '{"foo": "not-a-number"}' };
      },
    };

    await expect(
      generateValidated({
        llm,
        stage: "TestStage",
        schema: z.object({ foo: z.number() }),
        messages: [{ role: "user", content: "x" }],
        repairPolicy: { maxRepairPasses: 1 },
      }),
    ).rejects.toThrow(/TestStage failed after 1 repair passes/);
  });
});

describe("normalizeDeviceInstances", () => {
  it("extracts nested concrete devices and fills missing placement fields", () => {
    const result = normalizeDeviceInstances(
      { devices: { starter: { label: "Sell", zoneId: "zone_1" } } },
      {
        worldType: "grid2d",
        bounds: { width: 100, depth: 100 },
        zones: [
          { zoneId: "zone_1", name: "Start", purpose: "starter_area", footprint: { x: 10, y: 20, w: 40, h: 60 } },
        ],
        spawnPoints: [],
      },
      {
        economy: { currencies: [], generators: [], sinks: [] },
        devices: [{ id: "dev_sell", type: "trigger", label: "Sell Trigger", zoneId: "zone_1", purpose: "sell" }],
        gameRules: [],
      },
    );

    expect(result).toEqual([
      {
        id: "dev_sell",
        type: "trigger",
        label: "Sell",
        transform: {
          location: { x: 30, y: 50, z: 0 },
          rotation: { pitch: 0, yaw: 0, roll: 0 },
        },
        properties: {},
        channels: undefined,
        events: undefined,
        zoneId: "zone_1",
        tags: undefined,
      },
    ]);
  });
});
