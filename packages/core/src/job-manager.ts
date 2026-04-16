import type { JobRecord, JobStatus } from "@forgeai/schemas";
import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

const JOBS_DIR = join(homedir(), ".forgeai", "jobs");

export class JobManager {
  private jobs = new Map<string, JobRecord>();

  constructor() {
    mkdirSync(JOBS_DIR, { recursive: true });
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
    try {
      const files = readdirSync(JOBS_DIR).filter((f) => f.endsWith(".json"));
      return files.map((f) => {
        const raw = readFileSync(join(JOBS_DIR, f), "utf-8");
        return JSON.parse(raw) as JobRecord;
      });
    } catch {
      return [];
    }
  }

  private save(job: JobRecord): void {
    writeFileSync(join(JOBS_DIR, `${job.jobId}.json`), JSON.stringify(job, null, 2), "utf-8");
  }

  private load(jobId: string): JobRecord | undefined {
    const path = join(JOBS_DIR, `${jobId}.json`);
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
