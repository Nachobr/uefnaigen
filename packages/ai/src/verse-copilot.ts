import type { LLMAdapter } from "./adapter.js";

export class VerseCopilot {
  constructor(private llm: LLMAdapter) {}

  async generate(description: string, context?: string): Promise<string> {
    const systemPrompt = `You are a UEFN Verse expert. Generate a complete, valid Verse file from a description.

Output ONLY the raw Verse code — no markdown, no explanation.

Verse rules:
- Indentation-sensitive (4 spaces)
- Classes inherit from creative_device
- @editable for device references
- OnBegin<override>()<suspends>:void is the entry point
- Failable patterns: if (Player := player[Agent]):
- Map access is failable: if (Value := Map[Key]):
- Use "var" for mutable state
- Common imports: using { /Fortnite.com/Devices }, using { /Verse.org/Simulation }`;

    const userMsg = context
      ? `Context:\n${context}\n\nGenerate Verse for: ${description}`
      : `Generate Verse for: ${description}`;

    const response = await this.llm.chat(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMsg },
      ],
      { temperature: 0.2, maxTokens: 4096 },
    );

    return this.stripCodeFences(response.content);
  }

  async fix(verseCode: string, errors: string): Promise<string> {
    const systemPrompt = `You are a UEFN Verse repair expert. Fix the Verse code based on compiler errors.

Output ONLY the corrected Verse code — no markdown, no explanation.

Common fixes:
- Missing optional unwrap guards → add "if" failable pattern
- Type mismatches → cast or use correct type
- Invalid event signatures → match expected delegate signature
- Missing imports → add "using" declaration`;

    const response = await this.llm.chat(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Fix this Verse code:\n\n${verseCode}\n\nCompiler errors:\n${errors}` },
      ],
      { temperature: 0.1, maxTokens: 4096 },
    );

    return this.stripCodeFences(response.content);
  }

  async explain(verseCode: string): Promise<string> {
    const response = await this.llm.chat(
      [
        {
          role: "system",
          content: "You are a UEFN Verse expert. Explain Verse code in plain English. Be concise and focus on what the code does, not how Verse syntax works.",
        },
        { role: "user", content: `Explain this Verse code:\n\n${verseCode}` },
      ],
      { temperature: 0.3, maxTokens: 2048 },
    );

    return response.content;
  }

  private stripCodeFences(content: string): string {
    const match = content.match(/```(?:verse)?\s*([\s\S]*?)```/);
    return match ? match[1].trim() : content.trim();
  }
}
