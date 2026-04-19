import { describe, it, expect } from "vitest";
import { TemplateRegistry } from "../registry.js";
import { createDefaultRegistry } from "../default-registry.js";
import { tycoonBase, tycoonLumberMill } from "../builtin/index.js";

describe("TemplateRegistry", () => {
  it("registers and retrieves a template", () => {
    const reg = new TemplateRegistry();
    reg.register(tycoonBase);
    expect(reg.get("tycoon/base")).toBeDefined();
    expect(reg.get("tycoon/base")!.genre).toBe("tycoon");
  });

  it("lists all registered templates", () => {
    const reg = createDefaultRegistry();
    const list = reg.list();
    expect(list.length).toBe(6);
    expect(list.map((t) => t.templateId)).toContain("tycoon/base");
    expect(list.map((t) => t.templateId)).toContain("tycoon/lumber-mill");
    expect(list.map((t) => t.templateId)).toContain("tycoon/mining-empire");
    expect(list.map((t) => t.templateId)).toContain("battle_arena/base");
    expect(list.map((t) => t.templateId)).toContain("adventure/base");
    expect(list.map((t) => t.templateId)).toContain("roleplay/base");
  });

  it("returns undefined for unknown template", () => {
    const reg = new TemplateRegistry();
    expect(reg.get("nonexistent")).toBeUndefined();
  });

  it("throws on resolve of unknown template", () => {
    const reg = new TemplateRegistry();
    expect(() => reg.resolve("nonexistent")).toThrow("Template not found");
  });

  it("resolves base template without inheritance", () => {
    const reg = createDefaultRegistry();
    const resolved = reg.resolve("tycoon/base");
    expect(resolved.templateId).toBe("tycoon/base");
    expect(resolved.extends).toBeUndefined();
  });
});

describe("Template inheritance", () => {
  it("lumber-mill extends tycoon/base", () => {
    expect(tycoonLumberMill.extends).toBe("tycoon/base");
  });

  it("resolves lumber-mill with merged fields from base", () => {
    const reg = createDefaultRegistry();
    const resolved = reg.resolve("tycoon/lumber-mill");

    // Should keep child's ID and summary
    expect(resolved.templateId).toBe("tycoon/lumber-mill");
    expect(resolved.summary).toContain("Lumber tycoon");

    // Should merge required verse modules from both
    expect(resolved.verseModules.required).toContain("GameManager"); // from base
    expect(resolved.verseModules.required).toContain("ResourceNodeController"); // from child

    // Should merge device types
    expect(resolved.devicePolicies.requiredDeviceTypes).toContain("trigger"); // from base
    expect(resolved.devicePolicies.requiredDeviceTypes).toContain("item_spawner"); // from child
    expect(resolved.devicePolicies.allowedDeviceTypes).toContain("creature_spawner"); // from child

    // Should merge prefab tags
    expect(resolved.prefabTags).toContain("tycoon"); // from base
    expect(resolved.prefabTags).toContain("lumber"); // from child
    expect(resolved.prefabTags).toContain("sawmill"); // from child

    // Should merge system modules
    expect(resolved.systemModules.optional).toContain("loot"); // shared
    expect(resolved.systemModules.optional).toContain("npc_workers"); // from child
    expect(resolved.systemModules.optional).toContain("daily_rewards"); // from base
  });

  it("resolved template has no duplicates in merged arrays", () => {
    const reg = createDefaultRegistry();
    const resolved = reg.resolve("tycoon/lumber-mill");

    const hasDupes = (arr: string[]) => new Set(arr).size !== arr.length;
    expect(hasDupes(resolved.verseModules.required)).toBe(false);
    expect(hasDupes(resolved.devicePolicies.allowedDeviceTypes)).toBe(false);
    expect(hasDupes(resolved.prefabTags)).toBe(false);
    expect(hasDupes(resolved.validationProfiles)).toBe(false);
  });

  it("child layout rules override base", () => {
    const reg = createDefaultRegistry();
    const resolved = reg.resolve("tycoon/lumber-mill");
    // lumber-mill sets minZones=7 vs base minZones=6
    expect(resolved.layoutRules.minZones).toBe(7);
  });
});
