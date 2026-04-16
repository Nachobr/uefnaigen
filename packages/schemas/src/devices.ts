import { z } from "zod";

export const DeviceType = z.enum([
  "trigger",
  "button",
  "item_granter",
  "item_spawner",
  "barrier",
  "tracker",
  "score_manager",
  "creature_spawner",
  "save_point",
  "teleporter",
  "hud_message",
  "prop_mover",
  "timer",
]);
export type DeviceType = z.infer<typeof DeviceType>;

export const Transform = z.object({
  location: z.object({ x: z.number(), y: z.number(), z: z.number() }),
  rotation: z.object({ pitch: z.number(), yaw: z.number(), roll: z.number() }),
});
export type Transform = z.infer<typeof Transform>;

export const DeviceEventBinding = z.object({
  event: z.string(),
  target: z.string(),
  action: z.string(),
});
export type DeviceEventBinding = z.infer<typeof DeviceEventBinding>;

export const DeviceInstance = z.object({
  id: z.string(),
  type: DeviceType,
  label: z.string(),
  transform: Transform,
  properties: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.array(z.string())])),
  channels: z.object({
    listens: z.array(z.string()),
    transmits: z.array(z.string()),
  }).optional(),
  events: z.array(DeviceEventBinding).optional(),
  zoneId: z.string().optional(),
  tags: z.array(z.string()).optional(),
});
export type DeviceInstance = z.infer<typeof DeviceInstance>;
