import type { TemplateDefinition } from "@forgeai/schemas";

export class TemplateRegistry {
  private templates = new Map<string, TemplateDefinition>();

  register(template: TemplateDefinition): void {
    this.templates.set(template.templateId, template);
  }

  get(id: string): TemplateDefinition | undefined {
    return this.templates.get(id);
  }

  list(): TemplateDefinition[] {
    return Array.from(this.templates.values());
  }

  resolve(id: string): TemplateDefinition {
    const template = this.templates.get(id);
    if (!template) throw new Error(`Template not found: ${id}`);
    if (!template.extends) return template;

    const base = this.resolve(template.extends);
    return this.merge(base, template);
  }

  private merge(base: TemplateDefinition, child: TemplateDefinition): TemplateDefinition {
    return {
      ...base,
      ...child,
      layoutRules: { ...base.layoutRules, ...child.layoutRules },
      systemModules: {
        required: [...new Set([...base.systemModules.required, ...child.systemModules.required])],
        optional: [...new Set([...base.systemModules.optional, ...child.systemModules.optional])],
      },
      devicePolicies: {
        allowedDeviceTypes: [...new Set([...base.devicePolicies.allowedDeviceTypes, ...child.devicePolicies.allowedDeviceTypes])],
        requiredDeviceTypes: [...new Set([...base.devicePolicies.requiredDeviceTypes, ...child.devicePolicies.requiredDeviceTypes])],
      },
      verseModules: {
        required: [...new Set([...base.verseModules.required, ...child.verseModules.required])],
        optional: [...new Set([...base.verseModules.optional, ...child.verseModules.optional])],
      },
      prefabTags: [...new Set([...base.prefabTags, ...child.prefabTags])],
      validationProfiles: [...new Set([...base.validationProfiles, ...child.validationProfiles])],
    };
  }
}
