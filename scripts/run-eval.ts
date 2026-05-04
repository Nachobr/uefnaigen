#!/usr/bin/env node
/**
 * ForgeAI Eval Runner
 *
 * Modes:
 *   (default)  Smoke: deterministic intent detection + template routing.
 *              No LLM calls, milliseconds per prompt.
 *   --full     End-to-end: runs the full Pipeline against each golden prompt
 *              using the configured provider/model. Records per-prompt cost,
 *              duration, validation status, and writes outputs to a temp dir.
 *              Requires API keys (or Ollama running).
 *
 * Usage: npx tsx scripts/run-eval.ts [--full] [--limit N]
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync, mkdtempSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { detectGenreFromKeywords } from "@forgeai/ai";
import { createDefaultRegistry } from "@forgeai/templates";
import { computeCacheKey, Pipeline } from "@forgeai/core";
import { loadConfig } from "@forgeai/schemas";

const __dirname = import.meta.dirname ?? dirname(fileURLToPath(import.meta.url));

interface EvalResult {
  prompt: string;
  file: string;
  detectedGenre: string | null;
  expectedGenre: string;
  genreMatch: boolean;
  templateId: string | null;
  cacheKey: string;
  durationMs: number;
}

interface FullEvalResult extends EvalResult {
  pipelineCompleted: boolean;
  /** True iff the very first validation pass succeeded (no repair needed). */
  firstPassPassed?: boolean;
  /** True iff the project ultimately validated, possibly after repair. */
  validationPassed?: boolean;
  validationWarnings?: number;
  repairTriggered?: boolean;
  repairPasses?: number;
  packageFileCount?: number;
  costUsd?: number;
  error?: string;
}

const PROMPTS_DIR = join(__dirname, "..", "evals", "golden-prompts");
const RESULTS_DIR = join(__dirname, "..", "evals", "benchmarks");

function inferExpectedGenre(filename: string): string {
  if (filename.startsWith("tycoon")) return "tycoon";
  if (filename.startsWith("arena")) return "battle_arena";
  if (filename.startsWith("adventure")) return "adventure";
  if (filename.startsWith("roleplay")) return "roleplay";
  return "unknown";
}

/** Recursively counts files in `dir`. Returns 0 if dir doesn't exist. */
function countPackageFiles(dir: string): number {
  if (!existsSync(dir)) return 0;
  let count = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) count += countPackageFiles(path);
    else count += 1;
  }
  return count;
}

function parseArgs(argv: string[]): { full: boolean; limit?: number } {
  const out: { full: boolean; limit?: number } = { full: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--full") out.full = true;
    else if (a === "--limit" && argv[i + 1]) {
      out.limit = parseInt(argv[++i], 10);
    } else if (a.startsWith("--limit=")) {
      out.limit = parseInt(a.slice("--limit=".length), 10);
    }
  }
  return out;
}

async function runFull(files: string[]): Promise<void> {
  const config = loadConfig();
  console.log(`ForgeAI Eval Runner [FULL] — ${files.length} prompts | provider=${config.provider} model=${config.model}\n`);

  const tmpRoot = mkdtempSync(join(tmpdir(), "forgeai-eval-"));
  const results: FullEvalResult[] = [];
  let totalCostUsd = 0;

  for (const file of files) {
    const prompt = readFileSync(join(PROMPTS_DIR, file), "utf-8").trim();
    const expectedGenre = inferExpectedGenre(file);
    const start = performance.now();
    const detectedGenre = detectGenreFromKeywords(prompt);

    const outDir = join(tmpRoot, file.replace(/\.txt$/, ""));
    let pipelineCompleted = false;
    let firstPassPassed: boolean | undefined;
    let validationPassed: boolean | undefined;
    let validationWarnings: number | undefined;
    let repairTriggered = false;
    let repairPasses: number | undefined;
    let packageFileCount: number | undefined;
    let templateId: string | null = null;
    let costUsd = 0;
    let error: string | undefined;

    try {
      const pipeline = new Pipeline({
        prompt,
        seed: 42,
        outputDir: outDir,
        config,
        repair: true,
      });
      const result = await pipeline.run();
      pipelineCompleted = true;
      templateId = result.templateResult.templateId;
      firstPassPassed = result.firstPassValidation?.every((v) => v.passed);
      validationPassed = result.validation.every((v) => v.passed);
      validationWarnings = result.validation.reduce((n, v) => n + v.warnings.length, 0);
      repairTriggered = Boolean(result.repairResult);
      repairPasses = result.repairResult?.passesUsed;
      packageFileCount = countPackageFiles(outDir);
      costUsd = pipeline.totalSpentUsd;
      totalCostUsd += costUsd;
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
    }

    const durationMs = performance.now() - start;
    const genreMatch = detectedGenre === expectedGenre;
    const cacheKey = computeCacheKey({
      prompt,
      templateId: templateId ?? "unknown",
      model: config.model,
      seed: 42,
      provider: config.provider,
    });

    results.push({
      prompt: prompt.slice(0, 80),
      file,
      detectedGenre,
      expectedGenre,
      genreMatch,
      templateId,
      cacheKey,
      durationMs,
      pipelineCompleted,
      firstPassPassed,
      validationPassed,
      validationWarnings,
      repairTriggered,
      repairPasses,
      packageFileCount,
      costUsd,
      error,
    });

    const status = !pipelineCompleted
      ? "✗ PIPELINE"
      : validationPassed
        ? firstPassPassed
          ? "✓ FIRST"
          : "✓ REPAIRED"
        : "⚠ VALIDATION";
    console.log(
      `  ${status.padEnd(13)} ${file.padEnd(20)} ${(durationMs / 1000).toFixed(1)}s  $${costUsd.toFixed(4)}  files=${packageFileCount ?? "?"}  ${error ?? ""}`,
    );
  }

  const completed = results.filter((r) => r.pipelineCompleted).length;
  const firstPass = results.filter((r) => r.firstPassPassed).length;
  const passed = results.filter((r) => r.pipelineCompleted && r.validationPassed).length;
  const repaired = results.filter((r) => r.repairTriggered).length;
  const repairedSuccess = results.filter((r) => r.repairTriggered && r.validationPassed).length;
  const total = results.length;
  console.log(`\n─── Summary [FULL] ───`);
  console.log(`  Pipeline OK:        ${completed}/${total}`);
  console.log(`  First-pass valid:   ${firstPass}/${total}`);
  console.log(`  Repair triggered:   ${repaired}/${total}  (succeeded: ${repairedSuccess}/${repaired})`);
  console.log(`  Validation OK:      ${passed}/${total}`);
  console.log(`  Total cost:         $${totalCostUsd.toFixed(4)}`);
  console.log(`  Output dir:         ${tmpRoot}`);

  mkdirSync(RESULTS_DIR, { recursive: true });
  const report = {
    mode: "full",
    timestamp: new Date().toISOString(),
    provider: config.provider,
    model: config.model,
    total,
    completed,
    passed,
    totalCostUsd,
    outputDir: tmpRoot,
    results,
  };
  const outPath = join(RESULTS_DIR, "eval-report-full.json");
  writeFileSync(outPath, JSON.stringify(report, null, 2), "utf-8");
  console.log(`\n  Report: ${outPath}`);
}

