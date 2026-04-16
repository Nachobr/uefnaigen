import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { loadConfig } from "../config-loader.js";

describe("loadConfig", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.OPENAI_API_KEY;
    delete process.env.FORGEAI_PROVIDER;
    delete process.env.FORGEAI_MODEL;
    delete process.env.FORGEAI_OUTPUT_DIR;
    delete process.env.FORGEAI_VERBOSE;
  });

  afterEach(() => {
    Object.assign(process.env, originalEnv);
  });

  it("returns defaults with no config file, env, or flags", () => {
    const config = loadConfig();
    expect(config.provider).toBe("anthropic");
    expect(config.model).toBe("claude-sonnet-4-20250514");
    expect(config.verbose).toBe(false);
    expect(config.maxRepairPasses).toBe(3);
  });

  it("picks up env vars", () => {
    process.env.ANTHROPIC_API_KEY = "sk-test-123";
    process.env.FORGEAI_VERBOSE = "true";
    const config = loadConfig();
    expect(config.apiKeys.anthropic).toBe("sk-test-123");
    expect(config.verbose).toBe(true);
  });

  it("CLI flags override env vars", () => {
    process.env.FORGEAI_PROVIDER = "anthropic";
    const config = loadConfig({ provider: "openai" });
    expect(config.provider).toBe("openai");
  });

  it("CLI flags set budget", () => {
    const config = loadConfig({ budget: 5.0 });
    expect(config.budgetUsd).toBe(5.0);
  });

  it("CLI flags set output dir", () => {
    const config = loadConfig({ out: "/tmp/test-output" });
    expect(config.outputDir).toBe("/tmp/test-output");
  });
});
