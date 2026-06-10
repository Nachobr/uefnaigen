import { UefnListenerError, type UefnActor, type UefnHttpClient } from "./client.js";
import type { ApplyCommand, ApplyPlan } from "./plan.js";

export interface ExecuteApplyResult {
  executed: number;
  skipped: number;
  warnings: string[];
  reconciliation?: ReconciliationSummary;
}

export interface ReconciliationSummary {
  expectedActorCount: number;
  taggedActorCount: number;
  missingActorCount: number;
}

export interface ExecuteApplyOptions {
  projectInfo?: { project_dir?: string };
}

export async function executeApplyPlan(plan: ApplyPlan, client: UefnHttpClient, options: ExecuteApplyOptions = {}): Promise<ExecuteApplyResult> {
  const actorIds = new Map<string, string>();
  const existingActorIds = await readExistingForgeActorIds(client, plan);
  const warnings = [...plan.warnings];
  let executed = 0;
  let skipped = 0;

  for (const command of plan.commands) {
    if (command.kind === "spawn_device") {
      if (!command.assetPath) {
        skipped += 1;
        continue;
      }

      const existingActorId = existingActorIds.get(command.id);
      if (existingActorId) {
        actorIds.set(command.id, existingActorId);
        const ok = await runWithRetry(warnings, "set_actor_transform", () => client.setActorTransform(
          existingActorId,
          [command.transform.location.x, command.transform.location.y, command.transform.location.z],
          [command.transform.rotation.pitch, command.transform.rotation.yaw, command.transform.rotation.roll],
        ));
        if (ok) executed += 1;
        else skipped += 1;
        continue;
      }

      const actor = await runWithRetry(warnings, "spawn_actor", () => client.spawnActor({
        asset_path: command.assetPath,
        location: [command.transform.location.x, command.transform.location.y, command.transform.location.z],
        rotation: [command.transform.rotation.pitch, command.transform.rotation.yaw, command.transform.rotation.roll],
      }));
      const actorPath = actor ? readActorPath(actor) : undefined;
      if (actorPath) {
        actorIds.set(command.id, actorPath);
        await runWithRetry(warnings, "execute_python", () => client.executePython(buildTagActorPython(actorPath, command.id, command.label, command.zoneId)));
      } else if (actor !== undefined) {
        warnings.push(`Could not tag ${command.id}; listener response did not include an actor path.`);
      }
      if (actor !== undefined) executed += 1;
      else skipped += 1;
      continue;
    }

    if (command.kind === "set_properties") {
      const actorPath = actorIds.get(command.id);
      if (!actorPath) {
        skipped += 1;
        warnings.push(`Skipped properties for ${command.id}; actor was not spawned in this run.`);
        continue;
      }
      const result = await runWithRetry(warnings, "set_actor_properties", () => client.setActorProperties(actorPath, command.properties));
      if (result) {
        for (const [key, value] of Object.entries(result)) {
          if (value !== "ok") warnings.push(`Property "${key}" not applied to ${command.id}: ${value}`);
        }
        executed += 1;
      } else {
        skipped += 1;
      }
      continue;
    }

    if (command.kind === "create_spawn_point") {
      const existingActorId = existingActorIds.get(command.id);
      const result = existingActorId
        ? await runWithRetry(warnings, "set_actor_transform", () => client.setActorTransform(existingActorId, [command.location.x, command.location.y, command.location.z], [0, 0, 0]))
        : await runWithRetry(warnings, "execute_python", () => client.createSpawnPoint(command.id, [command.location.x, command.location.y, command.location.z], command.zoneId));
      if (result !== undefined) executed += 1;
      else skipped += 1;
      continue;
    }

    if (command.kind === "save_current_level") {
      const ok = await runWithRetry(warnings, "save_current_level", () => client.saveCurrentLevel());
      if (ok !== undefined) executed += 1;
      else skipped += 1;
      continue;
    }

    if (command.kind === "write_verse") {
      const capabilities = await client.capabilities();
      if (capabilities?.forgeai_fork) {
        const result = await runWithRetry(warnings, "write_project_file", () => client.writeProjectFile(`Verse/${command.fileName}`, command.content));
        if (result !== undefined) executed += 1;
        else skipped += 1;
        continue;
      }
      if (!options.projectInfo?.project_dir) {
        skipped += 1;
        warnings.push(`Skipped Verse file ${command.fileName}; UEFN project dir was unavailable.`);
        continue;
      }
      const result = await runWithRetry(warnings, "execute_python", () => client.executePython(buildWriteVersePython(options.projectInfo!.project_dir!, command.fileName, command.content)));
      if (result !== undefined) executed += 1;
      else skipped += 1;
      continue;
    }

    skipped += 1;
    warnings.push(skipReason(command));
  }

  return { executed, skipped, warnings, reconciliation: await reconcileApply(plan, client) };
}

