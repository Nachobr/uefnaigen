import { DeviceInstance } from "@forgeai/schemas";
import { z } from "zod";
import type { LLMAdapter } from "./adapter.js";
import { parseJsonResponse } from "./parse-json.js";
import { applyNormalizers } from "./structured-output.js";
import { withKnowledgeContext } from "./prompt-context.js";
import type { SystemsDesign } from "./systems-planner.js";
import type { DeviceInstance as DeviceInstanceType, LayoutSpec } from "@forgeai/schemas";

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
  constructor(private llm: LLMAdapter, private knowledgeContext = "") {}

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
        { role: "system", content: withKnowledgeContext(SYSTEM_PROMPT, this.knowledgeContext) },
        { role: "user", content: userMsg },
      ],
      { temperature: 0.1, maxTokens: 8192, jsonMode: true },
    );

    let parsed = normalizeDeviceInstances(parseJsonResponse(response.content, "DeviceMapper"), layout, systemsDesign);

    parsed = applyNormalizers(parsed) as typeof parsed;
    return DeviceArray.parse(parsed);
  }
}

export function normalizeDeviceInstances(
  data: unknown,
  layout: LayoutSpec,
  systemsDesign: SystemsDesign,
): unknown {
  const collected = collectDeviceCandidates(data);
  if (collected.length === 0) return data;

  return collected.map((candidate, index) => normalizeDeviceCandidate(candidate, index, layout, systemsDesign));
}

function collectDeviceCandidates(value: unknown): Record<string, unknown>[] {
  if (!value || typeof value !== "object") return [];
  if (Array.isArray(value)) return value.flatMap(collectDeviceCandidates);

  const obj = value as Record<string, unknown>;
  if (isDeviceCandidate(obj)) return [obj];
  if (Array.isArray(obj.devices)) return obj.devices.flatMap(collectDeviceCandidates);
  if (obj.devices && typeof obj.devices === "object") return collectDeviceCandidates(obj.devices);

  return Object.values(obj).flatMap(collectDeviceCandidates);
}

function isDeviceCandidate(obj: Record<string, unknown>): boolean {
  return (
    typeof obj.id === "string" ||
    typeof obj.type === "string" ||
    typeof obj.label === "string" ||
    obj.transform !== undefined
  );
}

function normalizeDeviceCandidate(
  candidate: Record<string, unknown>,
  index: number,
  layout: LayoutSpec,
  systemsDesign: SystemsDesign,
): DeviceInstanceType {
  const fallbackSystem = systemsDesign.devices[index] ?? systemsDesign.devices[0];
  const id = typeof candidate.id === "string" ? candidate.id : fallbackSystem?.id ?? `dev_${index + 1}`;
  const type = typeof candidate.type === "string" ? candidate.type : fallbackSystem?.type ?? "trigger";
  const label = typeof candidate.label === "string" ? candidate.label : fallbackSystem?.label ?? id;
  const zoneId = typeof candidate.zoneId === "string" ? candidate.zoneId : fallbackSystem?.zoneId;
  const zone = layout.zones.find((z) => z.zoneId === zoneId) ?? layout.zones[0];

  return {
    id,
    type,
    label,
    transform: DeviceInstance.shape.transform.safeParse(candidate.transform).success
      ? candidate.transform as DeviceInstanceType["transform"]
      : {
          location: {
            x: zone ? zone.footprint.x + zone.footprint.w / 2 : index * 100,
            y: zone ? zone.footprint.y + zone.footprint.h / 2 : 0,
            z: 0,
          },
          rotation: { pitch: 0, yaw: 0, roll: 0 },
        },
    properties: isPlainRecord(candidate.properties) ? candidate.properties as DeviceInstanceType["properties"] : {},
    channels: DeviceInstance.shape.channels.safeParse(candidate.channels).success
      ? candidate.channels as DeviceInstanceType["channels"]
      : undefined,
    events: Array.isArray(candidate.events) ? candidate.events as DeviceInstanceType["events"] : undefined,
    zoneId,
    tags: Array.isArray(candidate.tags) ? candidate.tags.filter((t): t is string => typeof t === "string") : undefined,
  };
}

function isPlainRecord(value: unknown): value is Record<string, string | number | boolean | string[]> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
