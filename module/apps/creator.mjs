import { importBeaconData } from "../importer.mjs";

const { ApplicationV2 } = foundry.applications.api;
const t = k => game.i18n.localize(k);
const esc = s => foundry.utils.escapeHTML(String(s ?? ""));

const H = key => ({ h: key });

function options() {
  const C = CONFIG.BEACON;
  const loc = obj => Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, t(v)]));
  return {
    category: loc(C.abilityCategories),
    action: loc(C.actions),
    attack: loc(C.attackTypes),
    defense: loc(C.defenses),
    size: loc(C.sizes),
    weaponType: loc(C.weaponTypes),
    damageType: loc(C.damageTypes),
    usesType: loc(C.usesTypes),
    npcFeature: loc(C.npcFeatureTypes),
    baseExtra: { base: t("BEACON.NPCFeature.base"), extra: t("BEACON.NPCFeature.extra") },
    role: loc(C.roles),
    charSize: { ...C.characterSizes },
    kind: loc(C.templateKinds),
    rank3: { 1: "1", 2: "2", 3: "3" },
    rank03: { 0: "0", 1: "1", 2: "2", 3: "3" },
    tier: { 1: "T1", 2: "T2", 3: "T3" }
  };
}

function typeDefs(O) {
  return {
    ability: { doc: "Item", fields: [
      ["name", "BEACON.Sheet.name", "text", { cls: "half" }], ["img", "BEACON.Creator.img", "text", { cls: "half", ph: "icons/svg/sword.svg" }],
      H("BEACON.Creator.hUsage"),
      ["system.category", "BEACON.Item.category", "select", { o: O.category, d: "weapon" }], ["system.action", "BEACON.Item.action", "select", { o: O.action, d: "fight" }],
      ["system.attack", "BEACON.Item.attack", "select", { o: O.attack, d: "none" }], ["system.defense", "BEACON.Item.defense", "select", { o: O.defense, d: "dodge" }],
      ["system.size", "BEACON.Item.size", "select", { o: O.size, d: "none" }], ["system.weaponType", "BEACON.Item.weaponType", "select", { o: O.weaponType, d: "none" }],
      ["system.tags", "BEACON.Item.tags", "text", { cls: "half", ph: "Aetheric, Mana 1, Piercing" }], ["system.range", "BEACON.Item.range", "text", { cls: "half", ph: "Range 10, Blast 1" }],
      H("BEACON.Creator.hDamage"),
      ["system.damage", "BEACON.Item.damage", "text", { ph: "1d6+2 / 4/6/8" }], ["system.damageType", "BEACON.Item.damageType", "select", { o: O.damageType, d: "physical" }],
      ["system.attackBonus", "BEACON.Item.attackBonus", "text", { ph: "+2/4/6" }], ["system.memory", "BEACON.Attr.memory", "number", { d: 0 }],
      ["system.mana", "BEACON.Item.mana", "number", { d: 0 }], ["system.focus", "BEACON.Attr.focus", "number", { d: 0 }],
      ["system.stressful", "BEACON.Item.stressful", "number", { d: 0 }], ["system.armor", "BEACON.Attr.armor", "number", { d: 0 }],
      ["system.usesType", "BEACON.Item.usesType", "select", { o: O.usesType, d: "none" }], ["system.uses.max", "BEACON.Item.uses", "number", { d: 0 }],
      ["system.recharge", "BEACON.NPC.recharge", "number", { d: 0 }], ["system.rank", "BEACON.Item.rank", "select", { o: O.rank03, d: "0", num: true }],
      H("BEACON.Creator.hOrigin"),
      ["system.source", "BEACON.Item.source", "text", {}], ["system.rarity", "BEACON.Item.rarity", "text", {}],
      ["system.npcFeature", "BEACON.Item.npcFeature", "select", { o: O.npcFeature, d: "none" }],
      ["system.equipped", "BEACON.Sheet.equipped", "check", { d: false }], ["system.free", "BEACON.Item.free", "check", { d: false }], ["system.reloading", "BEACON.Item.reloading", "check", { d: false }],
      ["system.description", "BEACON.Sheet.description", "html", { cls: "wide" }]
    ]},
    job: { doc: "Item", fields: [
      ["name", "BEACON.Sheet.name", "text", { cls: "half" }], ["system.className", "TYPES.Item.class", "text", {}], ["system.role", "BEACON.NPC.role", "select", { o: O.role, d: "striker" }],
      H("BEACON.Job.baseAttributes"),
      ["system.scope", "BEACON.Attr.scope", "number", { d: 10 }], ["system.saveTarget", "BEACON.Attr.saveTarget", "number", { d: 10 }],
      ["system.hp", "BEACON.Attr.hp", "number", { d: 6 }], ["system.recoveries", "BEACON.Attr.recoveries", "number", { d: 3 }],
      ["system.dodge", "BEACON.Attr.dodge", "number", { d: 8 }], ["system.speed", "BEACON.Attr.speed", "number", { d: 4 }],
      ["system.stressCap", "BEACON.Attr.stressCap", "number", { d: 6 }], ["system.memory", "BEACON.Attr.memory", "number", { d: 6 }],
      ["system.adef", "BEACON.Attr.adef", "number", { d: 8 }], ["system.mp", "BEACON.Attr.mp", "number", { d: 3 }],
      H("BEACON.Creator.hSlots"),
      ["system.weaponSlots", "BEACON.Job.weaponSlots", "text", { cls: "half", d: "Main, Light" }], ["system.supportSlots", "BEACON.Job.supportSlots", "text", { cls: "half", d: "Main, Light" }],
      ["system.traits", "BEACON.Job.traits", "html", { cls: "wide" }],
      H("BEACON.Job.limitBreak"),
      ["system.limitBreak.name", "BEACON.Creator.lbName", "text", { cls: "half" }], ["system.limitBreak.range", "BEACON.Item.range", "text", {}],
      ["system.limitBreak.description", "BEACON.Creator.lbEffect", "html", { cls: "wide" }],
      ["system.description", "BEACON.Sheet.description", "html", { cls: "wide" }]
    ]},
    class: { doc: "Item", fields: [
      ["name", "BEACON.Sheet.name", "text", { cls: "half" }], ["system.jobName", "TYPES.Item.job", "text", {}], ["system.role", "BEACON.NPC.role", "select", { o: O.role, d: "striker" }],
      ["system.rank", "BEACON.Item.rank", "select", { o: O.rank03, d: "1", num: true }],
      ["system.abilities", "BEACON.Class.abilities", "html", { cls: "wide" }],
      ["system.description", "BEACON.Sheet.description", "html", { cls: "wide" }]
    ]},
    talent: { doc: "Item", fields: [
      ["name", "BEACON.Sheet.name", "text", { cls: "half" }], ["system.rank", "BEACON.Item.rank", "select", { o: O.rank3, d: "1", num: true }],
      ...[1, 2, 3].flatMap(r => [
        { h: "BEACON.Item.rank", suffix: ` ${r}` },
        [`system.rank${r}.name`, "BEACON.Sheet.name", "text", { cls: "wide" }],
        [`system.rank${r}.description`, "BEACON.Sheet.description", "html", { cls: "wide" }]
      ]),
      ["system.description", "BEACON.Sheet.description", "html", { cls: "wide" }]
    ]},
    ancestry: { doc: "Item", fields: [
      ["name", "BEACON.Sheet.name", "text", { cls: "half" }], ["system.size", "BEACON.Attr.size", "select", { o: O.charSize, d: "1" }],
      ["system.traits", "BEACON.Ancestry.traits", "html", { cls: "wide" }],
      ["system.description", "BEACON.Sheet.description", "html", { cls: "wide" }]
    ]},
    supply: { doc: "Item", fields: [
      ["name", "BEACON.Sheet.name", "text", { cls: "half" }], ["system.quantity", "BEACON.Supply.quantity", "number", { d: 1 }], ["system.cost", "BEACON.Supply.cost", "number", { d: 0 }],
      ["system.equipped", "BEACON.Sheet.equipped", "check", { d: false }],
      ["system.description", "BEACON.Sheet.description", "html", { cls: "wide" }]
    ]},
    template: { doc: "Item", fields: [
      ["name", "BEACON.Sheet.name", "text", { cls: "half" }], ["system.kind", "BEACON.Template.kind", "select", { o: O.kind, d: "thematic" }],
      ["system.description", "BEACON.Sheet.description", "html", { cls: "wide" }]
    ]},
    npc: { doc: "Actor", fields: [
      ["name", "BEACON.Sheet.name", "text", { cls: "half" }], ["system.npcType", "BEACON.NPC.type", "text", {}], ["system.role", "BEACON.NPC.role", "select", { o: O.role, d: "striker" }],
      ["system.tier", "BEACON.NPC.tier", "select", { o: O.tier, d: "1", num: true }], ["system.size", "BEACON.Attr.size", "select", { o: O.charSize, d: "1" }],
      ["system.turns", "BEACON.NPC.turns", "number", { d: 1 }], ["system.templates", "BEACON.NPC.templates", "text", { ph: "Elite, Undead" }],
      ["system.wounds.max", "BEACON.Harm.woundCap", "number", { d: 1 }], ["system.overstress.max", "BEACON.Harm.overstressCap", "number", { d: 1 }],
      ["system.resistances", "BEACON.Attr.resistances", "text", {}], ["system.immunities", "BEACON.Attr.immunities", "text", {}],
      H("BEACON.Creator.hTiers"), { tiers: true },
      H("BEACON.Creator.hFeatures"), { features: true },
      ["system.description", "BEACON.Sheet.description", "html", { cls: "wide" }]
    ]},
    beacon: { doc: "Actor", fields: [
      ["name", "BEACON.Sheet.name", "text", { cls: "half" }], ["system.title", "BEACON.Narrative.title", "text", { cls: "half" }],
      ["system.level", "BEACON.Attr.level", "number", { d: 1 }], ["system.gold", "BEACON.Narrative.gold", "number", { d: 0 }], ["system.residuum", "BEACON.Narrative.residuum", "number", { d: 0 }],
      H("BEACON.Creator.hScores"),
      ["system.abilities.bulk", "BEACON.Ability.bulk", "number", { d: 0 }], ["system.abilities.agility", "BEACON.Ability.agility", "number", { d: 0 }],
      ["system.abilities.mind", "BEACON.Ability.mind", "number", { d: 0 }], ["system.abilities.magic", "BEACON.Ability.magic", "number", { d: 0 }],
      ["skills", "BEACON.Creator.skills", "textarea", { cls: "wide", ph: "Truthseeker | 2" }],
      ["system.biography", "BEACON.Narrative.biography", "html", { cls: "wide" }]
    ]}
  };
}

