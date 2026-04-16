import { describe, it, expect } from "vitest";
import { detectGenreFromKeywords, NormalizedBrief } from "../intent-extractor.js";

describe("detectGenreFromKeywords", () => {
  it("detects tycoon from upgrade/sell/prestige keywords", () => {
    expect(detectGenreFromKeywords("A lumber tycoon where you chop trees and sell logs")).toBe("tycoon");
  });

  it("detects tycoon from automation keywords", () => {
    expect(detectGenreFromKeywords("Build a factory, automate production, prestige and rebirth")).toBe("tycoon");
  });

  it("detects battle_arena from combat keywords", () => {
    expect(detectGenreFromKeywords("Free-for-all arena with weapons, teams, and rounds")).toBe("battle_arena");
  });

  it("detects adventure from quest keywords", () => {
    expect(detectGenreFromKeywords("Explore dungeons, defeat the boss, collect relics")).toBe("adventure");
  });

  it("detects roleplay from social keywords", () => {
    expect(detectGenreFromKeywords("A city hangout with jobs and housing")).toBe("roleplay");
  });

  it("returns null for ambiguous prompts", () => {
    expect(detectGenreFromKeywords("Make something cool")).toBeNull();
  });

  it("picks the genre with more keyword matches", () => {
    expect(detectGenreFromKeywords("Tycoon with upgrades, sell items, automate and unlock zones")).toBe("tycoon");
  });

  it("is case-insensitive", () => {
    expect(detectGenreFromKeywords("PRESTIGE and REBIRTH tycoon game")).toBe("tycoon");
  });
});

describe("NormalizedBrief schema", () => {
  it("parses a valid brief", () => {
    const brief = NormalizedBrief.parse({
      genre: "tycoon",
      fantasy: "Build a lumber empire",
      coreLoop: ["chop", "sell", "upgrade", "prestige"],
      sessionLengthMin: 20,
      playerCount: 8,
      progressionStyle: "linear",
      keyFeatures: ["pet system", "NPC workers"],
    });
    expect(brief.genre).toBe("tycoon");
    expect(brief.coreLoop).toHaveLength(4);
  });

  it("defaults playerCount to 1", () => {
    const brief = NormalizedBrief.parse({
      genre: "adventure",
      fantasy: "Explore a dungeon",
      coreLoop: ["explore", "fight", "loot"],
      sessionLengthMin: 30,
      progressionStyle: "linear",
      keyFeatures: ["boss fights"],
    });
    expect(brief.playerCount).toBe(1);
  });

  it("rejects invalid genre", () => {
    expect(() =>
      NormalizedBrief.parse({
        genre: "moba",
        fantasy: "x",
        coreLoop: [],
        sessionLengthMin: 10,
        progressionStyle: "linear",
        keyFeatures: [],
      })
    ).toThrow();
  });
});
