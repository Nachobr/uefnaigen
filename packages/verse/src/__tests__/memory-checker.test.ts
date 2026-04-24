import { describe, it, expect } from "vitest";
import { checkVerseMemory } from "../memory-checker.js";

describe("checkVerseMemory", () => {
  it("accepts valid weak_map(player, int)", () => {
    const code = `var SavedData:weak_map(player, int) = map{}`;
    const result = checkVerseMemory(code);
    expect(result.issues).toHaveLength(0);
    expect(result.weakMapCount).toBe(1);
  });

  it("rejects non-player key type", () => {
    const code = `var SavedData:weak_map(agent, int) = map{}`;
    const result = checkVerseMemory(code);
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0].rule).toBe("weak-map-non-player-key");
    expect(result.issues[0].severity).toBe("error");
  });

  it("rejects player as value type (runtime reference)", () => {
    const code = `var SavedData:weak_map(player, player) = map{}`;
    const result = checkVerseMemory(code);
    const heavy = result.issues.find((i) => i.rule === "weak-map-heavy-value");
    expect(heavy).toBeDefined();
    expect(heavy!.severity).toBe("error");
  });

  it("errors when more than 4 weak_maps declared", () => {
    const code = [
      `var A:weak_map(player, int) = map{}`,
      `var B:weak_map(player, int) = map{}`,
      `var C:weak_map(player, int) = map{}`,
      `var D:weak_map(player, int) = map{}`,
      `var E:weak_map(player, int) = map{}`,
    ].join("\n");
    const result = checkVerseMemory(code);
    const limit = result.issues.find((i) => i.rule === "weak-map-limit");
    expect(limit).toBeDefined();
    expect(limit!.severity).toBe("error");
    expect(result.weakMapCount).toBe(5);
  });

  it("allows exactly 4 weak_maps", () => {
    const code = [
      `var A:weak_map(player, int) = map{}`,
      `var B:weak_map(player, int) = map{}`,
      `var C:weak_map(player, int) = map{}`,
      `var D:weak_map(player, int) = map{}`,
    ].join("\n");
    const result = checkVerseMemory(code);
    const limit = result.issues.find((i) => i.rule === "weak-map-limit");
    expect(limit).toBeUndefined();
  });

  it("warns on missing FitsInPlayerMap check", () => {
    const code = [
      `var SavedData:weak_map(player, int) = map{}`,
      `    set SavedData[Player] = 42`,
    ].join("\n");
    const result = checkVerseMemory(code);
    const fits = result.issues.find((i) => i.rule === "missing-fits-check");
    expect(fits).toBeDefined();
    expect(fits!.severity).toBe("warning");
  });

  it("no warning when FitsInPlayerMap is used", () => {
    const code = [
      `var SavedData:weak_map(player, int) = map{}`,
      `    if (FitsInPlayerMap(SavedData, NewData)):`,
      `        set SavedData[Player] = 42`,
    ].join("\n");
    const result = checkVerseMemory(code);
    const fits = result.issues.find((i) => i.rule === "missing-fits-check");
    expect(fits).toBeUndefined();
  });

  it("detects persistable class missing specifiers", () => {
    const code = [
      `player_data := class:`,
      `    XP:int = 0`,
      ``,
      `var SavedData:weak_map(player, player_data) = map{}`,
    ].join("\n");
    const result = checkVerseMemory(code);
    const missing = result.issues.find((i) => i.rule === "persistable-class-missing-specifiers");
    expect(missing).toBeDefined();
  });

  it("accepts properly specified persistable class", () => {
    const code = [
      `player_data := class<final><persistable>:`,
      `    XP:int = 0`,
      ``,
      `var SavedData:weak_map(player, player_data) = map{}`,
    ].join("\n");
    const result = checkVerseMemory(code);
    const missing = result.issues.filter((i) => i.rule === "persistable-class-missing-specifiers");
    expect(missing).toHaveLength(0);
  });

  it("returns no issues for code without weak_map", () => {
    const code = [
      `using { /Fortnite.com/Devices }`,
      `my_device := class(creative_device):`,
      `    @editable`,
      `    MyTrigger : trigger_device = trigger_device{}`,
    ].join("\n");
    const result = checkVerseMemory(code);
    expect(result.issues).toHaveLength(0);
    expect(result.weakMapCount).toBe(0);
  });
});
