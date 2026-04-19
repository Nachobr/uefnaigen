import { TemplateRegistry } from "./registry.js";
import { tycoonBase, tycoonLumberMill, tycoonMiningEmpire, battleArenaBase, adventureBase, roleplayBase } from "./builtin/index.js";

export function createDefaultRegistry(): TemplateRegistry {
  const registry = new TemplateRegistry();
  registry.register(tycoonBase);
  registry.register(tycoonLumberMill);
  registry.register(tycoonMiningEmpire);
  registry.register(battleArenaBase);
  registry.register(adventureBase);
  registry.register(roleplayBase);
  return registry;
}
