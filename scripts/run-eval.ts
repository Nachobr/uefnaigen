#!/usr/bin/env node
/**
 * ForgeAI Eval Runner
 *
 * Runs golden prompts through deterministic pipeline stages (intent detection,
 * template routing) and reports pass rates. Full E2E runs require API keys.
 *
 * Usage: npx tsx scripts/run-eval.ts [--full]
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { detectGenreFromKeywords } from "@forgeai/ai";
import { createDefaultRegistry } from "@forgeai/templates";
import { computeCacheKey } from "@forgeai/core";

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

const PROMPTS_DIR = join(__dirname, "..", "evals", "golden-prompts");
const RESULTS_DIR = join(__dirname, "..", "evals", "benchmarks");

function inferExpectedGenre(filename: string): string {
  if (filename.startsWith("tycoon")) return "tycoon";
  if (filename.startsWith("arena")) return "battle_arena";
  if (filename.startsWith("adventure")) return "adventure";
  if (filename.startsWith("roleplay")) return "roleplay";
  return "unknown";
}

function run(): void {
  mkdirSync(RESULTS_DIR, { recursive: true });

  const files = readdirSync(PROMPTS_DIR)
    .filter((f) => f.endsWith(".txt"))
    .sort();

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

run();
