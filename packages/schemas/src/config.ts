import { z } from "zod";

export const LLMProvider = z.enum(["anthropic", "openai", "groq", "ollama", "google"]);
export type LLMProvider = z.infer<typeof LLMProvider>;

export const PricingTier = z.enum(["free", "pro", "studio"]);
export type PricingTier = z.infer<typeof PricingTier>;

export const TierLimits = z.object({
  maxGenerationsPerMonth: z.number().int(),
  maxCopilotCallsPerDay: z.number().int(),
  premiumTemplates: z.boolean(),
  privateCatalogs: z.boolean(),
  sharedTemplates: z.boolean(),
  desktopApp: z.boolean(),
});
export type TierLimits = z.infer<typeof TierLimits>;

export const TIER_LIMITS: Record<PricingTier, TierLimits> = {
  free: {
    maxGenerationsPerMonth: 2,
    maxCopilotCallsPerDay: 10,
    premiumTemplates: false,
    privateCatalogs: false,
    sharedTemplates: false,
    desktopApp: false,
  },
  pro: {
    maxGenerationsPerMonth: 50,
    maxCopilotCallsPerDay: 100,
    premiumTemplates: true,
    privateCatalogs: false,
    sharedTemplates: false,
    desktopApp: true,
  },
  studio: {
    maxGenerationsPerMonth: 500,
    maxCopilotCallsPerDay: 1000,
    premiumTemplates: true,
    privateCatalogs: true,
    sharedTemplates: true,
    desktopApp: true,
  },
};

export const ForgeAIConfig = z.object({
  provider: LLMProvider.default("anthropic"),
  model: z.string().default("claude-sonnet-4-20250514"),
  apiKeys: z.object({
    anthropic: z.string().optional(),
    openai: z.string().optional(),
    groq: z.string().optional(),
    google: z.string().optional(),
  }),
  ollamaBaseUrl: z.string().default("http://localhost:11434"),
  outputDir: z.string().default("./output"),
  defaultGenre: z.string().optional(),
  verbose: z.boolean().default(false),
  maxRepairPasses: z.number().int().min(1).max(5).default(3),
  budgetUsd: z.number().positive().optional(),
  tier: PricingTier.default("free"),
});
export type ForgeAIConfig = z.infer<typeof ForgeAIConfig>;
