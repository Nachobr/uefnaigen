export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMResponse {
  content: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
    costUsd?: number;
  };
}

export interface LLMAdapter {
  chat(messages: LLMMessage[], options?: {
    temperature?: number;
    maxTokens?: number;
    jsonMode?: boolean;
  }): Promise<LLMResponse>;
}
