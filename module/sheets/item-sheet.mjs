const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ItemSheetV2 } = foundry.applications.sheets;

export class BeaconItemSheet extends HandlebarsApplicationMixin(ItemSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ["beacon", "sheet", "item"],
    position: { width: 600, height: 640 },
    window: { resizable: true },
    form: { submitOnChange: true }
  };

  static PARTS = {
    sheet: { template: "systems/beacon/templates/item/item-sheet.hbs", scrollable: [".item-body"] }
  };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const item = this.document;
    const enrich = html => foundry.applications.ux.TextEditor.implementation.enrichHTML(html ?? "", { relativeTo: item, secrets: item.isOwner });
    context.item = item;
    context.system = item.system;
    context.config = CONFIG.BEACON;
    context.editable = this.isEditable;
    context.bodyPartial = `systems/beacon/templates/item/${item.type}.hbs`;
    context.onActor = !!item.actor;
    context.isNPCItem = item.actor?.type === "npc";
    context.enriched = { description: await enrich(item.system.description) };
    if (item.type === "job") {
      context.enriched.traits = await enrich(item.system.traits);
      context.enriched.limitBreak = await enrich(item.system.limitBreak.description);
    }
    if (item.type === "ancestry") context.enriched.traits = await enrich(item.system.traits);
    if (item.type === "class") context.enriched.abilities = await enrich(item.system.abilities);
    if (item.type === "talent") {
      context.talentRanks = [];
      for (const r of [1, 2, 3]) {
        context.talentRanks.push({
          rank: r,
          name: item.system[`rank${r}`].name,
          path: `system.rank${r}`,
          raw: item.system[`rank${r}`].description,
          enriched: await enrich(item.system[`rank${r}`].description)
        });
      }
    }
    context.rankOptions = { 1: "1", 2: "2", 3: "3" };
    context.classRankOptions = { 0: "0", 1: "1", 2: "2", 3: "3" };
    return context;
  }
}
