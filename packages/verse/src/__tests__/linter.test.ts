import { describe, it, expect } from "vitest";
import { lintVerseCode } from "../linter.js";

describe("lintVerseCode", () => {
  it("converts // comments to #", () => {
    const { code } = lintVerseCode("    // this is a comment");
    expect(code).toBe("    # this is a comment");
  });

  it("converts ! to not", () => {
    const { code } = lintVerseCode("if (!IsReady):");
    expect(code).toBe("if (not IsReady):");
  });

  it("adds set before +=", () => {
    const { code } = lintVerseCode("        Score += 10");
    expect(code).toBe("        set Score += 10");
  });

  it("does not double-add set", () => {
    const { code } = lintVerseCode("        set Score += 10");
    expect(code).toBe("        set Score += 10");
  });

  it("converts != to <>", () => {
    const { code } = lintVerseCode("if (A != B):");
    expect(code).toBe("if (A <> B):");
  });

  it("converts && to and", () => {
    const { code } = lintVerseCode("if (A && B):");
    expect(code).toBe("if (A and B):");
  });

  it("converts || to or", () => {
    const { code } = lintVerseCode("if (A || B):");
    expect(code).toBe("if (A or B):");
  });

  it("removes semicolons", () => {
    const { code } = lintVerseCode("    DoSomething();");
    expect(code).toBe("    DoSomething()");
  });

  it("tracks applied fixes", () => {
    const { fixesApplied } = lintVerseCode("// comment\n    Score += 1;");
    expect(fixesApplied).toContain("Use # for line comments, not //");
    expect(fixesApplied).toContain("Verse does not use semicolons");
  });
});
