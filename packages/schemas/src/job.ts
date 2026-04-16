import { z } from "zod";

export const JobStatus = z.enum([
  "draft",
  "planning",
  "generated",
  "validating",
  "packaged",
  "complete",
  "cancelled",
  "failed",
  "failed_validation",
]);
export type JobStatus = z.infer<typeof JobStatus>;

export const JobRecord = z.object({
  jobId: z.string().uuid(),
  projectId: z.string(),
  status: JobStatus,
  currentStage: z.number().int().min(1).max(8),
  startedAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  completedAt: z.string().datetime().optional(),
  seed: z.number().int(),
  prompt: z.string(),
  templateId: z.string().optional(),
  error: z.string().optional(),
  stageResults: z.record(z.string(), z.unknown()).optional(),
});
export type JobRecord = z.infer<typeof JobRecord>;
