import type { LLMAdapter, LLMMessage, LLMResponse } from "./adapter.js";

export interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  timeoutMs?: number;
}

const DEFAULTS: Required<RetryOptions> = {
  maxRetries: 3,
  baseDelayMs: 1000,
  timeoutMs: 120_000,
};

const RETRYABLE_PATTERNS = [
  /rate.?limit/i,
  /429/,
  /503/,
  /502/,
  /500/,
  /timeout/i,
  /ECONNRESET/,
  /ECONNREFUSED/,
  /ETIMEDOUT/,
  /overloaded/i,
];

function isRetryable(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return RETRYABLE_PATTERNS.some((p) => p.test(msg));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`LLM call timed out after ${timeoutMs}ms`)),
      timeoutMs,
    );
  });

  return Promise.race([promise, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

export class RetryAdapter implements LLMAdapter {
  private opts: Required<RetryOptions>;

  constructor(
    private inner: LLMAdapter,
    options?: RetryOptions,
  ) {
    this.opts = { ...DEFAULTS, ...options };
  }

  async chat(
    messages: LLMMessage[],
    options?: { temperature?: number; maxTokens?: number; jsonMode?: boolean },
  ): Promise<LLMResponse> {
    let lastError: unknown;

    for (let attempt = 0; attempt <= this.opts.maxRetries; attempt++) {
      try {
        const result = await withTimeout(
          this.inner.chat(messages, options),
          this.opts.timeoutMs,
        );
        return result;
      } catch (err) {
        lastError = err;
        if (attempt < this.opts.maxRetries && isRetryable(err)) {
          const delay = this.opts.baseDelayMs * Math.pow(2, attempt);
          await sleep(delay);
          continue;
        }
        throw err;
      }
    }

    throw lastError;
  }
}
