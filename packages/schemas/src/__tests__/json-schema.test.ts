import { describe, it, expect } from "vitest";
import { exportJsonSchema, exportAllJsonSchemas } from "../json-schema.js";

describe("JSON Schema export", () => {
  it("exports WorldProject as valid JSON Schema", () => {
    const schema = exportJsonSchema("WorldProject");
    expect(schema).toHaveProperty("$schema");
    expect(schema).toHaveProperty("definitions");
  });

  it("exports DeviceInstance", () => {
    const schema = exportJsonSchema("DeviceInstance");
    expect(schema).toBeDefined();
  });

  it("exports EconomySpec", () => {
    const schema = exportJsonSchema("EconomySpec");
    expect(schema).toBeDefined();
  });

  it("exports all schemas", () => {
    const all = exportAllJsonSchemas();
    const names = Object.keys(all);
    expect(names).toContain("WorldProject");
    expect(names).toContain("LayoutSpec");
    expect(names).toContain("EconomySpec");
    expect(names).toContain("DeviceInstance");
    expect(names).toContain("TemplateDefinition");
    expect(names).toContain("PrefabDefinition");
    expect(names).toContain("VariantZone");
    expect(names).toContain("VerseModule");
    expect(names).toContain("JobRecord");
    expect(names).toContain("ForgeAIConfig");
    expect(names.length).toBe(15);
  });
});
