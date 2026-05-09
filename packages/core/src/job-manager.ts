import type { JobRecord, JobStatus } from "@forgeai/schemas";
import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

export interface JobManagerOptions {
  persist?: boolean;
}

export class JobManager {
  private jobs = new Map<string, JobRecord>();
  private persist: boolean;
  private jobsDir: string;

  constructor(options: JobManagerOptions = {}) {
    this.persist = options.persist ?? true;
    this.jobsDir = join(homedir(), ".forgeai", "jobs");
    if (this.persist) {
      mkdirSync(this.jobsDir, { recursive: true });
    }
  }

  create(prompt: string, seed: number): JobRecord {
    const now = new Date().toISOString();
    const job: JobRecord = {
      jobId: randomUUID(),
      projectId: randomUUID(),
      status: "draft",
      currentStage: 1,
      startedAt: now,
      updatedAt: now,
      seed,
      prompt,
    };
    this.jobs.set(job.jobId, job);
    this.save(job);
    return job;
  }

  transition(jobId: string, status: JobStatus, stage?: number): JobRecord {
    const job = this.jobs.get(jobId) ?? this.load(jobId);
    if (!job) throw new Error(`Job not found: ${jobId}`);
    job.status = status;
    if (stage !== undefined) job.currentStage = stage;
    job.updatedAt = new Date().toISOString();
    this.jobs.set(jobId, job);
    this.save(job);
    return job;
  }

  get(jobId: string): JobRecord | undefined {
    return this.jobs.get(jobId) ?? this.load(jobId);
  }

  listAll(): JobRecord[] {
    if (!this.persist) return Array.from(this.jobs.values());
    try {
      const files = readdirSync(this.jobsDir).filter((f) => f.endsWith(".json"));
      return files.map((f) => {
        const raw = readFileSync(join(this.jobsDir, f), "utf-8");
        return JSON.parse(raw) as JobRecord;
      });
    } catch {
      return [];
    }
  }

  private save(job: JobRecord): void {
    if (!this.persist) return;
    writeFileSync(join(this.jobsDir, `${job.jobId}.json`), JSON.stringify(job, null, 2), "utf-8");
  }

  private load(jobId: string): JobRecord | undefined {
    if (!this.persist) return undefined;
    const path = join(this.jobsDir, `${jobId}.json`);
    if (!existsSync(path)) return undefined;
    try {
      const raw = readFileSync(path, "utf-8");
      const job = JSON.parse(raw) as JobRecord;
      this.jobs.set(jobId, job);
      return job;
    } catch {
      return undefined;
    }
  }
}
