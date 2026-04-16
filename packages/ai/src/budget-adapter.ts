import type { LLMAdapter, LLMMessage, LLMResponse } from "./adapter.js";

export class BudgetExceededError extends Error {
  constructor(public spentUsd: number, public budgetUsd: number) {
    super(`Budget exceeded: spent $${spentUsd.toFixed(4)} of $${budgetUsd.toFixed(2)} limit`);
    this.name = "BudgetExceededError";
  }
}

export class BudgetAdapter implements LLMAdapter {
  private spentUsd = 0;

  constructor(
    private inner: LLMAdapter,
    private budgetUsd: number,
  ) {}

  get totalSpentUsd(): number {
    return this.spentUsd;
  }

  async chat(
    messages: LLMMessage[],
    options?: { temperature?: number; maxTokens?: number; jsonMode?: boolean },
  ): Promise<LLMResponse> {
    if (this.spentUsd >= this.budgetUsd) {
      throw new BudgetExceededError(this.spentUsd, this.budgetUsd);
    }

    const response = await this.inner.chat(messages, options);

    if (response.usage?.costUsd) {
      this.spentUsd += response.usage.costUsd;
    } else if (response.usage) {
      // Estimate cost if not provided (rough Claude/GPT pricing: $3/M input, $15/M output)
      const estimated = (response.usage.inputTokens * 3 + response.usage.outputTokens * 15) / 1_000_000;
      this.spentUsd += estimated;
    }

    if (this.spentUsd > this.budgetUsd) {
      throw new BudgetExceededError(this.spentUsd, this.budgetUsd);
    }

    return response;
  }
}
