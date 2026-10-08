import { tiered } from "../config.mjs";
import { rollAbilityCheck, rollSkillCheck, rollD20 } from "../rolls.mjs";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;
const TextEditor = () => foundry.applications.ux.TextEditor.implementation;
const t = k => game.i18n.localize(k);

const CATEGORY_ORDER = ["weapon", "support", "spell", "skill", "trait", "limitbreak"];

export class BeaconActorSheet extends HandlebarsApplicationMixin(ActorSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ["beacon", "sheet", "actor"],
    position: { width: 780, height: 820 },
    window: { resizable: true },
    form: { submitOnChange: true },
    actions: {
      rollAbility: BeaconActorSheet.#onRollAbility,
      rollSave: BeaconActorSheet.#onRollSave,
      rollFlat: BeaconActorSheet.#onRollFlat,
      useItem: BeaconActorSheet.#onUseItem,
      chatItem: BeaconActorSheet.#onChatItem,
      editItem: BeaconActorSheet.#onEditItem,
      deleteItem: BeaconActorSheet.#onDeleteItem,
      createItem: BeaconActorSheet.#onCreateItem,
      toggleItem: BeaconActorSheet.#onToggleItem,
      skillAdd: BeaconActorSheet.#onSkillAdd,
      skillDelete: BeaconActorSheet.#onSkillDelete,
      skillRoll: BeaconActorSheet.#onSkillRoll,
      shortRest: BeaconActorSheet.#onShortRest,
      longRest: BeaconActorSheet.#onLongRest,
      surge: BeaconActorSheet.#onSurge,
      defend: BeaconActorSheet.#onDefend,
      refresh: BeaconActorSheet.#onRefresh,
      recovery: BeaconActorSheet.#onRecovery,
      discord: BeaconActorSheet.#onDiscord,
      limitBreak: BeaconActorSheet.#onLimitBreak,
      recharge: BeaconActorSheet.#onRecharge,
      toggleStatus: BeaconActorSheet.#onToggleStatus,
      harmRoll: BeaconActorSheet.#onHarmRoll
    }
  };

  get title() {
    return this.document.name;
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const actor = this.document;
    const system = actor.system;
    context.actor = actor;
    context.system = system;
    context.source = actor.system._source;
    context.config = CONFIG.BEACON;
    context.editable = this.isEditable;
    context.owner = actor.isOwner;
    context.isGM = game.user.isGM;
    context.tabs = this.constructor.TABS?.primary ? this._prepareTabs("primary") : {};

    const abilities = actor.items.filter(i => i.type === "ability").sort((a, b) => (a.sort || 0) - (b.sort || 0));
    context.categories = CATEGORY_ORDER.map(cat => ({
      key: cat,
      label: t(CONFIG.BEACON.abilityCategories[cat]),
      items: abilities.filter(i => i.system.category === cat).map(i => this._abilityView(i))
    }));
    context.equippedCategories = context.categories.map(c => ({ ...c, items: c.items.filter(i => i.system.equipped || i.system.category === "trait" || c.key === "limitbreak") }));
    context.jobs = actor.items.filter(i => i.type === "job");
    context.classes = actor.items.filter(i => i.type === "class");
    context.talents = actor.items.filter(i => i.type === "talent").map(i => this._talentView(i));
    context.ancestry = actor.items.find(i => i.type === "ancestry") ?? null;
    context.supplies = actor.items.filter(i => i.type === "supply");
    context.templates = actor.items.filter(i => i.type === "template");

    context.scoreList = Object.entries(CONFIG.BEACON.abilityScores).map(([key, label]) => ({
      key, label: t(label), value: system.abilities[key], source: actor.system._source.abilities?.[key]
    }));

    const statusList = [...CONFIG.BEACON.conditions, ...CONFIG.BEACON.statuses];
    context.statusList = statusList.map(s => ({
      id: s.id, img: s.img, label: t(`BEACON.Condition.${s.id}`), active: actor.statuses.has(s.id)
    }));
    context.activeStatuses = context.statusList.filter(s => s.active);

    const enrich = (html) => TextEditor().enrichHTML(html ?? "", { relativeTo: actor, secrets: actor.isOwner, rollData: actor.getRollData() });
    context.enriched = {};
    for (const f of ["biography", "notes", "description"]) {
      if (f in system) context.enriched[f] = await enrich(system[f]);
    }
    if (system.job) {
      context.job = system.job;
      context.enriched.limitBreak = await enrich(system.job.system.limitBreak.description);
      context.enriched.jobTraits = await enrich(system.job.system.traits);
    }
    return context;
  }

  _onRender(context, options) {
    super._onRender(context, options);
    for (const el of this.element.querySelectorAll("li[data-item-id]")) {
      el.setAttribute("draggable", "true");
      el.addEventListener("dragstart", event => {
        const item = this.document.items.get(el.dataset.itemId);
        if (!item) return;
        event.stopPropagation();
        event.dataTransfer.setData("text/plain", JSON.stringify(item.toDragData()));
      });
    }
  }

  _abilityView(item) {
    const s = item.system;
    const tier = this.document.type === "npc" ? this.document.system.tier : 1;
    const phase = CONFIG.BEACON.phases[s.phase];
    return {
      id: item.id,
      name: item.name,
      img: item.img,
      system: s,
      tags: item.tagList().slice(1),
      actionLabel: s.action ? t(CONFIG.BEACON.actions[s.action] ?? s.action) : "",
      phaseIcon: phase?.icon ?? (s.action === "reaction" ? "fa-solid fa-reply" : s.action === "minor" ? "fa-solid fa-circle-half-stroke" : "fa-solid fa-circle-dot"),
      range: tiered(s.range, tier),
      damage: s.damage ? `${tiered(s.damage, tier)} ${t(CONFIG.BEACON.damageTypes[s.damageType] ?? "")}` : "",
      attackBonus: tiered(s.attackBonus, tier),
      hasUses: s.usesType !== "none" && s.uses.max > 0,
      unavailable: s.destroyed || (s.reloading && !s.loaded) || (s.recharge && !s.charged)
    };
  }

  _talentView(item) {
    const s = item.system;
    return {
      id: item.id, name: item.name, img: item.img, rank: s.rank,
      ranks: [1, 2, 3].map(r => ({ rank: r, name: s[`rank${r}`].name, active: r <= s.rank }))
    };
  }

  async _onDropItem(event, item) {
    const actor = this.document;
    if (!actor.isOwner) return null;
    if (item.parent === actor) return super._onDropItem(event, item);
    if (item.type === "ancestry" && actor.type === "beacon") {
      const existing = actor.items.filter(i => i.type === "ancestry").map(i => i.id);
      if (existing.length) await actor.deleteEmbeddedDocuments("Item", existing);
    }
    return super._onDropItem(event, item);
  }

  _itemFrom(target) {
    const id = target.closest("[data-item-id]")?.dataset.itemId;
    return this.document.items.get(id);
  }

  static async #onRollAbility(event, target) {
    return rollAbilityCheck(this.document, target.dataset.ability, { skipDialog: event.shiftKey });
  }

  static async #onRollSave(event, target) {
    return rollAbilityCheck(this.document, target.dataset.ability, { save: true, skipDialog: event.shiftKey });
  }

  static async #onRollFlat(event, target) {
    return rollD20({ actor: this.document, title: target.dataset.label ?? "d20", modifier: Number(target.dataset.mod ?? 0), skipDialog: event.shiftKey });
  }

  static async #onUseItem(event, target) {
    return this._itemFrom(target)?.use({ skipDialog: event.shiftKey });
  }

  static async #onChatItem(event, target) {
    return this._itemFrom(target)?.toChat();
  }

  static async #onEditItem(event, target) {
    return this._itemFrom(target)?.sheet.render(true);
  }

  static async #onDeleteItem(event, target) {
    const item = this._itemFrom(target);
    if (!item) return null;
    if (event.shiftKey) return item.delete();
    return item.deleteDialog();
  }

  static async #onCreateItem(event, target) {
    const type = target.dataset.type ?? "ability";
    const system = {};
    if (target.dataset.category) {
      system.category = target.dataset.category;
      system.action = { weapon: "fight", support: "passive", spell: "volley", skill: "minor", trait: "passive", limitbreak: "special" }[system.category];
      if (this.document.type === "npc") system.npcFeature = "base";
      if (["weapon", "support", "spell", "skill"].includes(system.category)) system.equipped = true;
    }
    const name = game.i18n.format("BEACON.Sheet.newItem", { type: t(target.dataset.category ? CONFIG.BEACON.abilityCategories[system.category] : `TYPES.Item.${type}`) });
    const [item] = await this.document.createEmbeddedDocuments("Item", [{ name, type, system }]);
    return item?.sheet.render(true);
  }

  static async #onToggleItem(event, target) {
    const item = this._itemFrom(target);
    const field = target.dataset.field;
    if (!item || !field) return null;
    const value = !foundry.utils.getProperty(item, field);
    if (field === "system.equipped" && item.type === "job" && value) {
      const others = this.document.items.filter(i => i.type === "job" && i.id !== item.id && i.system.equipped);
      if (others.length) await this.document.updateEmbeddedDocuments("Item", others.map(i => ({ _id: i.id, "system.equipped": false })));
    }
    await item.update({ [field]: value });
    if (field === "system.equipped" && item.type === "job" && value) {
      const sys = this.document.system;
      await this.document.update({ "system.hp.value": sys.hp.max, "system.mp.value": sys.mp.max, "system.recoveries.value": sys.recoveries.max });
    }
    return item;
  }

  static async #onSkillAdd() {
    const skills = foundry.utils.deepClone(this.document.system._source.backgroundSkills ?? []);
    skills.push({ name: t("BEACON.Narrative.newSkill"), rank: 1 });
    return this.document.update({ "system.backgroundSkills": skills });
  }

  static async #onSkillDelete(event, target) {
    const skills = foundry.utils.deepClone(this.document.system._source.backgroundSkills ?? []);
    skills.splice(Number(target.dataset.index), 1);
    return this.document.update({ "system.backgroundSkills": skills });
  }

  static async #onSkillRoll(event, target) {
    const index = target.dataset.index === undefined ? -1 : Number(target.dataset.index);
    return rollSkillCheck(this.document, index, { skipDialog: event.shiftKey && index >= 0 });
  }

  static async #onShortRest() {
    return this.document.shortRest();
  }

  static async #onLongRest() {
    const ok = await foundry.applications.api.DialogV2.confirm({
      window: { title: t("BEACON.Rest.long") },
      content: `<p>${t("BEACON.Rest.longConfirm")}</p>`
    });
    if (ok) return this.document.longRest();
    return null;
  }

  static async #onSurge() {
    return this.document.surge();
  }

  static async #onDefend() {
    return this.document.defend();
  }

  static async #onRefresh() {
    return this.document.refresh();
  }

  static async #onRecovery() {
    return this.document.spendRecovery();
  }

  static async #onDiscord() {
    return this.document.discordCheck();
  }

  static async #onLimitBreak() {
    return this.document.useLimitBreak();
  }

  static async #onRecharge() {
    return this.document.rollRecharge();
  }

  static async #onToggleStatus(event, target) {
    return this.document.toggleStatusEffect(target.dataset.status);
  }

  static async #onHarmRoll(event, target) {
    const kind = target.dataset.kind;
    const count = kind === "wound" ? this.document.system.wounds.value : this.document.system.overstress.value;
    return this.document.harmRoll(kind, Math.max(1, count));
  }
}

