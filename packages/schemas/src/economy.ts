import { z } from "zod";

export const CurrencySpec = z.object({
  currencyId: z.string(),
  name: z.string(),
  icon: z.string().optional(),
  cap: z.number().optional(),
  persistent: z.boolean().default(true),
});
export type CurrencySpec = z.infer<typeof CurrencySpec>;

export const IncomeSource = z.object({
  sourceId: z.string(),
  name: z.string(),
  currencyId: z.string(),
  baseRate: z.number(),
  rateUnit: z.enum(["per_action", "per_second", "per_minute"]),
  zoneId: z.string().optional(),
  upgradeMultiplierKey: z.string().optional(),
});
export type IncomeSource = z.infer<typeof IncomeSource>;

export const CurrencySink = z.object({
  sinkId: z.string(),
  name: z.string(),
  currencyId: z.string(),
  cost: z.number(),
  type: z.enum(["purchase", "upgrade", "unlock", "prestige"]),
  repeatable: z.boolean().default(false),
});
export type CurrencySink = z.infer<typeof CurrencySink>;

export const TargetCurves = z.object({
  timeToFirstUpgradeSec: z.number(),
  timeToAutomationMin: z.number().optional(),
  timeToPrestigeMin: z.number().optional(),
});
export type TargetCurves = z.infer<typeof TargetCurves>;

export const EconomySpec = z.object({
  currencies: z.array(CurrencySpec),
  generators: z.array(IncomeSource),
  sinks: z.array(CurrencySink),
  targetCurves: TargetCurves,
});
export type EconomySpec = z.infer<typeof EconomySpec>;
