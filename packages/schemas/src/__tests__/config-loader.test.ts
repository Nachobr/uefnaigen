import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { loadConfig } from "../config-loader.js";

// Mock node:fs to prevent reading real ~/.forgeai/config.yaml
vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs")>();
  return {
    ...actual,
    existsSync: vi.fn(() => false),
  };
});

describe("loadConfig", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.OPENAI_API_KEY;
    delete process.env.GOOGLE_API_KEY;
    delete process.env.GROQ_API_KEY;
    delete process.env.FORGEAI_PROVIDER;
    delete process.env.FORGEAI_MODEL;
    delete process.env.FORGEAI_OLLAMA_BASE_URL;
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

  it("sets Ollama base URL from env and CLI flags", () => {
    process.env.FORGEAI_OLLAMA_BASE_URL = "https://example.ngrok-free.app";
    expect(loadConfig().ollamaBaseUrl).toBe("https://example.ngrok-free.app");
    expect(loadConfig({ ollamaUrl: "http://localhost:11434" }).ollamaBaseUrl).toBe("http://localhost:11434");
  });

  it("sets Verse stage override from CLI flags", () => {
    const config = loadConfig({
      verseProvider: "anthropic",
      verseModel: "claude-sonnet-4-20250514",
      verseOllamaUrl: "https://verse.example.ngrok-free.app",
    });
    expect(config.stageOverrides?.["8-verseFiles"]).toEqual({
      provider: "anthropic",
      model: "claude-sonnet-4-20250514",
      ollamaUrl: "https://verse.example.ngrok-free.app",
    });
  });

  it("trims whitespace from Ollama base URL", () => {
    process.env.FORGEAI_OLLAMA_BASE_URL = "https://example.ngrok-free.app ";
    expect(loadConfig().ollamaBaseUrl).toBe("https://example.ngrok-free.app");
    expect(loadConfig({ ollamaUrl: " http://localhost:11434 " }).ollamaBaseUrl).toBe("http://localhost:11434");
  });
});
