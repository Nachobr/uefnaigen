import { describe, it, expect } from "vitest";
import { VerseEmitter } from "../emitter.js";
import type { VerseModule } from "@forgeai/schemas";

const emitter = new VerseEmitter();

function makeModule(overrides: Partial<VerseModule> = {}): VerseModule {
  return {
    kind: "module",
    name: "EconomyManager",
    imports: [
      { kind: "import", path: "/Fortnite.com/Devices" },
      { kind: "import", path: "/Verse.org/Simulation" },
    ],
    declarations: [
      {
        kind: "class",
        name: "tycoon_economy_manager",
        extends: "creative_device",
        fields: [
          {
            kind: "field",
            name: "SellTrigger",
            type: "trigger_device",
            editable: true,
            defaultValue: { kind: "expression", code: "trigger_device{}" },
          },
          {
            kind: "field",
            name: "PlayerCurrency",
            type: "[player]int",
          },
        ],
        methods: [
          {
            kind: "function",
            name: "OnBegin",
            params: [],
            returnType: "void",
            attributes: ["override", "suspends"],
            body: [
              { kind: "statement", code: "SellTrigger.TriggeredEvent.Subscribe(HandleSell)" },
            ],
          },
          {
            kind: "function",
            name: "HandleSell",
            params: [{ name: "Agent", type: "agent" }],
            returnType: "void",
            body: [
              { kind: "statement", code: 'if (Player := player[Agent]):\n    set PlayerCurrency[Player] = GetCurrency(Player) + 25' },
            ],
          },
        ],
      },
    ],
    ...overrides,
  };
}

describe("VerseEmitter", () => {
  it("emits using declarations", () => {
    const output = emitter.emit(makeModule());
    expect(output).toContain("using { /Fortnite.com/Devices }");
    expect(output).toContain("using { /Verse.org/Simulation }");
  });

  it("emits class definition with extends", () => {
    const output = emitter.emit(makeModule());
    expect(output).toContain("tycoon_economy_manager := class(creative_device):");
  });

  it("emits @editable fields with default values", () => {
    const output = emitter.emit(makeModule());
    expect(output).toContain("    @editable");
    expect(output).toContain("    SellTrigger : trigger_device = trigger_device{}");
  });

  it("emits var fields without editable", () => {
    const output = emitter.emit(makeModule());
    expect(output).toContain("    var PlayerCurrency : [player]int");
  });

  it("emits method with attributes", () => {
    const output = emitter.emit(makeModule());
    expect(output).toContain("    OnBegin<override, suspends>():void =");
  });

  it("emits method with params", () => {
    const output = emitter.emit(makeModule());
    expect(output).toContain("    HandleSell(Agent:agent):void =");
  });

  it("emits method body with proper indentation", () => {
    const output = emitter.emit(makeModule());
    expect(output).toContain("        SellTrigger.TriggeredEvent.Subscribe(HandleSell)");
  });

  it("handles multiline statements", () => {
    const output = emitter.emit(makeModule());
    expect(output).toContain("        if (Player := player[Agent]):");
    expect(output).toContain("            set PlayerCurrency[Player] = GetCurrency(Player) + 25");
  });

  it("emits empty method body as TODO", () => {
    const mod = makeModule({
      declarations: [
        {
          kind: "class",
          name: "test_class",
          fields: [],
          methods: [
            { kind: "function", name: "DoThing", params: [], body: [] },
          ],
        },
      ],
    });
    const output = emitter.emit(mod);
    expect(output).toContain("# TODO: implement");
  });

  it("emits class without extends", () => {
    const mod = makeModule({
      declarations: [
        {
          kind: "class",
          name: "helper_class",
          fields: [],
          methods: [],
        },
      ],
    });
    const output = emitter.emit(mod);
    expect(output).toContain("helper_class := class:");
  });

  it("emits standalone function declarations", () => {
    const mod: VerseModule = {
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
          ],
          returnType: "int",
          body: [{ kind: "statement", code: "if (Value < Min). return Min\nreturn Value" }],
        },
      ],
    };
    const output = emitter.emit(mod);
    expect(output).toContain("Clamp(Value:int, Min:int):int =");
  });

  it("produces valid Verse-like output for the spec example", () => {
    const output = emitter.emit(makeModule());
    const lines = output.split("\n");
    // Should start with using declarations
    expect(lines[0]).toBe("using { /Fortnite.com/Devices }");
    // Should end with a newline (trimmed trailing whitespace)
    expect(output.endsWith("\n")).toBe(true);
  });
});