async function run(): Promise<void> {
  const { full, limit } = parseArgs(process.argv.slice(2));
  mkdirSync(RESULTS_DIR, { recursive: true });

  let files = readdirSync(PROMPTS_DIR)
    .filter((f) => f.endsWith(".txt"))
    .sort();
  if (limit !== undefined && Number.isFinite(limit) && limit > 0) {
    files = files.slice(0, limit);
  }

  if (full) {
    await runFull(files);
    return;
  }

  console.log(`ForgeAI Eval Runner — ${files.length} prompts\n`);

  const registry = createDefaultRegistry();
  const results: EvalResult[] = [];

  for (const file of files) {
    const prompt = readFileSync(join(PROMPTS_DIR, file), "utf-8").trim();
    const expectedGenre = inferExpectedGenre(file);
    const start = performance.now();

    // Stage 1: Keyword genre detection (deterministic)
    const detectedGenre = detectGenreFromKeywords(prompt);

    // Stage 2: Template routing (if genre detected)
    let templateId: string | null = null;
    if (detectedGenre) {
      try {
        const baseId = `${detectedGenre}/base`;
        registry.resolve(baseId);
        templateId = baseId;
      } catch {
        // No template for this genre yet
      }
    }

    const durationMs = performance.now() - start;

    const genreMatch = detectedGenre === expectedGenre;

    const cacheKey = computeCacheKey({
      prompt,
      templateId: templateId ?? "unknown",
      model: "claude-sonnet-4-20250514",
      seed: 42,
    });

    results.push({
      prompt: prompt.slice(0, 80),
      file,
      detectedGenre,
      expectedGenre,
      genreMatch,
      templateId,
      cacheKey,
      durationMs,
    });

    const icon = genreMatch ? "✓" : "✗";
    console.log(`  ${icon} ${file.padEnd(20)} genre=${detectedGenre?.padEnd(14) ?? "null".padEnd(14)} template=${templateId ?? "none"}`);
  }

  // Summary
  const total = results.length;
  const passed = results.filter((r) => r.genreMatch).length;
  const passRate = ((passed / total) * 100).toFixed(0);
  const avgMs = (results.reduce((s, r) => s + r.durationMs, 0) / total).toFixed(2);

  console.log(`\n─── Summary ───`);
  console.log(`  Total:     ${total}`);
  console.log(`  Passed:    ${passed}/${total} (${passRate}%)`);
  console.log(`  Avg time:  ${avgMs}ms per prompt`);

  // Write results
  const report = {
    timestamp: new Date().toISOString(),
    total,
    passed,
    passRate: `${passRate}%`,
    avgDurationMs: parseFloat(avgMs),
    results,
  };

  const outPath = join(RESULTS_DIR, "eval-report.json");
  writeFileSync(outPath, JSON.stringify(report, null, 2), "utf-8");
  console.log(`\n  Report: ${outPath}`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
