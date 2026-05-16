import type { LLMAdapter, LLMMessage, LLMResponse } from "./adapter.js";
import { estimateCostUsd, type ProviderId } from "./pricing.js";

export class BudgetExceededError extends Error {
  constructor(public spentUsd: number, public budgetUsd: number) {
    super(`Budget exceeded: spent $${spentUsd.toFixed(4)} of $${budgetUsd.toFixed(2)} limit`);
    this.name = "BudgetExceededError";
  }
}

export interface UsageEvent {
  provider: ProviderId;
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  estimated: boolean;
  timestamp: string;
}

export interface SharedBudget {
  spentUsd: number;
}

export interface BudgetAdapterOptions {
  provider?: ProviderId;
  model?: string;
  /** Persisted cumulative spend already consumed before this process started (for cross-process budgets). */
  initialSpentUsd?: number;
  /** Shared in-process spend pool used when multiple adapters participate in one run. */
  sharedBudget?: SharedBudget;
  onUsage?: (event: UsageEvent) => void;
}

export class BudgetAdapter implements LLMAdapter {
  private budgetState: SharedBudget;
  private provider: ProviderId;
  private model: string;
  private onUsage?: (event: UsageEvent) => void;

  constructor(
    private inner: LLMAdapter,
    private budgetUsd: number,
    options: BudgetAdapterOptions = {},
  ) {
    this.provider = options.provider ?? "anthropic";
    this.model = options.model ?? "";
    this.budgetState = options.sharedBudget ?? { spentUsd: options.initialSpentUsd ?? 0 };
    this.onUsage = options.onUsage;
  }

  get totalSpentUsd(): number {
    return this.budgetState.spentUsd;
  }

  async chat(
    messages: LLMMessage[],
    options?: { temperature?: number; maxTokens?: number; jsonMode?: boolean },
  ): Promise<LLMResponse> {
    if (this.budgetState.spentUsd >= this.budgetUsd) {
      throw new BudgetExceededError(this.budgetState.spentUsd, this.budgetUsd);
    }

    const response = await this.inner.chat(messages, options);

    if (response.usage) {
      const reportedCost = response.usage.costUsd;
      const estimated = reportedCost === undefined;
      const cost = estimated
        ? estimateCostUsd(this.provider, this.model, response.usage.inputTokens, response.usage.outputTokens)
        : reportedCost;
      this.budgetState.spentUsd += cost;
      this.onUsage?.({
        provider: this.provider,
        model: this.model,
        inputTokens: response.usage.inputTokens,
        outputTokens: response.usage.outputTokens,
        costUsd: cost,
        estimated,
        timestamp: new Date().toISOString(),
      });
    }

    if (this.budgetState.spentUsd > this.budgetUsd) {
      throw new BudgetExceededError(this.budgetState.spentUsd, this.budgetUsd);
    }

    return response;
  }
}