function readActorPath(actor: UefnActor): string | undefined {
  return actor.path ?? actor.name;
}

async function readExistingForgeActorIds(client: UefnHttpClient, plan: ApplyPlan): Promise<Map<string, string>> {
  try {
    const actors = await client.getAllActors();
    const existing = new Map<string, string>();
    for (const actor of actors) {
      const actorPath = readActorPath(actor);
      if (!actorPath) continue;
      const forgeTag = actor.tags?.find((tag) => tag.startsWith("forgeai:"));
      if (forgeTag) {
        existing.set(forgeTag.slice("forgeai:".length), actorPath);
        continue;
      }
      const matching = plan.commands.find((command) => command.kind === "spawn_device" && command.label === actor.label);
      if (matching?.kind === "spawn_device") existing.set(matching.id, actorPath);
    }
    return existing;
  } catch {
    return new Map();
  }
}

async function runWithRetry<T>(warnings: string[], label: string, fn: () => Promise<T>): Promise<T | undefined> {
  try {
    return await fn();
  } catch (error) {
    if (!isRetryable(error)) throw error;
  }

  await new Promise((resolve) => setTimeout(resolve, 1_000));

  try {
    return await fn();
  } catch (error) {
    warnings.push(`${label} failed after retry: ${error instanceof Error ? error.message : String(error)}`);
    return undefined;
  }
}

function isRetryable(error: unknown): boolean {
  return error instanceof UefnListenerError ? error.status === 504 : error instanceof Error;
}

function buildWriteVersePython(projectDir: string, fileName: string, content: string): string {
  return [
    "from pathlib import Path",
    `project_path = Path(${JSON.stringify(projectDir)})`,
    `verse_dir = project_path / "Verse"`,
    "verse_dir.mkdir(parents=True, exist_ok=True)",
    `target = verse_dir / ${JSON.stringify(fileName)}`,
    `target.write_text(${JSON.stringify(content)}, encoding="utf-8")`,
    "result = str(target)",
  ].join("\n");
}

function buildTagActorPython(actorPath: string, forgeId: string, label: string, zoneId?: string): string {
  const tags = ["forgeai", `forgeai:${forgeId}`, ...(zoneId ? [`zone:${zoneId}`] : [])];
  return [
    "import unreal",
    "actors = unreal.EditorLevelLibrary.get_all_level_actors()",
    `actor_path = ${JSON.stringify(actorPath)}`,
    "actor = next((a for a in actors if a.get_name() == actor_path or a.get_path_name() == actor_path), None)",
    "if actor:",
    `    actor.set_actor_label(${JSON.stringify(label)})`,
    `    actor.tags = list(dict.fromkeys(list(getattr(actor, "tags", [])) + ${JSON.stringify(tags)}))`,
    "result = actor.get_name() if actor else None",
  ].join("\n");
}

async function reconcileApply(plan: ApplyPlan, client: UefnHttpClient): Promise<ReconciliationSummary | undefined> {
  try {
    const actors = await client.getAllActors();
    const expectedActorCount = plan.commands.filter((command) => command.kind === "spawn_device" || command.kind === "create_spawn_point").length;
    const taggedActorCount = actors.filter((actor) => actor.tags?.includes("forgeai") || actor.label?.includes("ForgeAI")).length;
    return {
      expectedActorCount,
      taggedActorCount,
      missingActorCount: Math.max(0, expectedActorCount - taggedActorCount),
    };
  } catch {
    return undefined;
  }
}

function skipReason(command: ApplyCommand): string {
  switch (command.kind) {
    case "wire_channels":
      return `Skipped channel wiring for ${command.id}; live channel wiring is not implemented yet.`;
    case "write_verse":
      return `Skipped Verse file ${command.fileName}.`;
    case "spawn_device":
    case "create_spawn_point":
    case "set_properties":
    case "save_current_level":
      return `Skipped ${command.kind}.`;
  }
}