export class BeaconCharacterSheet extends BeaconActorSheet {
  static DEFAULT_OPTIONS = {
    classes: ["beacon-character"]
  };

  static PARTS = {
    header: { template: "systems/beacon/templates/actor/beacon-header.hbs" },
    main: { template: "systems/beacon/templates/actor/beacon-main.hbs", scrollable: [""] },
    loadout: { template: "systems/beacon/templates/actor/beacon-loadout.hbs", scrollable: [""] },
    build: { template: "systems/beacon/templates/actor/beacon-build.hbs", scrollable: [""] },
    narrative: { template: "systems/beacon/templates/actor/beacon-narrative.hbs", scrollable: [""] }
  };

  static TABS = {
    primary: {
      tabs: [
        { id: "main", icon: "fa-solid fa-swords" },
        { id: "loadout", icon: "fa-solid fa-suitcase" },
        { id: "build", icon: "fa-solid fa-dna" },
        { id: "narrative", icon: "fa-solid fa-book-open" }
      ],
      initial: "main",
      labelPrefix: "BEACON.Tab"
    }
  };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const system = this.document.system;
    context.memoryOver = system.memoryUsed > (system.attributes.memory ?? 0);
    context.classOver = system.classRanks > system.level;
    context.surgeCost = CONFIG.BEACON.surgeCost[system.surge] ?? "";
    context.skills = (system.backgroundSkills ?? []).map((s, index) => ({ ...s, index }));
    context.equippedSupplies = context.supplies.filter(s => s.system.equipped).length;
    context.talentMax = system.level + 2;
    context.rankOptions = { 1: "1", 2: "2", 3: "3" };
    context.sizeLabel = CONFIG.BEACON.characterSizes[system.size] ?? system.size;
    return context;
  }

  _processFormData(event, form, formData) {
    const data = super._processFormData(event, form, formData);
    const skills = data.system?.backgroundSkills;
    if (skills && !Array.isArray(skills)) {
      data.system.backgroundSkills = Object.keys(skills).sort((x, y) => Number(x) - Number(y)).map(k => skills[k]);
    }
    return data;
  }
}

export class BeaconNPCSheet extends BeaconActorSheet {
  static DEFAULT_OPTIONS = {
    classes: ["beacon-npc"],
    position: { width: 720, height: 800 }
  };

  static PARTS = {
    sheet: { template: "systems/beacon/templates/actor/npc.hbs", scrollable: [".npc-body"] }
  };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const system = this.document.system;
    context.tierStats = system.tiers[system.tier];
    context.tierPath = `system.tiers.${system.tier}`;
    context.tierOptions = { 1: "T1", 2: "T2", 3: "T3" };
    context.baseFeatures = context.categories.flatMap(c => c.items).filter(i => i.system.npcFeature !== "extra");
    context.extraFeatures = context.categories.flatMap(c => c.items).filter(i => i.system.npcFeature === "extra");
    context.statFields = ["hp", "stressCap", "dodge", "adef", "speed", "mp", "armor", "saveTarget", "scope", "initiative"].map(k => ({
      key: k, label: t(`BEACON.Attr.${k}`), value: context.tierStats[k]
    }));
    return context;
  }
}
