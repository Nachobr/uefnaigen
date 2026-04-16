import type { TemplateDefinition } from "@forgeai/schemas";
import type { NormalizedBrief } from "./intent-extractor.js";

export interface TemplateRouterResult {
  templateId: string;
  resolvedTemplate: TemplateDefinition;
}

export interface TemplateSource {
  list(): TemplateDefinition[];
  resolve(id: string): TemplateDefinition;
}

/**
 * Template Router (pipeline stage 2).
 * Deterministic — picks the best template from the registry based on the brief.
 * No LLM needed for v1 since genre→template mapping is straightforward.
 */
export class TemplateRouter {
  constructor(private registry: TemplateSource) {}

  route(brief: NormalizedBrief, templateOverride?: string): TemplateRouterResult {
    if (templateOverride) {
      const resolved = this.registry.resolve(templateOverride);
      return { templateId: templateOverride, resolvedTemplate: resolved };
    }

    // Find best match: prefer subGenre-specific, fall back to genre/base
    const all = this.registry.list();

    // Try exact subGenre match first (e.g. tycoon/lumber-mill)
    if (brief.subGenre) {
      const subId = `${brief.genre}/${brief.subGenre}`;
      const match = all.find((t) => t.templateId === subId);
      if (match) {
        const resolved = this.registry.resolve(subId);
        return { templateId: subId, resolvedTemplate: resolved };
      }
    }

    // Try keyword matching against template summaries
    const genreTemplates = all.filter((t) => t.genre === brief.genre);
    if (genreTemplates.length > 1) {
      const keywords = [
        ...brief.coreLoop,
        ...brief.keyFeatures,
        brief.fantasy,
      ].join(" ").toLowerCase();

      let bestMatch: TemplateDefinition | null = null;
      let bestScore = 0;
      for (const t of genreTemplates) {
        if (t.templateId === `${brief.genre}/base`) continue;
        const summary = t.summary.toLowerCase();
        let score = 0;
        for (const word of keywords.split(/\s+/)) {
          if (word.length > 3 && summary.includes(word)) score++;
        }
        if (score > bestScore) {
          bestScore = score;
          bestMatch = t;
        }
      }
      if (bestMatch && bestScore > 0) {
        const resolved = this.registry.resolve(bestMatch.templateId);
        return { templateId: bestMatch.templateId, resolvedTemplate: resolved };
      }
    }

    // Fall back to genre/base
    const baseId = `${brief.genre}/base`;
    const resolved = this.registry.resolve(baseId);
    return { templateId: baseId, resolvedTemplate: resolved };
  }
}