function featureFields(O) {
  return [
    ["name", "BEACON.Sheet.name", "text", { cls: "half" }], ["system.npcFeature", "BEACON.Item.npcFeature", "select", { o: O.baseExtra, d: "base" }],
    ["system.category", "BEACON.Item.category", "select", { o: O.category, d: "weapon" }], ["system.action", "BEACON.Item.action", "select", { o: O.action, d: "fight" }],
    ["system.attack", "BEACON.Item.attack", "select", { o: O.attack, d: "melee" }], ["system.defense", "BEACON.Item.defense", "select", { o: O.defense, d: "dodge" }],
    ["system.attackBonus", "BEACON.Item.attackBonus", "text", { ph: "+2/4/6" }], ["system.range", "BEACON.Item.range", "text", { ph: "Reach 1" }],
    ["system.damage", "BEACON.Item.damage", "text", { ph: "4/6/8" }], ["system.damageType", "BEACON.Item.damageType", "select", { o: O.damageType, d: "physical" }],
    ["system.tags", "BEACON.Item.tags", "text", {}], ["system.mana", "BEACON.Item.mana", "number", { d: 0 }], ["system.recharge", "BEACON.NPC.recharge", "number", { d: 0 }],
    ["system.description", "BEACON.Sheet.description", "html", { cls: "wide" }]
  ];
}

