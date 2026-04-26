export function withKnowledgeContext(systemPrompt: string, context: string): string {
  if (!context.trim()) return systemPrompt;
  return `${systemPrompt}\n\nRelevant ForgeAI knowledge:\n${context}`;
}
