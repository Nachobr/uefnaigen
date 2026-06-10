export interface UefnHealth {
  status?: string;
  version?: string;
  port?: number;
  commands?: string[];
  forgeai_fork?: string;
}

export interface UefnProjectInfo {
  project_name?: string;
  content_root?: string;
  project_dir?: string;
}

export interface UefnVector {
  x: number;
  y: number;
  z: number;
}

export interface UefnRotator {
  pitch: number;
  yaw: number;
  roll: number;
}

export interface UefnActor {
  name?: string;
  label?: string;
  class?: string;
  path?: string;
  location?: UefnVector;
  rotation?: UefnRotator;
  scale?: UefnVector;
  tags?: string[];
}

export interface SpawnActorRequest {
  asset_path?: string;
  actor_class?: string;
  location?: [number, number, number];
  rotation?: [number, number, number];
}

export class UefnListenerError extends Error {
  constructor(public readonly command: string, public readonly listenerError: string | undefined, public readonly status: number) {
    super(`UEFN listener command "${command}" failed (${status}): ${listenerError ?? "unknown error"}`);
    this.name = "UefnListenerError";
  }
}

export class UefnHttpClient {
  constructor(private readonly baseUrl: string) {}

  async capabilities(): Promise<UefnHealth | undefined> {
    try {
      const response = await fetch(`${this.baseUrl}/`, { signal: AbortSignal.timeout(2_000) });
      if (!response.ok) return undefined;
      return await response.json() as UefnHealth;
    } catch {
      return undefined;
    }
  }

  async ping(): Promise<boolean> {
    const health = await this.capabilities();
    return health?.status === "ok";
  }

  async getProjectInfo(): Promise<UefnProjectInfo> {
    return this.command<UefnProjectInfo>("get_project_info");
  }

  async getAllActors(classFilter?: string): Promise<UefnActor[]> {
    const params = classFilter ? { class_filter: classFilter } : {};
    const result = await this.command<{ actors?: UefnActor[] }>("get_all_actors", params);
    return result.actors ?? [];
  }

  async spawnActor(request: SpawnActorRequest): Promise<UefnActor | undefined> {
    const result = await this.command<{ actor?: UefnActor }>("spawn_actor", request as Record<string, unknown>);
    return result.actor;
  }

  async setActorTransform(actorPath: string, location: [number, number, number], rotation: [number, number, number]): Promise<UefnActor | undefined> {
    const result = await this.command<{ actor?: UefnActor }>("set_actor_transform", { actor_path: actorPath, location, rotation });
    return result.actor;
  }

  async setActorProperties(actorPath: string, properties: Record<string, unknown>): Promise<Record<string, string>> {
    const result = await this.command<{ properties?: Record<string, string> }>("set_actor_properties", { actor_path: actorPath, properties });
    return result.properties ?? {};
  }

  async executePython(code: string): Promise<{ result?: unknown; stdout?: string; stderr?: string }> {
    return this.command("execute_python", { code });
  }

  async writeProjectFile(relativePath: string, content: string): Promise<{ path?: string }> {
    return this.command("write_project_file", { relative_path: relativePath, content });
  }

  async doesAssetExist(assetPath: string): Promise<boolean> {
    const result = await this.command<{ exists?: boolean }>("does_asset_exist", { asset_path: assetPath });
    return result.exists === true;
  }

  async saveCurrentLevel(): Promise<void> {
    await this.command("save_current_level");
  }

  async createSpawnPoint(id: string, location: [number, number, number], zoneId: string): Promise<{ result?: unknown; stdout?: string; stderr?: string }> {
    return this.executePython(buildCreateSpawnPointPython(id, location, zoneId));
  }

  private async command<T>(command: string, params: Record<string, unknown> = {}): Promise<T> {
    const response = await fetch(`${this.baseUrl}/`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ command, params }),
      signal: AbortSignal.timeout(35_000),
    });
    const body = await response.json() as { success?: boolean; result?: unknown; error?: string };
    if (body.success === true) return body.result as T;
    throw new UefnListenerError(command, body.error, response.status);
  }
}

export async function discoverUefnListener(startPort = 8765, endPort = 8770): Promise<UefnHttpClient | undefined> {
  for (let port = startPort; port <= endPort; port += 1) {
    const client = new UefnHttpClient(`http://127.0.0.1:${port}`);
    if (await client.ping()) return client;
  }
  return undefined;
}

function buildCreateSpawnPointPython(id: string, location: [number, number, number], zoneId: string): string {
  return [
    "import unreal",
    `location = unreal.Vector(${location[0]}, ${location[1]}, ${location[2]})`,
    "rotation = unreal.Rotator(0, 0, 0)",
    "actor_class = unreal.EditorAssetLibrary.load_blueprint_class('/Fortnite/Devices/PlayerSpawnPad/PlayerSpawnPad.PlayerSpawnPad')",
    "actor = unreal.EditorLevelLibrary.spawn_actor_from_class(actor_class, location, rotation) if actor_class else None",
    "if actor:",
    `    actor.set_actor_label(${JSON.stringify(`ForgeAI Spawn ${id}`)})`,
    `    actor.tags = list(actor.tags) + [${JSON.stringify("forgeai")}, ${JSON.stringify(`forgeai:${id}`)}, ${JSON.stringify(`zone:${zoneId}`)}]`,
    "result = actor.get_name() if actor else None",
  ].join("\n");
}
