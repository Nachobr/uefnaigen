import { Command } from "commander";
import { accessSync, constants, existsSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { loadConfig, type ForgeAIConfig, type LLMProvider } from "@forgeai/schemas";
import { discoverUefnListener } from "@forgeai/uefn-bridge";

type CheckStatus = "pass" | "warn" | "fail";

interface DoctorCheck {
  name: string;
  status: CheckStatus;
  message: string;
}

export const doctorCommand = new Command("doctor")
  .description("Check local environment for ForgeAI requirements")
  .option("--provider <id>", "Choose AI provider")
  .option("--model <id>", "Override default model")
  .option("--ollama-url <url>", "Ollama-compatible base URL")
  .option("--live", "Check for a live UEFN listener")
  .option("--json", "Machine-readable output")
  .action(async (options: { json?: boolean; live?: boolean; provider?: string; model?: string; ollamaUrl?: string }) => {
    const checks = await runDoctorChecks(options);
    const ok = checks.every((check) => check.status !== "fail");

    if (options.json) {
      console.log(JSON.stringify({ ok, checks }, null, 2));
      if (!ok) process.exitCode = 1;
      return;
    }

    console.log("ForgeAI Doctor\n");
    for (const check of checks) {
      console.log(`  ${check.name.padEnd(14)} ${statusIcon(check.status)} ${check.message}`);
    }
    console.log(`\n${ok ? "✓ Ready to go!" : "✗ Fix failed checks above before running."}`);
    if (!ok) process.exitCode = 1;
  });

async function runDoctorChecks(options: { live?: boolean; provider?: string; model?: string; ollamaUrl?: string } = {}): Promise<DoctorCheck[]> {
  const checks: DoctorCheck[] = [];
  const nodeVersion = process.version;
  const nodeMajor = parseInt(nodeVersion.slice(1), 10);
  checks.push({
    name: "Node.js",
    status: nodeMajor >= 20 ? "pass" : "fail",
    message: nodeMajor >= 20 ? `${nodeVersion}` : `${nodeVersion} (need >=20)`,
  });

  const configPath = join(homedir(), ".forgeai", "config.yaml");
  checks.push({
    name: "Config",
    status: existsSync(configPath) ? "pass" : "warn",
    message: existsSync(configPath) ? configPath : `not found; run "uefn-ai init" to create ${configPath}`,
  });

  let outputDir = "./output";
  let ollamaBaseUrl = "http://localhost:11434";
  let parsedConfig: ForgeAIConfig | undefined;
  try {
    const config = loadConfig(options);
    parsedConfig = config;
    outputDir = config.outputDir;
    ollamaBaseUrl = config.ollamaBaseUrl;
    checks.push({ name: "Config parse", status: "pass", message: "valid" });
  } catch (err) {
    checks.push({
      name: "Config parse",
      status: "fail",
      message: err instanceof Error ? err.message : String(err),
    });
  }

  checks.push(checkWritablePath("Output dir", resolve(outputDir), false));
  checks.push(checkWritablePath("Stage cache", join(homedir(), ".forgeai", "stage-cache"), true));
  checks.push(checkWritablePath("Memo cache", join(homedir(), ".forgeai", "memo-cache"), true));
  if (parsedConfig?.stageOverrides) {
    for (const [stage, override] of Object.entries(parsedConfig.stageOverrides)) {
      const provider = override.provider ?? parsedConfig.provider;
      const model = override.model ?? parsedConfig.model;
      checks.push({
        name: "Stage override",
        status: stageOverrideAvailable(provider),
        message: `${stage}: ${provider}/${model}${override.ollamaUrl ? ` at ${override.ollamaUrl}` : ""}`,
      });
    }
  }

  const providers = [
    ["Anthropic", "ANTHROPIC_API_KEY"],
    ["OpenAI", "OPENAI_API_KEY"],
    ["Groq", "GROQ_API_KEY"],
    ["Google", "GOOGLE_API_KEY"],
  ] as const;
  let hasProvider = false;
  for (const [name, envVar] of providers) {
    const present = Boolean(process.env[envVar]);
    hasProvider ||= present;
    checks.push({
      name,
      status: present ? "pass" : "warn",
      message: present ? "key set" : `${envVar} not set`,
    });
  }

  const hasOllama = await isOllamaRunning(ollamaBaseUrl);
  hasProvider ||= hasOllama;
  checks.push({
    name: "Ollama",
    status: hasOllama ? "pass" : "warn",
    message: hasOllama ? `running at ${ollamaBaseUrl}` : `not detected at ${ollamaBaseUrl}`,
  });
  checks.push({
    name: "LLM provider",
    status: hasProvider ? "pass" : "fail",
    message: hasProvider ? "at least one provider is available" : "set an API key or start Ollama",
  });

  const uefnPath = process.env.UEFN_PATH ?? process.env.FORTNITE_UEFN_PATH;
  checks.push({
    name: "UEFN path",
    status: uefnPath && existsSync(uefnPath) ? "pass" : "warn",
    message: uefnPath
      ? existsSync(uefnPath)
        ? uefnPath
        : `${uefnPath} does not exist`
      : "UEFN_PATH not set; import must be done manually",
  });

  if (options.live) checks.push(await checkUefnListener());

  return checks;
}

async function checkUefnListener(): Promise<DoctorCheck> {
  const client = await discoverUefnListener();
  if (!client) {
    return {
      name: "UEFN listener",
      status: "warn",
      message: "no listener on 8765-8770 — open UEFN with the ForgeAI listener installed",
    };
  }
  const capabilities = await client.capabilities();
  const port = capabilities?.port ? `port ${capabilities.port}` : "detected port";
  return {
    name: "UEFN listener",
    status: "pass",
    message: `listening on ${port} (${capabilities?.forgeai_fork ? `fork ${capabilities.forgeai_fork}` : "upstream"})`,
  };
}

function checkWritablePath(name: string, path: string, create: boolean): DoctorCheck {
  try {
    if (create) mkdirSync(path, { recursive: true });
    const target = existsSync(path) ? path : dirname(path);
    accessSync(target, constants.W_OK);
    return { name, status: "pass", message: existsSync(path) ? path : `${path} can be created` };
  } catch (err) {
    return {
      name,
      status: "fail",
      message: err instanceof Error ? err.message : String(err),
    };
  }
}

async function isOllamaRunning(baseUrl: string): Promise<boolean> {
  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, "")}/api/tags`);
    return res.ok;
  } catch {
    return false;
  }
}

function stageOverrideAvailable(provider: LLMProvider): CheckStatus {
  if (provider === "ollama") return "pass";
  const envVars: Record<Exclude<LLMProvider, "ollama">, string> = {
    anthropic: "ANTHROPIC_API_KEY",
    openai: "OPENAI_API_KEY",
    groq: "GROQ_API_KEY",
    google: "GOOGLE_API_KEY",
  };
  return process.env[envVars[provider]] ? "pass" : "warn";
}

function statusIcon(status: CheckStatus): string {
  if (status === "pass") return "✓";
  if (status === "warn") return "!";
  return "✗";
}
