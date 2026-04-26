import { describe, expect, it } from "vitest";
import { applyNormalizers } from "../structured-output.js";

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
