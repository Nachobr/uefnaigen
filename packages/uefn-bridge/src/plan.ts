import type { DeviceInstance, LayoutSpec } from "@forgeai/schemas";
import { loadDeviceCatalog, resolveDeviceType, type DeviceCatalog } from "./catalog.js";

export type ApplyCommand =
  | { kind: "spawn_device"; id: string; label: string; deviceType: string; assetPath?: string; transform: DeviceInstance["transform"]; zoneId?: string }
  | { kind: "create_spawn_point"; id: string; location: LayoutSpec["spawnPoints"][number]["location"]; zoneId: string }
  | { kind: "set_properties"; id: string; properties: DeviceInstance["properties"] }
  | { kind: "wire_channels"; id: string; listens: string[]; transmits: string[] }
  | { kind: "write_verse"; fileName: string; content: string }
  | { kind: "save_current_level" };

export interface ApplyPlan {
  commands: ApplyCommand[];
  warnings: string[];
  stats: {
    deviceCount: number;
    spawnPointCount: number;
    verseFileCount: number;
    unmappedDeviceCount: number;
  };
}

export interface PlanApplyInput {
  devices: DeviceInstance[];
  layout: LayoutSpec;
  verseFiles?: Map<string, string>;
  catalog?: DeviceCatalog;
}

export function planApply(input: PlanApplyInput): ApplyPlan {
  const catalog = input.catalog ?? loadDeviceCatalog();
  const commands: ApplyCommand[] = [];
  const warnings: string[] = [];
  let unmappedDeviceCount = 0;

  for (const device of input.devices) {
    const resolved = resolveDeviceType(device.type, catalog);
    if (!resolved.mapped) {
      unmappedDeviceCount += 1;
      warnings.push(`No UEFN asset mapping for device type "${device.type}" (${device.id}); dry-run only until catalog is populated.`);
    }

    commands.push({
      kind: "spawn_device",
      id: device.id,
      label: device.label,
      deviceType: device.type,
      assetPath: resolved.assetPath,
      transform: device.transform,
      zoneId: device.zoneId,
    });

    if (Object.keys(device.properties).length > 0) {
      commands.push({ kind: "set_properties", id: device.id, properties: device.properties });
    }

    if (device.channels && (device.channels.listens.length > 0 || device.channels.transmits.length > 0)) {
      commands.push({
        kind: "wire_channels",
        id: device.id,
        listens: device.channels.listens,
        transmits: device.channels.transmits,
      });
    }
  }

  for (const spawnPoint of input.layout.spawnPoints) {
    commands.push({
      kind: "create_spawn_point",
      id: spawnPoint.id,
      location: spawnPoint.location,
      zoneId: spawnPoint.zoneId,
    });
  }

  for (const [fileName, content] of input.verseFiles ?? new Map<string, string>()) {
    commands.push({ kind: "write_verse", fileName, content });
  }

  commands.push({ kind: "save_current_level" });

  return {
    commands,
    warnings,
    stats: {
      deviceCount: input.devices.length,
      spawnPointCount: input.layout.spawnPoints.length,
      verseFileCount: input.verseFiles?.size ?? 0,
      unmappedDeviceCount,
    },
  };
}
