import { z } from "zod";

export const LLMProvider = z.enum(["anthropic", "openai", "groq", "ollama"]);
export type LLMProvider = z.infer<typeof LLMProvider>;

export const ForgeAIConfig = z.object({
  provider: LLMProvider.default("anthropic"),
  model: z.string().default("claude-sonnet-4-20250514"),
  apiKeys: z.object({
    anthropic: z.string().optional(),
    openai: z.string().optional(),
    groq: z.string().optional(),
  }),
  ollamaBaseUrl: z.string().default("http://localhost:11434"),
  outputDir: z.string().default("./output"),
  defaultGenre: z.string().optional(),
  verbose: z.boolean().default(false),
  maxRepairPasses: z.number().int().min(1).max(5).default(3),
  budgetUsd: z.number().positive().optional(),
});
export type ForgeAIConfig = z.infer<typeof ForgeAIConfig>;
