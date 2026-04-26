import { describe, expect, it } from "vitest";
import { z } from "zod";
import { applyNormalizers, generateValidated } from "../structured-output.js";
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
