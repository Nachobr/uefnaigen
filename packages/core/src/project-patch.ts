import { z } from "zod";
import { WorldProject } from "@forgeai/schemas";

const PatchPath = z.string().min(1);

export const AddPatchOperation = z.object({
  op: z.literal("add"),
  path: PatchPath,
  value: z.unknown(),
});

export const ReplacePatchOperation = z.object({
  op: z.literal("replace"),
  path: PatchPath,
  value: z.unknown(),
});

export const RemovePatchOperation = z.object({
  op: z.literal("remove"),
  path: PatchPath,
});

export const RegenerateVerseModuleOperation = z.object({
  op: z.literal("regenerate_verse_module"),
  moduleName: z.string().min(1),
  reason: z.string().min(1),
  modulePlanPatch: z.unknown().optional(),
});

export const ProjectPatchOperation = z.discriminatedUnion("op", [
  AddPatchOperation,
  ReplacePatchOperation,
  RemovePatchOperation,
  RegenerateVerseModuleOperation,
]);
export type ProjectPatchOperation = z.infer<typeof ProjectPatchOperation>;

export const ProjectPatch = z.object({
  summary: z.string().min(1),
  operations: z.array(ProjectPatchOperation),
});
export type ProjectPatch = z.infer<typeof ProjectPatch>;

export interface ApplyProjectPatchResult {
  project: WorldProject;
  touchedVerseModules: string[];
  changedPaths: string[];
}

type PathSegment =
  | { kind: "property"; key: string }
  | { kind: "append"; key: string }
  | { kind: "selector"; key: string; field: string; value: string };

export function applyProjectPatch(project: WorldProject, patch: ProjectPatch): ApplyProjectPatchResult {
  const next = structuredClone(project) as WorldProject;
  const touchedVerseModules = new Set<string>();
  const changedPaths: string[] = [];

  for (const operation of patch.operations) {
    if (operation.op === "regenerate_verse_module") {
      touchedVerseModules.add(operation.moduleName);
      changedPaths.push(`Verse/${operation.moduleName}`);
      continue;
    }

    applyDataOperation(next, operation);
    changedPaths.push(operation.path);
  }

  return {
    project: WorldProject.parse(next),
    touchedVerseModules: [...touchedVerseModules].sort(),
    changedPaths,
  };
}

function applyDataOperation(project: WorldProject, operation: Exclude<ProjectPatchOperation, { op: "regenerate_verse_module" }>): void {
  const segments = parsePath(operation.path);
  if (segments.length === 0) throw new Error(`Invalid patch path: ${operation.path}`);

  const last = segments.at(-1);
  if (!last) throw new Error(`Invalid patch path: ${operation.path}`);
  const parent = resolvePath(project, segments.slice(0, -1), operation.path);

  if (operation.op === "add") {
    addValue(parent, last, operation.value, operation.path);
  } else if (operation.op === "replace") {
    replaceValue(parent, last, operation.value, operation.path);
  } else {
    removeValue(parent, last, operation.path);
  }
}

function addValue(parent: unknown, segment: PathSegment, value: unknown, fullPath: string): void {
  if (segment.kind === "append") {
    const target = readProperty(parent, segment.key, fullPath);
    if (!Array.isArray(target)) throw new Error(`Patch path is not an array: ${fullPath}`);
    target.push(value);
    return;
  }
  if (segment.kind !== "property") throw new Error(`Add requires an object property or [] array path: ${fullPath}`);
  const object = asRecord(parent, fullPath);
  if (Object.hasOwn(object, segment.key)) throw new Error(`Patch add target already exists: ${fullPath}`);
  object[segment.key] = value;
}

function replaceValue(parent: unknown, segment: PathSegment, value: unknown, fullPath: string): void {
  if (segment.kind === "property") {
    const object = asRecord(parent, fullPath);
    if (!Object.hasOwn(object, segment.key)) throw new Error(`Patch replace target does not exist: ${fullPath}`);
    object[segment.key] = value;
    return;
  }
  const { array, index } = resolveArrayElement(parent, segment, fullPath);
  array[index] = value;
}

function removeValue(parent: unknown, segment: PathSegment, fullPath: string): void {
  if (segment.kind === "property") {
    const object = asRecord(parent, fullPath);
    if (!Object.hasOwn(object, segment.key)) throw new Error(`Patch remove target does not exist: ${fullPath}`);
    delete object[segment.key];
    return;
  }
  const { array, index } = resolveArrayElement(parent, segment, fullPath);
  array.splice(index, 1);
}

function resolvePath(root: unknown, segments: PathSegment[], fullPath: string): unknown {
  let current = root;
  for (const segment of segments) {
    if (segment.kind === "property") {
      current = readProperty(current, segment.key, fullPath);
    } else if (segment.kind === "selector") {
      current = resolveArrayElement(current, segment, fullPath).value;
    } else {
      throw new Error(`Append marker must be the last path segment: ${fullPath}`);
    }
  }
  return current;
}

function resolveArrayElement(parent: unknown, segment: Exclude<PathSegment, { kind: "property" }>, fullPath: string): { array: unknown[]; index: number; value: unknown } {
  if (segment.kind === "append") throw new Error(`Append marker cannot select an existing element: ${fullPath}`);
  const target = readProperty(parent, segment.key, fullPath);
  if (!Array.isArray(target)) throw new Error(`Patch selector target is not an array: ${fullPath}`);
  const index = target.findIndex((entry) => asRecord(entry, fullPath)[segment.field] === segment.value);
  if (index === -1) throw new Error(`Patch selector did not match: ${fullPath}`);
  return { array: target, index, value: target[index] };
}

function readProperty(parent: unknown, key: string, fullPath: string): unknown {
  const object = asRecord(parent, fullPath);
  if (!Object.hasOwn(object, key)) throw new Error(`Patch path does not exist: ${fullPath}`);
  return object[key];
}

function asRecord(value: unknown, fullPath: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`Patch path does not resolve to an object: ${fullPath}`);
  }
  return value as Record<string, unknown>;
}

function parsePath(path: string): PathSegment[] {
  const segments = path.split(".").filter(Boolean);
  if (segments.length === 0) throw new Error(`Invalid patch path: ${path}`);
  return segments.map((segment) => {
    if (segment.endsWith("[]")) {
      return { kind: "append", key: segment.slice(0, -2) };
    }
    const match = /^(?<key>[a-zA-Z0-9_]+)\[(?<field>[a-zA-Z0-9_]+)=(?<value>[^\]]+)\]$/.exec(segment);
    if (match?.groups) {
      return { kind: "selector", key: match.groups.key, field: match.groups.field, value: match.groups.value };
    }
    return { kind: "property", key: segment };
  });
}
