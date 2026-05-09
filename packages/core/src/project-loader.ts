import { existsSync, readdirSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, relative } from "node:path";
import { WorldProject, LayoutSpec, EconomySpec, DeviceInstance, PrefabDefinition, VariantZone, TemplateDefinition } from "@forgeai/schemas";

export interface WorldgenLock {
  specVersion?: string;
  projectId?: string;
  seed?: number;
  genre?: string;
  templateId?: string | null;
  templateVersion?: string | null;
  fileHashes?: Record<string, string>;
}

export interface LoadedProject {
  projectDir: string;
  project: WorldProject;
  verseFiles: Map<string, string>;
  resolvedTemplate?: TemplateDefinition;
  lock?: WorldgenLock;
  humanEditedFiles: string[];
}

export function loadProject(projectDir: string): LoadedProject {
  const worldPath = join(projectDir, "manifests", "world.project.json");
  const aiDir = join(projectDir, ".ai");
  if (!existsSync(worldPath) || !existsSync(aiDir)) {
    throw new Error(`Not a ForgeAI scaffold: expected manifests/world.project.json and .ai/ in ${projectDir}`);
  }

  const world = readJson<Record<string, unknown>>(worldPath);
  const project = WorldProject.parse({
    ...world,
    layout: readJsonIfExists(join(projectDir, "manifests", "layout.grid.json"), world.layout, LayoutSpec),
    economy: readJsonIfExists(join(projectDir, "manifests", "economy.json"), world.economy, EconomySpec),
    devices: readJsonIfExists(join(projectDir, "manifests", "device_manifest.json"), world.devices, DeviceInstance.array()),
    prefabs: readJsonIfExists(join(projectDir, "manifests", "prefab_manifest.json"), world.prefabs, PrefabDefinition.array()),
    variantZones: readJsonIfExists(join(projectDir, "manifests", "variant_zones.json"), world.variantZones, VariantZone.array()),
  });

  const lock = readJsonIfExists<WorldgenLock>(join(projectDir, "worldgen.lock.json"));
  const resolvedTemplate = readJsonIfExists<TemplateDefinition>(join(projectDir, "templates", "resolved-template.json"), undefined, TemplateDefinition);

  return {
    projectDir,
    project,
    verseFiles: readVerseFiles(projectDir),
    resolvedTemplate,
    lock,
    humanEditedFiles: detectHumanEditedFiles(projectDir, lock),
  };
}

export function detectHumanEditedFiles(projectDir: string, lock?: WorldgenLock): string[] {
  if (!lock?.fileHashes) return [];

  const changed: string[] = [];
  for (const [file, expected] of Object.entries(lock.fileHashes)) {
    const path = join(projectDir, file);
    if (!existsSync(path) || hashFile(path) !== expected) {
      changed.push(file);
    }
  }
  return changed.sort();
}

export function hashFile(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function readVerseFiles(projectDir: string): Map<string, string> {
  const verseDir = join(projectDir, "Verse");
  const files = new Map<string, string>();
  if (!existsSync(verseDir)) return files;

  for (const entry of readdirSync(verseDir, { withFileTypes: true })) {
    if (entry.isFile() && entry.name.endsWith(".verse")) {
      files.set(entry.name, readFileSync(join(verseDir, entry.name), "utf-8"));
    }
  }
  return files;
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf-8")) as T;
}

function readJsonIfExists<T>(path: string): T | undefined;
function readJsonIfExists<T>(path: string, fallback: T | undefined, schema?: { parse(value: unknown): T }): T | undefined;
function readJsonIfExists<T>(path: string, fallback?: T, schema?: { parse(value: unknown): T }): T | undefined {
  if (!existsSync(path)) return fallback;
  const value = readJson<unknown>(path);
  return schema ? schema.parse(value) : value as T;
}

export function toProjectRelative(projectDir: string, path: string): string {
  return relative(projectDir, path).split(/[\\/]/).join("/");
}
