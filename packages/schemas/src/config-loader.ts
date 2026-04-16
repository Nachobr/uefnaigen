import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import { ForgeAIConfig } from "./config.js";

const CONFIG_DIR = join(homedir(), ".forgeai");
const CONFIG_FILE = join(CONFIG_DIR, "config.yaml");

const DEFAULT_CONFIG: Record<string, unknown> = {
  provider: "anthropic",
  model: "claude-sonnet-4-20250514",
  apiKeys: {},
  outputDir: "./output",
  verbose: false,
  maxRepairPasses: 3,
};

function readConfigFile(): Record<string, unknown> {
  if (!existsSync(CONFIG_FILE)) return {};
  try {
    const raw = readFileSync(CONFIG_FILE, "utf-8");
    return (parseYaml(raw) as Record<string, unknown>) ?? {};
  } catch {
    return {};
  }
}

function readEnvVars(): Record<string, unknown> {
  const env: Record<string, unknown> = {};
  const apiKeys: Record<string, string> = {};

  if (process.env.ANTHROPIC_API_KEY) apiKeys.anthropic = process.env.ANTHROPIC_API_KEY;
  if (process.env.OPENAI_API_KEY) apiKeys.openai = process.env.OPENAI_API_KEY;
  if (process.env.GROQ_API_KEY) apiKeys.groq = process.env.GROQ_API_KEY;
  if (Object.keys(apiKeys).length > 0) env.apiKeys = apiKeys;

  if (process.env.FORGEAI_PROVIDER) env.provider = process.env.FORGEAI_PROVIDER;
  if (process.env.FORGEAI_MODEL) env.model = process.env.FORGEAI_MODEL;
  if (process.env.FORGEAI_OUTPUT_DIR) env.outputDir = process.env.FORGEAI_OUTPUT_DIR;
  if (process.env.FORGEAI_VERBOSE) env.verbose = process.env.FORGEAI_VERBOSE === "true";

  return env;
}

export interface CLIFlags {
  provider?: string;
  model?: string;
  out?: string;
  verbose?: boolean;
  budget?: number;
}

function fromCLIFlags(flags: CLIFlags): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  if (flags.provider) result.provider = flags.provider;
  if (flags.model) result.model = flags.model;
  if (flags.out) result.outputDir = flags.out;
  if (flags.verbose !== undefined) result.verbose = flags.verbose;
  if (flags.budget !== undefined) result.budgetUsd = flags.budget;
  return result;
}

function deepMerge(
  base: Record<string, unknown>,
  ...overrides: Record<string, unknown>[]
): Record<string, unknown> {
  const result = { ...base };
  for (const override of overrides) {
    for (const [key, value] of Object.entries(override)) {
      if (
        value !== null &&
        typeof value === "object" &&
        !Array.isArray(value) &&
        typeof result[key] === "object" &&
        result[key] !== null &&
        !Array.isArray(result[key])
      ) {
        result[key] = deepMerge(
          result[key] as Record<string, unknown>,
          value as Record<string, unknown>,
        );
      } else {
        result[key] = value;
      }
    }
  }
  return result;
}

/**
 * Load config with precedence: defaults < config file < env vars < CLI flags
 */
export function loadConfig(cliFlags: CLIFlags = {}): ForgeAIConfig {
  const fileConfig = readConfigFile();
  const envConfig = readEnvVars();
  const flagConfig = fromCLIFlags(cliFlags);

  const merged = deepMerge(DEFAULT_CONFIG, fileConfig, envConfig, flagConfig);
  return ForgeAIConfig.parse(merged);
}

/**
 * Initialize the config directory and write a default config file.
 */
export function initConfig(): string {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
  if (!existsSync(CONFIG_FILE)) {
    writeFileSync(CONFIG_FILE, stringifyYaml(DEFAULT_CONFIG), "utf-8");
  }
  return CONFIG_FILE;
}
