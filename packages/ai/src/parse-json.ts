/**
 * Robust JSON extractor for LLM responses.
 * Handles: raw JSON, markdown code blocks, JSON embedded in text,
 * and Gemini's thinking-block prefixes.
 */
export function parseJsonResponse(raw: string, agentName: string): unknown {
  const trimmed = raw.trim();

  // 1. Direct parse
  try {
    return JSON.parse(trimmed);
  } catch {
    // continue
  }

  // 2. Markdown code block
  const codeBlock = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlock) {
    try {
      return JSON.parse(codeBlock[1].trim());
    } catch {
      // continue
    }
  }

  // 3. Find first { or [ and match to last } or ]
  const firstBrace = trimmed.indexOf("{");
  const firstBracket = trimmed.indexOf("[");
  let start = -1;
  let endChar = "";

  if (firstBrace >= 0 && (firstBracket < 0 || firstBrace < firstBracket)) {
    start = firstBrace;
    endChar = "}";
  } else if (firstBracket >= 0) {
    start = firstBracket;
    endChar = "]";
  }

  if (start >= 0) {
    const lastEnd = trimmed.lastIndexOf(endChar);
    if (lastEnd > start) {
      try {
        return JSON.parse(trimmed.slice(start, lastEnd + 1));
      } catch {
        // continue
      }
    }
  }

  throw new Error(`Failed to parse ${agentName} response as JSON: ${trimmed.slice(0, 200)}`);
}
