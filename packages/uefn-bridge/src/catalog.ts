import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { z } from "zod";

export const DeviceCatalogEntry = z.object({
  assetPath: z.string().min(1).nullable(),
  propMap: z.record(z.string()).optional(),
});
export type DeviceCatalogEntry = z.infer<typeof DeviceCatalogEntry>;

export const DeviceCatalog = z.record(DeviceCatalogEntry);
export type DeviceCatalog = z.infer<typeof DeviceCatalog>;

const defaultCatalogPath = fileURLToPath(new URL("./asset-map/devices.catalog.json", import.meta.url));

export function loadDeviceCatalog(filePath = defaultCatalogPath): DeviceCatalog {
  return DeviceCatalog.parse(JSON.parse(readFileSync(filePath, "utf-8")));
}

export interface DeviceResolution {
  type: string;
  assetPath?: string;
  mapped: boolean;
}

export function resolveDeviceType(type: string, catalog: DeviceCatalog): DeviceResolution {
  const entry = catalog[type];
  return { type, assetPath: entry?.assetPath ?? undefined, mapped: Boolean(entry?.assetPath) };
}
