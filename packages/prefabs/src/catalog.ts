import type { PrefabDefinition } from "@forgeai/schemas";

export class PrefabCatalog {
  private prefabs = new Map<string, PrefabDefinition>();

  add(prefab: PrefabDefinition): void {
    this.prefabs.set(prefab.prefabId, prefab);
  }

  get(id: string): PrefabDefinition | undefined {
    return this.prefabs.get(id);
  }

  list(): PrefabDefinition[] {
    return Array.from(this.prefabs.values());
  }

  findByTags(tags: string[]): PrefabDefinition[] {
    return this.list().filter(p => tags.some(t => p.tags.includes(t)));
  }

  findByCategory(category: string): PrefabDefinition[] {
    return this.list().filter(p => p.category === category);
  }

  findByGenre(genre: string): PrefabDefinition[] {
    return this.list().filter(p => p.supportedGenres.includes(genre));
  }

  merge(other: PrefabCatalog): void {
    for (const prefab of other.list()) {
      this.prefabs.set(prefab.prefabId, prefab);
    }
  }

  get size(): number {
    return this.prefabs.size;
  }
}
