import { z, type ZodError } from "zod";
import type { LLMAdapter, LLMMessage } from "./adapter.js";
import { parseJsonResponse } from "./parse-json.js";

export interface RepairPolicy {
  enumAliases?: Record<string, Record<string, string>>;
  numberFields?: string[];
  maxRepairPasses?: number;
}

export interface GenerateValidatedOptions<T> {
  llm: LLMAdapter;
  stage: string;
  schema: z.ZodType<T, z.ZodTypeDef, unknown>;
  messages: LLMMessage[];
  temperature?: number;
  maxTokens?: number;
  repairPolicy?: RepairPolicy;
  /** Stage-specific normalizer applied after parseJsonResponse and before schema validation. */
  normalize?: (data: unknown) => unknown;
}

const REPAIR_SYSTEM_PROMPT = `You repair machine-generated JSON.

Your job:
- Fix ONLY the reported validation errors
- Preserve existing structure, IDs, names, and intent
- Make the smallest possible edits
- Return ONLY valid JSON, no markdown, no explanation

Rules:
- If a field has the wrong type, coerce it (e.g. array [100] → number 100)
- If an enum value is invalid, map it to the closest allowed value
- If a required field is missing, add the simplest valid value
- Do not invent new content beyond what's needed to fix errors`;

export async function generateValidated<T>(
  opts: GenerateValidatedOptions<T>,
): Promise<T> {
  const { llm, stage, schema, messages, repairPolicy } = opts;
  const maxPasses = repairPolicy?.maxRepairPasses ?? 3;

  const response = await llm.chat(messages, {
    temperature: opts.temperature ?? 0.2,
    maxTokens: opts.maxTokens,
    jsonMode: true,
  });

  let candidate = parseJsonResponse(response.content, stage);
  candidate = applyNormalizers(candidate, repairPolicy);
  if (opts.normalize) candidate = opts.normalize(candidate);

  let parseResult = schema.safeParse(candidate);
  if (parseResult.success) return parseResult.data;

  // Repair loop
  for (let pass = 1; pass <= maxPasses; pass++) {
    const issues = formatZodIssues(parseResult.error);
    const repairMessages: LLMMessage[] = [
      { role: "system", content: REPAIR_SYSTEM_PROMPT },
      {
        role: "user",
        content: `Stage: ${stage}\n\nCurrent JSON:\n${JSON.stringify(candidate, null, 2)}\n\nValidation errors:\n${issues}\n\nReturn ONLY the corrected JSON.`,
      },
    ];

    const repairResponse = await llm.chat(repairMessages, {
      temperature: 0.1,
      maxTokens: opts.maxTokens,
      jsonMode: true,
    });

    candidate = parseJsonResponse(repairResponse.content, `${stage}:Repair`);
    candidate = applyNormalizers(candidate, repairPolicy);
    if (opts.normalize) candidate = opts.normalize(candidate);

    parseResult = schema.safeParse(candidate);
    if (parseResult.success) return parseResult.data;
  }

  // All repair passes exhausted — throw a stage-tagged error with the latest issues.
  const issues = formatZodIssues(parseResult.error);
  throw new Error(
    `${stage} failed after ${maxPasses} repair passes. Validation errors:\n${issues}`,
    { cause: parseResult.error },
  );
}

function formatZodIssues(error: ZodError): string {
  const lines: string[] = [];
  for (const issue of error.issues) {
    formatIssue(issue, [], lines);
  }
  return lines.join("\n");
}

function formatIssue(
  issue: z.ZodIssue,
  parentPath: (string | number)[],
  out: string[],
): void {
  const fullPath = [...parentPath, ...issue.path];
  const pathStr = fullPath.join(".");

  // Expand union errors so the repair LLM can see why each branch failed
  if (issue.code === "invalid_union" && Array.isArray((issue as z.ZodInvalidUnionIssue).unionErrors)) {
    out.push(`- $.${pathStr}: invalid_union (no branch matched)`);
    const branches = (issue as z.ZodInvalidUnionIssue).unionErrors;
    branches.forEach((branchError, idx) => {
      out.push(`  branch[${idx}]:`);
      for (const sub of branchError.issues) {
        const subLines: string[] = [];
        formatIssue(sub, fullPath, subLines);
        for (const line of subLines) out.push(`    ${line}`);
      }
    });
    return;
  }

  out.push(`- $.${pathStr}: ${issue.message}`);
}

export function applyNormalizers(
  data: unknown,
  policy?: RepairPolicy,
): unknown {
  if (data === null || data === undefined) return data;
  if (typeof data !== "object") return data;

  if (Array.isArray(data)) {
    return data.map((item) => applyNormalizers(item, policy));
  }

  const obj = { ...(data as Record<string, unknown>) };

  for (const key of Object.keys(obj)) {
    // Coerce numeric strings to numbers
    if (typeof obj[key] === "string" && isNumericField(key, policy)) {
      const num = Number(obj[key]);
      if (!isNaN(num)) obj[key] = num;
    }

    // Coerce arrays to numbers for known number fields
    if (Array.isArray(obj[key]) && isNumericField(key, policy)) {
      const arr = obj[key] as unknown[];
      if (arr.length > 0) {
        const num = Number(arr[0]);
        obj[key] = isNaN(num) ? 0 : num;
      } else {
        obj[key] = 0;
      }
    }

    // Coerce boolean strings
    if (obj[key] === "true") obj[key] = true;
    if (obj[key] === "false") obj[key] = false;

    // Apply enum aliases
    if (typeof obj[key] === "string" && policy?.enumAliases) {
      for (const [fieldPattern, aliasMap] of Object.entries(policy.enumAliases)) {
        const fieldName = fieldPattern.replace(/.*\.\*\./, "").replace(/.*\./, "");
        if (key === fieldName) {
          const mapped = aliasMap[obj[key] as string];
          if (mapped) obj[key] = mapped;
        }
      }
    }

    // Recurse into nested objects/arrays
    if (typeof obj[key] === "object" && obj[key] !== null) {
      obj[key] = applyNormalizers(obj[key], policy);
    }
  }

  return obj;
}

const KNOWN_NUMBER_FIELDS = new Set([
  "cost", "baseRate", "weight", "tier", "x", "y", "z", "w", "h",
  "elevation", "pitch", "yaw", "roll", "width", "depth", "height",
  "sessionLengthMin", "playerCount", "cap",
  "timeToFirstUpgradeSec", "timeToAutomationMin", "timeToPrestigeMin",
]);

function isNumericField(key: string, policy?: RepairPolicy): boolean {
  if (KNOWN_NUMBER_FIELDS.has(key)) return true;
  if (policy?.numberFields) {
    return policy.numberFields.some((pattern) => {
      const fieldName = pattern.replace(/.*\.\*\./, "").replace(/.*\./, "");
      return key === fieldName;
    });
  }
  return false;
}
