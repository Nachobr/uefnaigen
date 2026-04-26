import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

export interface KnowledgeEntry {
  id: string;
  type: "verse_pattern" | "device_schema" | "economy_template" | "generation_result" | "prompt_example";
  title: string;
  content: string;
  tags: string[];
  genre?: string;
  createdAt: string;
  usageCount: number;
}

const STORE_DIR = join(homedir(), ".forgeai", "knowledge");
const STORE_FILE = join(STORE_DIR, "entries.json");

export interface KnowledgeStoreOptions {
  persist?: boolean;
}

export class KnowledgeStore {
  private entries = new Map<string, KnowledgeEntry>();
  private persist: boolean;

  constructor(options: KnowledgeStoreOptions = {}) {
    this.persist = options.persist ?? true;
    if (this.persist) {
      mkdirSync(STORE_DIR, { recursive: true });
      this.load();
    }
  }

  add(entry: Omit<KnowledgeEntry, "createdAt" | "usageCount">): void {
    const full: KnowledgeEntry = {
      ...entry,
      createdAt: new Date().toISOString(),
      usageCount: 0,
    };
    this.entries.set(entry.id, full);
    this.save();
  }

  get(id: string): KnowledgeEntry | undefined {
    return this.entries.get(id);
  }

  search(query: { tags?: string[]; type?: KnowledgeEntry["type"]; genre?: string }): KnowledgeEntry[] {
    let results = Array.from(this.entries.values());

    if (query.type) {
      results = results.filter((e) => e.type === query.type);
    }
    if (query.genre) {
      results = results.filter((e) => !e.genre || e.genre === query.genre);
    }
    if (query.tags && query.tags.length > 0) {
      results = results.filter((e) =>
        query.tags!.some((t) => e.tags.includes(t)),
      );
    }

    return results.sort((a, b) => b.usageCount - a.usageCount);
  }

  recordUsage(id: string): void {
    const entry = this.entries.get(id);
    if (entry) {
      entry.usageCount++;
      this.save();
    }
  }

  buildContext(query: { tags?: string[]; type?: KnowledgeEntry["type"]; genre?: string; maxTokens?: number }): string {
    const results = this.search(query);
    const maxLen = query.maxTokens ?? 2000;
    const sections: string[] = [];
    let totalLen = 0;

    for (const entry of results) {
      const section = `### ${entry.title}\n${entry.content}`;
      if (totalLen + section.length > maxLen) break;
      sections.push(section);
      totalLen += section.length;
      this.recordUsage(entry.id);
    }

    return sections.join("\n\n");
  }

  list(): KnowledgeEntry[] {
    return Array.from(this.entries.values());
  }

  clear(): void {
    this.entries.clear();
    this.save();
  }

  get size(): number {
    return this.entries.size;
  }

  private load(): void {
    if (!this.persist) return;
    if (!existsSync(STORE_FILE)) return;
    try {
      const raw = readFileSync(STORE_FILE, "utf-8");
      const arr = JSON.parse(raw) as KnowledgeEntry[];
      for (const entry of arr) {
        this.entries.set(entry.id, entry);
      }
    } catch {
      // corrupted file, start fresh
    }
  }

  private save(): void {
    if (!this.persist) return;
    writeFileSync(STORE_FILE, JSON.stringify(Array.from(this.entries.values()), null, 2), "utf-8");
  }
}
