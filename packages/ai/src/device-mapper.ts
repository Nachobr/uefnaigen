import { DeviceInstance } from "@forgeai/schemas";
import { z } from "zod";
import type { LLMAdapter } from "./adapter.js";
import type { SystemsDesign } from "./systems-planner.js";
import type { LayoutSpec } from "@forgeai/schemas";

const DeviceArray = z.array(DeviceInstance);

const SYSTEM_PROMPT = `You are a UEFN device placement mapper. Given a layout and systems design, produce concrete device instances with transforms, channels, and properties.

Return ONLY a valid JSON array of device instances matching this schema:
[
  {
    "id": "dev_sell_trigger_zone1",
    "type": "trigger|button|item_granter|item_spawner|barrier|tracker|score_manager|creature_spawner|save_point|teleporter|hud_message|prop_mover|timer",
    "label": "Human-readable label",
    "transform": {
      "location": { "x": number, "y": number, "z": number },
      "rotation": { "pitch": 0, "yaw": 0, "roll": 0 }
    },
    "properties": { "key": "value" },
    "channels": { "listens": ["ch_1"], "transmits": ["ch_2"] },
    "events": [{ "event": "OnTriggered", "target": "dev_id", "action": "Activate" }],
    "zoneId": "zone_1",
    "tags": ["economy", "sell"]
  }
]

Rules:
- Place devices WITHIN their zone's footprint bounds
- Use zone center as default placement, offset for multiple devices
- Each device from the systems design must become a concrete DeviceInstance
- Add barrier devices at zone unlock gates
- Add tracker devices for currency display
- Add save_point in the starter area
- Use meaningful channel names (e.g., "ch_sell_zone1", "ch_unlock_zone2")
- Device IDs must be unique`;

export class DeviceMapper {
  constructor(private llm: LLMAdapter) {}

  async map(
    layout: LayoutSpec,
    systemsDesign: SystemsDesign,
  ): Promise<DeviceInstance[]> {
    const zoneInfo = layout.zones
      .map(
        (z) =>
          `${z.zoneId}: "${z.name}" at (${z.footprint.x},${z.footprint.y}) size ${z.footprint.w}x${z.footprint.h}`,
      )
      .join("\n");

    const deviceInfo = systemsDesign.devices
      .map((d) => `${d.id}: ${d.type} "${d.label}" in ${d.zoneId} — ${d.purpose}`)
      .join("\n");

    const userMsg = `Map these devices to concrete placements:

Layout zones:
${zoneInfo}

Devices to place:
${deviceInfo}

Game rules:
${systemsDesign.gameRules.map((r) => `- ${r.description}`).join("\n")}

Produce a JSON array of DeviceInstance objects with exact coordinates within each zone's bounds.`;

    const response = await this.llm.chat(
      [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMsg },
      ],
      { temperature: 0.1, maxTokens: 8192, jsonMode: true },
    );

    let parsed: unknown;
    try {
      parsed = JSON.parse(response.content);
    } catch {
      const match = response.content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (match) {
        parsed = JSON.parse(match[1]);
      } else {
        throw new Error("Failed to parse DeviceMapper response as JSON");
      }
    }

    // Handle wrapped responses like { "devices": [...] }
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const obj = parsed as Record<string, unknown>;
      const arrayKey = Object.keys(obj).find((k) => Array.isArray(obj[k]));
      if (arrayKey) {
        parsed = obj[arrayKey];
      }
    }

    return DeviceArray.parse(parsed);
  }
}
