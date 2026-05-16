import { KnowledgeStore } from "./knowledge-store.js";

type SeedEntry = Parameters<KnowledgeStore["add"]>[0];

const DEFAULT_ENTRIES: SeedEntry[] = [
  {
    id: "verse_failable_pattern",
    type: "verse_pattern",
    title: "Verse Failable Pattern",
    content: "In Verse, map access and player lookups are failable. Use: if (Value := MyMap[Key]): to safely unwrap. Player lookup: if (Player := player[Agent]):",
    tags: ["verse", "failable", "pattern"],
  },
  {
    id: "verse_onbegin",
    type: "verse_pattern",
    title: "Verse OnBegin Entry Point",
    content: "OnBegin<override>()<suspends>:void is the entry point for creative_device classes. Use it to subscribe to device events and initialize game state.",
    tags: ["verse", "onbegin", "entry"],
  },
  {
    id: "verse_editable",
    type: "verse_pattern",
    title: "Verse @editable Fields",
    content: "@editable fields expose device references in the UEFN editor. Declare as: @editable MyDevice : trigger_device = trigger_device{}. Always provide a default empty constructor.",
    tags: ["verse", "editable", "device"],
  },
  {
    id: "device_trigger",
    type: "device_schema",
    title: "Trigger Device",
    content: "trigger_device: Fires events when players enter/exit a volume. Events: TriggeredEvent, AgentEntersEvent, AgentExitsEvent. Common in tycoon resource areas and adventure quest zones.",
    tags: ["device", "trigger", "tycoon", "adventure"],
  },
  {
    id: "device_creature_spawner",
    type: "device_schema",
    title: "Creature Spawner",
    content: "creature_spawner_device: Spawns AI creatures. Configure spawn count, respawn delay, patrol area. Used in adventure combat zones and boss areas.",
    tags: ["device", "spawner", "adventure", "combat"],
  },
  {
    id: "economy_tycoon_template",
    type: "economy_template",
    title: "Tycoon Economy Template",
    content: "Standard tycoon economy: 1 primary currency, 3-5 generators (manual → automated), upgrade sinks at increasing costs (100, 500, 2000, 10000), prestige sink at session-length cost. Target: first purchase <90s, automation 5-8min, prestige 15-25min.",
    tags: ["economy", "tycoon", "template"],
    genre: "tycoon",
  },
  {
    id: "economy_arena_template",
    type: "economy_template",
    title: "Arena Economy Template",
    content: "Arena economy: score-based currency (non-persistent), kill/elimination generators (100-250 per kill), round win bonuses, loadout purchase sinks. No prestige. Session: 3-5 rounds of 2-3 minutes each.",
    tags: ["economy", "arena", "template"],
    genre: "battle_arena",
  },
  {
    id: "economy_adventure_template",
    type: "economy_template",
    title: "Adventure Economy Template",
    content: "Adventure economy: gold currency from enemy drops and quest rewards, XP from kills and exploration. Sinks: gear upgrades, consumables, checkpoint unlocks. Boss loot as milestone rewards. Session: 20-45 minutes.",
    tags: ["economy", "adventure", "template"],
    genre: "adventure",
  },

  // ── UEFN cheat-sheet entries (added in Day 16 follow-up) ──
  // These exist to suppress common 7B-coder hallucinations: invented Player.X
  // members, made-up global "System" objects, wrong device event names,
  // Subscribe handlers that are not declared, and unbound `Agent` use.
  {
    id: "verse_subscribe_handler_must_be_method",
    type: "verse_pattern",
    title: "Subscribe handlers must be declared methods of the same class",
    content:
      "Every identifier passed to `.Subscribe(X)` MUST be a method declared on the same class. Do NOT pass arbitrary names like `Handler` or `Callback`. The handler signature must match the event payload, e.g. `OnTriggered(Agent:agent):void` for `TriggeredEvent`. Example:\n\n  @editable Trigger : trigger_device = trigger_device{}\n  OnBegin<override>()<suspends>:void =\n      Trigger.TriggeredEvent.Subscribe(OnTriggered)\n  OnTriggered(Agent:agent):void =\n      if (Player := player[Agent]):\n          Print(\"triggered\")",
    tags: ["verse", "pattern", "subscribe", "handler"],
  },
  {
    id: "verse_agent_parameter_required",
    type: "verse_pattern",
    title: "`Agent` must come from a method parameter, never out of nowhere",
    content:
      "Verse has no implicit `Agent` in scope. To use `player[Agent]` you must receive `Agent:agent` as a parameter — typically from a Subscribe handler. NEVER write `if (Player := player[Agent])` inside `OnBegin` (which has no Agent param). Move that logic into a handler method like `OnEliminated(Agent:agent)` or `OnTriggered(Agent:agent)`.",
    tags: ["verse", "pattern", "failable", "agent"],
  },
  {
    id: "verse_no_invented_player_members",
    type: "verse_pattern",
    title: "Do NOT invent fields on `player` like Player.Currency or Player.Score",
    content:
      "The Verse `player` type has NO game-specific fields. Things like `Player.Currency`, `Player.Score`, `Player.PrestigeLevel`, `Player.ApplyReward(...)` do NOT exist and will not compile. Store per-player state in a class-level `var` map keyed by `agent`:\n\n  var ScoresByAgent : [agent]int = map{}\n  Award(Agent:agent, Amount:int):void =\n      if (Current := ScoresByAgent[Agent]):\n          set ScoresByAgent[Agent] = Current + Amount\n      else:\n          set ScoresByAgent[Agent] = Amount",
    tags: ["verse", "pattern", "player", "state"],
  },
  {
    id: "verse_no_global_system_objects",
    type: "verse_pattern",
    title: "There is no global `PrestigeSystem`, `EconomyManager`, or auto-imported singleton",
    content:
      "Do NOT call methods on identifiers that were never declared, e.g. `PrestigeSystem.Initialize()`, `Economy.AddCurrency(...)`. Every dependency must be either (a) an `@editable` device field on the class, (b) a method on the class itself, or (c) imported from a real module like `/Fortnite.com/Devices`. If a module needs another module, surface it via an @editable reference and wire it in UEFN.",
    tags: ["verse", "pattern", "imports"],
  },
  {
    id: "verse_real_device_events_cheatsheet",
    type: "verse_pattern",
    title: "Real UEFN device event names (cheat-sheet)",
    content:
      "Use ONLY these real event names on the matching device types — do not invent new ones:\n\n  trigger_device          → TriggeredEvent(:agent)\n  button_device           → InteractedWithEvent(:agent)\n  item_spawner_device     → ItemPickedUpEvent(:agent), SpawnedItemEvent(:?agent)\n  player_spawner_device   → SpawnedEvent(:agent)\n  elimination_manager_device → EliminatedEvent(payload)\n  player_counter_device   → CountSucceedsEvent(:agent), CountedEvent(:agent)\n  timer_device            → SuccessEvent(:?agent), FailureEvent(:?agent)\n  conditional_button_device → ActivatedEvent(:agent)\n\nIf you need an event that's not on this list, prefer using a `trigger_device` and Subscribe to its `TriggeredEvent` rather than inventing one.",
    tags: ["verse", "pattern", "device", "events"],
  },
  {
    id: "verse_set_for_compound_assign",
    type: "verse_pattern",
    title: "Use `set` before compound assignment on `var` fields",
    content:
      "Mutable fields declared with `var` require `set` before compound operators. WRONG: `Counter += 1`. RIGHT: `set Counter += 1` or `set Counter = Counter + 1`. The same applies to `-=`, `*=`, `/=`, and to map updates: `set ScoresByAgent[Agent] = NewValue`.",
    tags: ["verse", "pattern", "var", "set"],
  },
  {
    id: "verse_class_skeleton_with_handler",
    type: "verse_pattern",
    title: "Canonical creative_device skeleton with one event handler",
    content:
      "Use this exact shape for a single-responsibility creative_device:\n\n  using { /Fortnite.com/Devices }\n  using { /Verse.org/Simulation }\n\n  my_thing := class(creative_device):\n      @editable\n      Trigger : trigger_device = trigger_device{}\n\n      var CountByAgent : [agent]int = map{}\n\n      OnBegin<override>()<suspends>:void =\n          Trigger.TriggeredEvent.Subscribe(OnTriggered)\n\n      OnTriggered(Agent:agent):void =\n          if (Player := player[Agent]):\n              if (Existing := CountByAgent[Agent]):\n                  set CountByAgent[Agent] = Existing + 1\n              else:\n                  set CountByAgent[Agent] = 1",
    tags: ["verse", "pattern", "editable", "failable", "skeleton"],
  },
];

export function seedDefaultKnowledge(store: KnowledgeStore): void {
  for (const entry of DEFAULT_ENTRIES) {
    if (!store.get(entry.id)) {
      store.add(entry);
    }
  }
}