const TIER_STATS = ["hp", "stressCap", "dodge", "adef", "speed", "mp", "armor", "saveTarget", "scope", "initiative", "bulk", "agility", "mind", "magic"];
const TIER_DEFAULT = { hp: 10, stressCap: 6, dodge: 10, adef: 8, speed: 4, mp: 0, armor: 0, saveTarget: 10, scope: 5, initiative: 4, bulk: 0, agility: 0, mind: 0, magic: 0 };
const TYPE_ORDER = ["ability", "job", "class", "talent", "ancestry", "supply", "template", "npc", "beacon"];
const IMG = { weapon: "icons/svg/sword.svg", support: "icons/svg/shield.svg", spell: "icons/svg/lightning.svg", skill: "icons/svg/upgrade.svg", trait: "icons/svg/aura.svg", limitbreak: "icons/svg/explosion.svg" };

const toHTML = text => {
  const s = String(text ?? "").trim();
  return s ? s.split(/\n\s*\n/).map(p => `<p>${esc(p).replace(/\n/g, "<br>")}</p>`).join("") : "";
};

export class BeaconCreator extends ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: "beacon-creator",
    classes: ["beacon", "beacon-creator"],
    position: { width: 720, height: 760 },
    window: { title: "BEACON.Creator.title", icon: "fa-solid fa-wand-magic-sparkles", resizable: true }
  };

  type = "ability";
  tab = "form";
  features = [];
  tiers = { 1: { ...TIER_DEFAULT }, 2: { ...TIER_DEFAULT }, 3: { ...TIER_DEFAULT } };
  folder = "BEACON";
  created = [];

  fieldHTML(def, prefix = "") {
    const [key, label, kind, opt = {}] = def;
    const id = `${this.id}-${prefix}${key.replace(/\./g, "-")}`;
    const cls = opt.cls ? ` ${opt.cls}` : "";
    const v = opt.d ?? "";
    const data = `data-key="${key}" data-kind="${kind}"${opt.num ? " data-num=\"1\"" : ""}`;
    if (kind === "check") return `<label class="check${cls}"><input type="checkbox" id="${id}" ${data} ${v ? "checked" : ""}> ${t(label)}</label>`;
    let input;
    if (kind === "select") {
      input = `<select id="${id}" ${data}>${Object.entries(opt.o).map(([k, l]) => `<option value="${esc(k)}" ${String(k) === String(v) ? "selected" : ""}>${esc(l)}</option>`).join("")}</select>`;
    } else if (kind === "textarea" || kind === "html") {
      const ph = opt.ph ?? (kind === "html" ? t("BEACON.Creator.textHint") : "");
      input = `<textarea id="${id}" ${data} placeholder="${esc(ph)}"></textarea>`;
    } else {
      input = `<input id="${id}" type="${kind === "number" ? "number" : "text"}" ${data} value="${esc(v)}" placeholder="${esc(opt.ph ?? "")}">`;
    }
    return `<label class="f${cls}" for="${id}"><span>${t(label)}</span>${input}</label>`;
  }

  tiersHTML() {
    const rows = TIER_STATS.map(k => `<tr><th scope="row">${t(`BEACON.Attr.${k}`) !== `BEACON.Attr.${k}` ? t(`BEACON.Attr.${k}`) : t(`BEACON.Ability.${k}`)}</th>${
      [1, 2, 3].map(n => `<td><input type="number" data-tier="${n}" data-stat="${k}" value="${this.tiers[n][k]}"></td>`).join("")}</tr>`).join("");
    return `<div class="creator-tiers"><table><thead><tr><th>${t("BEACON.Creator.attribute")}</th><th>T1</th><th>T2</th><th>T3</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }

  featuresHTML(O) {
    const defs = featureFields(O);
    const cards = this.features.map((f, i) => `<div class="creator-feature" data-index="${i}">
      <div class="row-head"><span>${t("BEACON.Creator.feature")} ${i + 1}</span><a data-remove-feature="${i}"><i class="fa-solid fa-trash"></i> ${t("BEACON.Creator.removeFeature")}</a></div>
      ${defs.map(d => this.fieldHTML(d, `feat${i}-`)).join("")}
    </div>`).join("");
    return `<div class="creator-features">${cards || `<p class="hint">${t("BEACON.Creator.noFeatures")}</p>`}
      <button type="button" data-creator-action="addFeature"><i class="fa-solid fa-plus"></i> ${t("BEACON.Creator.addFeature")}</button></div>`;
  }

  async _renderHTML() {
    if (this.rendered) this._pendingValues ??= this.#readState();
    const O = options();
    const defs = typeDefs(O);
    const def = defs[this.type];
    const typeButtons = TYPE_ORDER.map(k => `<button type="button" data-type="${k}" class="${k === this.type ? "active" : ""}">${t(k === "beacon" || k === "npc" ? `TYPES.Actor.${k}` : `TYPES.Item.${k}`)}</button>`).join("");
    const fields = def.fields.map(f => {
      if (f.h) return `<h3>${t(f.h)}${f.suffix ?? ""}</h3>`;
      if (f.tiers) return this.tiersHTML();
      if (f.features) return this.featuresHTML(O);
      return this.fieldHTML(f);
    }).join("");
    const created = this.created.length
      ? `<ul class="creator-created">${this.created.slice(-6).reverse().map(c => `<li><a data-open-uuid="${c.uuid}"><i class="fa-solid fa-arrow-up-right-from-square"></i> ${esc(c.name)}</a> <span class="hint">${esc(c.type)}</span></li>`).join("")}</ul>`
      : "";
    const html = `
      <nav class="creator-tabs">
        <a data-tab="form" class="${this.tab === "form" ? "active" : ""}"><i class="fa-solid fa-pen-to-square"></i> ${t("BEACON.Creator.tabForm")}</a>
        <a data-tab="json" class="${this.tab === "json" ? "active" : ""}"><i class="fa-solid fa-code"></i> ${t("BEACON.Creator.tabJson")}</a>
      </nav>
      <section class="creator-body" data-panel="form" ${this.tab === "form" ? "" : "hidden"}>
        <div class="creator-types">${typeButtons}</div>
        <div class="creator-fields">${fields}</div>
      </section>
      <section class="creator-body" data-panel="json" ${this.tab === "json" ? "" : "hidden"}>
        <p class="hint">${t("BEACON.Import.hint")}</p>
        <textarea class="creator-json" rows="18" placeholder='[{"name": "...", "type": "ability", "system": {}}]'></textarea>
      </section>
      <footer class="creator-footer">
        <label class="f folder"><span>${t("BEACON.Import.folder")}</span><input type="text" class="creator-folder" value="${esc(this.folder)}"></label>
        <div class="creator-buttons" data-panel="form" ${this.tab === "form" ? "" : "hidden"}>
          <button type="button" data-creator-action="create"><i class="fa-solid fa-plus"></i> ${t("BEACON.Creator.create")}</button>
          <button type="button" data-creator-action="createOpen"><i class="fa-solid fa-up-right-from-square"></i> ${t("BEACON.Creator.createOpen")}</button>
          <button type="button" data-creator-action="reset"><i class="fa-solid fa-eraser"></i> ${t("BEACON.Creator.reset")}</button>
        </div>
        <div class="creator-buttons" data-panel="json" ${this.tab === "json" ? "" : "hidden"}>
          <button type="button" data-creator-action="importJson"><i class="fa-solid fa-file-import"></i> ${t("BEACON.Import.import")}</button>
        </div>
        ${created}
      </footer>`;
    return html;
  }

  _replaceHTML(result, content) {
    content.innerHTML = result;
  }

  _onRender(context, options) {
    super._onRender?.(context, options);
    const root = this.element;
    root.querySelectorAll("[data-type]").forEach(b => b.addEventListener("click", () => this.#switchType(b.dataset.type)));
    root.querySelectorAll("[data-tab]").forEach(a => a.addEventListener("click", () => {
      this.tab = a.dataset.tab;
      root.querySelectorAll("[data-tab]").forEach(x => x.classList.toggle("active", x.dataset.tab === this.tab));
      root.querySelectorAll("[data-panel]").forEach(x => { x.hidden = x.dataset.panel !== this.tab; });
    }));
    root.querySelectorAll("[data-creator-action]").forEach(b => b.addEventListener("click", ev => this.#onAction(ev, b.dataset.creatorAction)));
    root.querySelectorAll("[data-remove-feature]").forEach(a => a.addEventListener("click", () => {
      const values = this.#readState();
      this.features.splice(Number(a.dataset.removeFeature), 1);
      this.#rerender(values);
    }));
    root.querySelectorAll("[data-open-uuid]").forEach(a => a.addEventListener("click", async () => (await fromUuid(a.dataset.openUuid))?.sheet.render(true)));
    if (this._pendingValues) {
      this.#fill(this._pendingValues);
      this._pendingValues = null;
    }
  }

  #readField(el) {
    if (el.type === "checkbox") return el.checked;
    if (el.dataset.kind === "number" || el.dataset.num) return el.value === "" ? 0 : Number(el.value);
    if (el.dataset.kind === "html") return toHTML(el.value);
    return el.value;
  }

  #readState() {
    const root = this.element;
    if (!root) return {};
    this.folder = root.querySelector(".creator-folder")?.value ?? this.folder;
    root.querySelectorAll("[data-tier]").forEach(el => { this.tiers[el.dataset.tier][el.dataset.stat] = Number(el.value) || 0; });
    root.querySelectorAll(".creator-feature").forEach(card => {
      const f = { name: "", type: "ability", system: {} };
      card.querySelectorAll("[data-key]").forEach(el => foundry.utils.setProperty(f, el.dataset.key, this.#readField(el)));
      f.raw = Object.fromEntries(Array.from(card.querySelectorAll("[data-key]")).map(el => [el.dataset.key, el.type === "checkbox" ? el.checked : el.value]));
      this.features[Number(card.dataset.index)] = f;
    });
    const raw = {};
    root.querySelectorAll(".creator-fields > label [data-key]").forEach(el => { raw[el.dataset.key] = el.type === "checkbox" ? el.checked : el.value; });
    return raw;
  }

  #fill(raw) {
    const root = this.element;
    for (const [key, value] of Object.entries(raw ?? {})) {
      const el = root.querySelector(`.creator-fields > label [data-key="${key}"]`);
      if (!el) continue;
      if (el.type === "checkbox") el.checked = !!value;
      else el.value = value;
    }
    root.querySelectorAll(".creator-feature").forEach(card => {
      const f = this.features[Number(card.dataset.index)];
      for (const [key, value] of Object.entries(f?.raw ?? {})) {
        const el = card.querySelector(`[data-key="${key}"]`);
        if (!el) continue;
        if (el.type === "checkbox") el.checked = !!value;
        else el.value = value;
      }
    });
  }

  #rerender(values) {
    this._pendingValues = values;
    this.render();
  }

  #switchType(type) {
    this.#readState();
    this._pendingValues = {};
    this.type = type;
    this.features = [];
    this.tiers = { 1: { ...TIER_DEFAULT }, 2: { ...TIER_DEFAULT }, 3: { ...TIER_DEFAULT } };
    this.render();
  }

  #buildDoc() {
    this.#readState();
    const root = this.element;
    const doc = { name: "", type: this.type, system: {} };
    for (const el of root.querySelectorAll(".creator-fields > label [data-key]")) {
      const key = el.dataset.key;
      if (key === "skills") {
        doc.system.backgroundSkills = el.value.split("\n").map(l => l.trim()).filter(Boolean).map(l => {
          const [name, rank] = l.split("|").map(s => s.trim());
          return { name, rank: Math.clamp(Number(rank) || 1, 1, 3) };
        });
        continue;
      }
      const value = this.#readField(el);
      if (key === "img" && !value) continue;
      foundry.utils.setProperty(doc, key, value);
    }
    doc.name = doc.name.trim();
    if (this.type === "ability") {
      const max = doc.system.uses?.max ?? 0;
      doc.system.uses = { value: max, max };
      doc.img ??= IMG[doc.system.category];
    }
    if (this.type === "npc") {
      doc.system.tiers = foundry.utils.deepClone(this.tiers);
      const tier = this.tiers[doc.system.tier || 1];
      doc.system.hp = { value: tier.hp, max: tier.hp };
      doc.system.mp = { value: tier.mp, max: tier.mp };
      doc.system.wounds = { value: 0, max: doc.system.wounds?.max || 1 };
      doc.system.overstress = { value: 0, max: doc.system.overstress?.max || 1 };
      doc.items = this.features.filter(f => f.name?.trim()).map(f => ({
        name: f.name.trim(), type: "ability", img: IMG[f.system.category],
        system: { ...f.system, equipped: f.system.npcFeature !== "extra" }
      }));
    }
    return doc;
  }

  async #onAction(event, action) {
    if (action === "addFeature") {
      const values = this.#readState();
      this.features.push({ name: "", type: "ability", system: {}, raw: {} });
      return this.#rerender(values);
    }
    if (action === "reset") {
      this._pendingValues = {};
      this.features = [];
      this.tiers = { 1: { ...TIER_DEFAULT }, 2: { ...TIER_DEFAULT }, 3: { ...TIER_DEFAULT } };
      return this.render();
    }
    if (action === "importJson") {
      const text = this.element.querySelector(".creator-json")?.value ?? "";
      this.folder = this.element.querySelector(".creator-folder")?.value ?? this.folder;
      let data;
      try {
        data = JSON.parse(text);
      } catch (err) {
        return ui.notifications.error(`${t("BEACON.Import.invalid")}: ${err.message}`);
      }
      return importBeaconData(data, { folderName: this.folder });
    }
    if (action === "create" || action === "createOpen") {
      const doc = this.#buildDoc();
      if (!doc.name) return ui.notifications.warn(t("BEACON.Creator.needName"));
      const cls = doc.type in CONFIG.Actor.dataModels ? Actor : Item;
      const folderType = cls === Actor ? "Actor" : "Item";
      if (this.folder) {
        const existing = game.folders.find(f => f.type === folderType && f.name === this.folder);
        doc.folder = existing?.id ?? (await Folder.create({ name: this.folder, type: folderType })).id;
      }
      const created = await cls.create(doc);
      if (!created) return null;
      ui.notifications.info(game.i18n.format("BEACON.Creator.created", { name: created.name }));
      this.created.push({ uuid: created.uuid, name: created.name, type: t(`TYPES.${folderType}.${created.type}`) });
      if (action === "createOpen") created.sheet.render(true);
      this._pendingValues = {};
      this.features = [];
      this.tiers = { 1: { ...TIER_DEFAULT }, 2: { ...TIER_DEFAULT }, 3: { ...TIER_DEFAULT } };
      return this.render();
    }
    return null;
  }
}

export function openCreator() {
  if (!game.user.isGM) return ui.notifications.warn(t("BEACON.Import.gmOnly"));
  const existing = foundry.applications.instances.get("beacon-creator");
  if (existing) return existing.render({ force: true });
  return new BeaconCreator().render({ force: true });
}
