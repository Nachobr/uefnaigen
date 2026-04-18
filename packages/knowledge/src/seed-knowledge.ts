import { KnowledgeStore } from "./knowledge-store.js";

export function seedDefaultKnowledge(store: KnowledgeStore): void {
  if (store.size > 0) return;

  store.add({
    id: "verse_failable_pattern",
    type: "verse_pattern",
    title: "Verse Failable Pattern",
    content: "In Verse, map access and player lookups are failable. Use: if (Value := MyMap[Key]): to safely unwrap. Player lookup: if (Player := player[Agent]):",
    tags: ["verse", "failable", "pattern"],
  });

  store.add({
    id: "verse_onbegin",
    type: "verse_pattern",
    title: "Verse OnBegin Entry Point",
    content: "OnBegin<override>()<suspends>:void is the entry point for creative_device classes. Use it to subscribe to device events and initialize game state.",
    tags: ["verse", "onbegin", "entry"],
  });

  store.add({
    id: "verse_editable",
    type: "verse_pattern",
    title: "Verse @editable Fields",
    content: "@editable fields expose device references in the UEFN editor. Declare as: @editable MyDevice : trigger_device = trigger_device{}. Always provide a default empty constructor.",
    tags: ["verse", "editable", "device"],
  });

  store.add({
    id: "device_trigger",
    type: "device_schema",
    title: "Trigger Device",
    content: "trigger_device: Fires events when players enter/exit a volume. Events: TriggeredEvent, AgentEntersEvent, AgentExitsEvent. Common in tycoon resource areas and adventure quest zones.",
    tags: ["device", "trigger", "tycoon", "adventure"],
  });

  store.add({
    id: "device_creature_spawner",
    type: "device_schema",
    title: "Creature Spawner",
    content: "creature_spawner_device: Spawns AI creatures. Configure spawn count, respawn delay, patrol area. Used in adventure combat zones and boss areas.",
    tags: ["device", "spawner", "adventure", "combat"],
  });

  store.add({
    id: "economy_tycoon_template",
    type: "economy_template",
    title: "Tycoon Economy Template",
    content: "Standard tycoon economy: 1 primary currency, 3-5 generators (manual → automated), upgrade sinks at increasing costs (100, 500, 2000, 10000), prestige sink at session-length cost. Target: first purchase <90s, automation 5-8min, prestige 15-25min.",
    tags: ["economy", "tycoon", "template"],
    genre: "tycoon",
  });

  store.add({
    id: "economy_arena_template",
    type: "economy_template",
    title: "Arena Economy Template",
    content: "Arena economy: score-based currency (non-persistent), kill/elimination generators (100-250 per kill), round win bonuses, loadout purchase sinks. No prestige. Session: 3-5 rounds of 2-3 minutes each.",
    tags: ["economy", "arena", "template"],
    genre: "battle_arena",
  });

  store.add({
    id: "economy_adventure_template",
    type: "economy_template",
    title: "Adventure Economy Template",
    content: "Adventure economy: gold currency from enemy drops and quest rewards, XP from kills and exploration. Sinks: gear upgrades, consumables, checkpoint unlocks. Boss loot as milestone rewards. Session: 20-45 minutes.",
    tags: ["economy", "adventure", "template"],
    genre: "adventure",
  });
}
