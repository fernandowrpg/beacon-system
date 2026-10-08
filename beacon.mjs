import { BEACON } from "./module/config.mjs";
import { BeaconCharacterData, BeaconNPCData } from "./module/data/actors.mjs";
import { AbilityData, JobData, ClassData, TalentData, AncestryData, SupplyData, TemplateData } from "./module/data/items.mjs";
import { BeaconActor } from "./module/documents/actor.mjs";
import { BeaconItem } from "./module/documents/item.mjs";
import { BeaconCombat, onRenderCombatTracker } from "./module/documents/combat.mjs";
import { BeaconCharacterSheet, BeaconNPCSheet } from "./module/sheets/actor-sheet.mjs";
import { BeaconItemSheet } from "./module/sheets/item-sheet.mjs";
import { onRenderChatMessage } from "./module/chat.mjs";
import { BeaconTokenRuler } from "./module/canvas/token-ruler.mjs";
import { onHoverToken } from "./module/canvas/distance.mjs";
import * as distance from "./module/canvas/distance.mjs";
import { openImporter, importBeaconData, addImportButton } from "./module/importer.mjs";
import * as rolls from "./module/rolls.mjs";
import { BeaconCreator, openCreator } from "./module/apps/creator.mjs";

Hooks.once("init", () => {
  CONFIG.BEACON = BEACON;
  game.beacon = { rolls, distance, openCreator, BeaconCreator, openImporter, importBeaconData };

  CONFIG.Actor.documentClass = BeaconActor;
  CONFIG.Item.documentClass = BeaconItem;
  CONFIG.Combat.documentClass = BeaconCombat;

  CONFIG.Actor.dataModels.beacon = BeaconCharacterData;
  CONFIG.Actor.dataModels.npc = BeaconNPCData;
  Object.assign(CONFIG.Item.dataModels, {
    ability: AbilityData,
    job: JobData,
    class: ClassData,
    talent: TalentData,
    ancestry: AncestryData,
    supply: SupplyData,
    template: TemplateData
  });

  CONFIG.Actor.trackableAttributes = {
    beacon: { bar: ["hp", "stress", "mp", "recoveries"], value: ["focus", "tempHp", "discord", "surge"] },
    npc: { bar: ["hp", "stress", "mp"], value: ["focus", "tempHp", "discord"] }
  };

  CONFIG.Combat.initiative = { formula: "0", decimals: 0 };
  CONFIG.Token.rulerClass = BeaconTokenRuler;

  CONFIG.statusEffects = [
    { id: "dead", name: "BEACON.Condition.defeated", img: "icons/svg/skull.svg" },
    ...BEACON.conditions.map(c => ({ id: c.id, name: `BEACON.Condition.${c.id}`, img: c.img })),
    ...BEACON.statuses.map(s => ({ id: s.id, name: `BEACON.Condition.${s.id}`, img: s.img }))
  ];
  CONFIG.specialStatusEffects.DEFEATED = "dead";
  CONFIG.specialStatusEffects.INVISIBLE = "invisible";

  const { DocumentSheetConfig } = foundry.applications.apps;
  DocumentSheetConfig.registerSheet(Actor, "beacon", BeaconCharacterSheet, { types: ["beacon"], makeDefault: true, label: "BEACON.Sheet.beacon" });
  DocumentSheetConfig.registerSheet(Actor, "beacon", BeaconNPCSheet, { types: ["npc"], makeDefault: true, label: "BEACON.Sheet.npc" });
  DocumentSheetConfig.registerSheet(Item, "beacon", BeaconItemSheet, { makeDefault: true, label: "BEACON.Sheet.item" });

  game.settings.register("beacon", "resetPhases", {
    name: "BEACON.Settings.resetPhases",
    hint: "BEACON.Settings.resetPhasesHint",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.register("beacon", "rulerSpeedColors", {
    name: "BEACON.Settings.rulerSpeedColors",
    hint: "BEACON.Settings.rulerSpeedColorsHint",
    scope: "client",
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.register("beacon", "rangeLabel", {
    name: "BEACON.Settings.rangeLabel",
    hint: "BEACON.Settings.rangeLabelHint",
    scope: "client",
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.register("beacon", "gridDiagonals", {
    name: "BEACON.Settings.gridDiagonals",
    hint: "BEACON.Settings.gridDiagonalsHint",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
    onChange: value => value && applyBeaconDiagonals()
  });

  foundry.applications.handlebars.loadTemplates([
    "systems/beacon/templates/actor/partials/ability-row.hbs",
    "systems/beacon/templates/actor/partials/status-bar.hbs",
    "systems/beacon/templates/item/ability.hbs",
    "systems/beacon/templates/item/job.hbs",
    "systems/beacon/templates/item/class.hbs",
    "systems/beacon/templates/item/talent.hbs",
    "systems/beacon/templates/item/ancestry.hbs",
    "systems/beacon/templates/item/supply.hbs",
    "systems/beacon/templates/item/template.hbs"
  ]);

  Handlebars.registerHelper("beaconSigned", n => (Number(n) >= 0 ? `+${Number(n)}` : `${n}`));
  Handlebars.registerHelper("beaconPct", (value, max) => (max > 0 ? Math.clamp(Math.round((value / max) * 100), 0, 100) : 0));
  Handlebars.registerHelper("beaconLte", (a, b) => Number(a) <= Number(b));
  Handlebars.registerHelper("beaconRange", (from, to) => {
    const out = [];
    for (let i = Number(from); i <= Number(to); i++) out.push(i);
    return out;
  });
});

Hooks.once("ready", () => {
  if (game.settings.get("beacon", "gridDiagonals")) applyBeaconDiagonals();
});

async function applyBeaconDiagonals() {
  if (!game.user.isGM) return;
  const equidistant = CONST.GRID_DIAGONALS.EQUIDISTANT;
  if (game.settings.get("core", "gridDiagonals") !== equidistant) {
    await game.settings.set("core", "gridDiagonals", equidistant);
  }
}

Hooks.on("renderChatMessageHTML", onRenderChatMessage);
Hooks.on("hoverToken", onHoverToken);
Hooks.on("renderCombatTracker", onRenderCombatTracker);
Hooks.on("renderItemDirectory", addImportButton);
Hooks.on("renderActorDirectory", addImportButton);

Hooks.on("hotbarDrop", (bar, data, slot) => {
  if (data.type !== "Item" || !data.uuid) return;
  createItemMacro(data.uuid, slot);
  return false;
});

async function createItemMacro(uuid, slot) {
  const item = await fromUuid(uuid);
  if (!item?.actor) return ui.notifications.warn(game.i18n.localize("BEACON.Warn.macroOwned"));
  const command = `const item = await fromUuid("${uuid}");\nif (item) item.use({ skipDialog: event?.shiftKey });`;
  let macro = game.macros.find(m => m.name === item.name && m.command === command);
  macro ??= await Macro.create({ name: item.name, type: "script", img: item.img, command, flags: { "beacon.itemMacro": true } });
  return game.user.assignHotbarMacro(macro, slot);
}
