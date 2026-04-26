import { Command } from "commander";

export const doctorCommand = new Command("doctor")
  .description("Check local environment for ForgeAI requirements")
  .action(async () => {
    console.log("ForgeAI Doctor\n");

    // Node version
    const nodeVersion = process.version;
    const nodeMajor = parseInt(nodeVersion.slice(1));
    console.log(`  Node.js:    ${nodeVersion} ${nodeMajor >= 20 ? "✓" : "✗ (need ≥20)"}`);

    // API keys
    const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;
    const hasOpenAI = !!process.env.OPENAI_API_KEY;
    const hasGroq = !!process.env.GROQ_API_KEY;
    const hasGoogle = !!process.env.GOOGLE_API_KEY;
    console.log(`  Anthropic:  ${hasAnthropic ? "✓ key set" : "✗ ANTHROPIC_API_KEY not set"}`);
    console.log(`  OpenAI:     ${hasOpenAI ? "✓ key set" : "✗ OPENAI_API_KEY not set"}`);
    console.log(`  Groq:       ${hasGroq ? "✓ key set" : "✗ GROQ_API_KEY not set"}`);
    console.log(`  Google:     ${hasGoogle ? "✓ key set" : "✗ GOOGLE_API_KEY not set"}`);

    // Ollama
    const hasOllama = await (async () => {
      try {
        const res = await fetch("http://localhost:11434/api/tags");
        return res.ok;
      } catch {
        return false;
      }
    })();
    console.log(`  Ollama:     ${hasOllama ? "✓ running" : "✗ not detected at localhost:11434"}`);

    // Summary
    const ok = nodeMajor >= 20 && (hasAnthropic || hasOpenAI || hasGroq || hasGoogle || hasOllama);
    console.log(`\n${ok ? "✓ Ready to go!" : "✗ Fix issues above before running."}`);
  });
