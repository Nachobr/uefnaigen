import { describe, it, expect } from "vitest";
import { VerseModule } from "@forgeai/schemas";
import { normalizeVerseModule } from "../verse-generator.js";

describe("normalizeVerseModule", () => {
  it("coerces non-statement body items into statements with code preserved", () => {
    const malformed = {
      kind: "module",
      name: "tycoon_economy_manager",
      imports: [{ kind: "import", path: "/Fortnite.com/Devices" }],
      declarations: [
        {
          kind: "class",
          name: "tycoon_economy_manager",
          extends: "creative_device",
          fields: [],
          methods: [
            {
              kind: "function",
              name: "OnBegin",
              params: [],
              returnType: "void",
              attributes: ["override", "suspends"],
              body: [
                { kind: "statement", code: "Print(\"hi\")" },
                { kind: "expression", code: "if (Player := player[Agent]):" },
                "Print(\"raw string\")",
              ],
            },
          ],
        },
      ],
    };

    const normalized = normalizeVerseModule(malformed);
    const result = VerseModule.safeParse(normalized);
    expect(result.success).toBe(true);
    if (!result.success) return;

    const cls = result.data.declarations[0];
    if (cls.kind !== "class") throw new Error("expected class declaration");
    const body = cls.methods[0].body;
    expect(body).toHaveLength(3);
    expect(body[0]).toEqual({ kind: "statement", code: 'Print("hi")' });
    expect(body[1]).toEqual({ kind: "statement", code: "if (Player := player[Agent]):" });
    expect(body[2]).toEqual({ kind: "statement", code: 'Print("raw string")' });
  });

  it("normalizes top-level function declarations too", () => {
    const malformed = {
      kind: "module",
      name: "helpers",
      imports: [],
      declarations: [
        {
          kind: "function",
          name: "DoThing",
          params: [],
          returnType: "void",
          body: [{ kind: "if", code: "if (X = Y):" }],
        },
      ],
    };
    const normalized = normalizeVerseModule(malformed) as { declarations: { body: unknown[] }[] };
    const fn = normalized.declarations[0];
    expect(fn.body[0]).toEqual({ kind: "statement", code: "if (X = Y):" });
  });

  it("leaves a fully-valid module untouched semantically", () => {
    const valid = {
      kind: "module",
      name: "ok",
      imports: [{ kind: "import", path: "/Fortnite.com/Devices" }],
      declarations: [
        {
          kind: "class",
          name: "ok",
          extends: "creative_device",
          fields: [],
          methods: [
            {
              kind: "function",
              name: "OnBegin",
              params: [],
              returnType: "void",
              attributes: ["override", "suspends"],
              body: [{ kind: "statement", code: "Print(\"ok\")" }],
            },
          ],
        },
      ],
    };
    const normalized = normalizeVerseModule(valid);
    expect(VerseModule.safeParse(normalized).success).toBe(true);
  });
});
