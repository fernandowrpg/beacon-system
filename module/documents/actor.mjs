import { rollAbilityCheck } from "../rolls.mjs";

const { DialogV2 } = foundry.applications.api;
const t = k => game.i18n.localize(k);

function listHas(list, type) {
  const values = String(list ?? "").toLowerCase().split(/[,;]/).map(s => s.trim());
  return values.includes(type) || values.includes("all") || values.includes("todos");
}

export class BeaconActor extends Actor {
  async _preCreate(data, options, user) {
    if ((await super._preCreate(data, options, user)) === false) return false;
    const update = {};
    if (this.type === "beacon") {
      update["prototypeToken.actorLink"] = true;
      update["prototypeToken.disposition"] = CONST.TOKEN_DISPOSITIONS.FRIENDLY;
      update["prototypeToken.sight.enabled"] = true;
    } else {
      update["prototypeToken.disposition"] = CONST.TOKEN_DISPOSITIONS.HOSTILE;
      const stats = this.system.tiers?.[this.system.tier];
      if (stats && !foundry.utils.getProperty(data, "system.hp.value")) update["system.hp.value"] = stats.hp;
      if (stats && !foundry.utils.getProperty(data, "system.mp.value")) update["system.mp.value"] = stats.mp;
    }
    const spaces = Math.max(1, Math.floor(Number(this.system?.size) || 1));
    update["prototypeToken.width"] = spaces;
    update["prototypeToken.height"] = spaces;
    update["prototypeToken.bar1.attribute"] = "hp";
    update["prototypeToken.bar2.attribute"] = "stress";
    this.updateSource(update);
  }

  _onUpdate(changed, options, userId) {
    super._onUpdate(changed, options, userId);
    if (game.users.activeGM?.isSelf) this.syncStatuses();
  }

  _onCreateDescendantDocuments(parent, collection, documents, data, options, userId) {
    super._onCreateDescendantDocuments(parent, collection, documents, data, options, userId);
    if (game.users.activeGM?.isSelf && collection === "items") this.syncStatuses();
  }

  _onDeleteDescendantDocuments(parent, collection, documents, ids, options, userId) {
    super._onDeleteDescendantDocuments(parent, collection, documents, ids, options, userId);
    if (game.users.activeGM?.isSelf && collection === "items") this.syncStatuses();
  }

  get gridSpaces() {
    return Math.max(1, Math.floor(Number(this.system?.size) || 1));
  }

  async syncTokenSize() {
    const spaces = this.gridSpaces;
    const proto = this.prototypeToken;
    if (proto.width !== spaces || proto.height !== spaces) {
      await this.update({ "prototypeToken.width": spaces, "prototypeToken.height": spaces });
    }
    const tokens = this.isToken ? [this.token] : this.getActiveTokens(false, true);
    for (const token of tokens) {
      if (token.width !== spaces || token.height !== spaces) await token.update({ width: spaces, height: spaces });
    }
  }

  async syncStatuses() {
    const sys = this.system;
    if (!sys?.attributes) return;
    await this.syncTokenSize();
    const wanted = {
      bloodied: sys.attributes.hp > 0 && sys.isBloodied,
      breaking: sys.isBreaking
    };
    if (this.type === "npc" && sys.overstress.max <= 1 && sys.attributes.stressCap > 0) {
      wanted.vulnerable = sys.stress.value > sys.attributes.stressCap ? true : undefined;
    }
    for (const [id, active] of Object.entries(wanted)) {
      if (active === undefined) continue;
      if (this.statuses.has(id) !== active) await this.toggleStatusEffect(id, { active });
    }
  }

  get woundCap() {
    return this.system.wounds.max;
  }

  async applyDamage(amount, { type = "physical", piercing = false, silent = false, ongoing = false } = {}) {
    amount = Math.floor(Number(amount) || 0);
    if (amount < 0) return this.heal(-amount);
    if (type === "stress") return this.applyStress(amount, { silent });
    const sys = this.system;
    const sundered = this.statuses.has("sundered");
    if (listHas(sys.immunities, type)) amount = 0;
    if (this.statuses.has("vulnerable") && type !== "discord") amount *= 2;
    const startWounds = sys.wounds.value;
    if (!piercing && type !== "discord" && !sundered) amount = Math.max(0, amount - sys.attributes.armor);
    if (!sundered && !ongoing && listHas(sys.resistances, type)) amount = Math.ceil(amount / 2);
    if (listHas(sys.vulnerabilities, type) && !this.statuses.has("vulnerable")) amount *= 2;

    const update = {};
    if (type === "discord" && !ongoing && amount > 0) update["system.discord"] = sys.discord + amount;
    let remaining = amount;
    let temp = sys.tempHp;
    if (temp > 0) {
      const absorbed = Math.min(temp, remaining);
      temp -= absorbed;
      remaining -= absorbed;
      update["system.tempHp"] = temp;
    }
    let hp = sys.hp.value - remaining;
    let wounds = sys.wounds.value;
    let newWounds = 0;
    const max = Math.max(1, sys.hp.max);
    while (hp <= 0 && wounds < sys.wounds.max) {
      wounds += 1;
      newWounds += 1;
      hp = wounds >= sys.wounds.max ? 0 : max + hp;
    }
    update["system.hp.value"] = Math.max(0, hp);
    update["system.wounds.value"] = wounds;
    await this.update(update);
    if (!silent) await this._postHarm(amount, type);
    for (let i = 0; i < newWounds; i++) {
      await this.harmRoll("wound", startWounds + i + 1);
    }
    return amount;
  }

  async heal(amount) {
    const hp = Math.min(this.system.hp.max, this.system.hp.value + amount);
    await this.update({ "system.hp.value": hp });
    return amount;
  }

  async applyStress(amount, { silent = false } = {}) {
    amount = Math.floor(Number(amount) || 0);
    const sys = this.system;
    if (amount <= 0) return 0;
    if (sys.attributes.stressCap <= 0) return this.applyDamage(amount, { type: "force", silent });
    if (listHas(sys.immunities, "stress")) amount = 0;
    if (listHas(sys.resistances, "stress") && !this.statuses.has("sundered")) amount = Math.ceil(amount / 2);
    const cap = sys.attributes.stressCap;
    const startOver = sys.overstress.value;
    let stress = sys.stress.value + amount;
    let over = sys.overstress.value;
    let newOver = 0;
    const npcSimple = this.type === "npc" && sys.overstress.max <= 1;
    if (!npcSimple) {
      while (stress > cap && over < sys.overstress.max) {
        stress -= cap;
        over += 1;
        newOver += 1;
      }
    }
    await this.update({ "system.stress.value": stress, "system.overstress.value": over });
    if (!silent) await this._postHarm(amount, "stress");
    for (let i = 0; i < newOver; i++) {
      await this.harmRoll("overstress", startOver + i + 1);
    }
    return amount;
  }

  async _postHarm(amount, type) {
    const label = t(CONFIG.BEACON.damageTypes[type] ?? type);
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this }),
      content: `<div class="beacon-card small"><p>${game.i18n.format("BEACON.Chat.tookHarm", { name: this.name, amount, type: label })}</p></div>`,
      whisper: this.type === "npc" ? ChatMessage.getWhisperRecipients("GM") : []
    });
  }

  async harmRoll(kind, count) {
    const sys = this.system;
    const cap = kind === "wound" ? sys.wounds.max : sys.overstress.max;
    const remaining = cap - count;
    const label = t(kind === "wound" ? "BEACON.Harm.wound" : "BEACON.Harm.overstress");
    if (remaining <= 0) {
      await this.toggleStatusEffect("dead", { active: true, overlay: true });
      return ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor: this }),
        content: `<div class="beacon-card"><header class="card-header"><h3>${label}</h3></header><div class="beacon-outcome failure">${game.i18n.format("BEACON.Harm.defeated", { name: this.name })}</div></div>`
      });
    }
    if (this.type === "npc" && cap <= 1) return null;
    const table = (kind === "wound" ? CONFIG.BEACON.woundTable : CONFIG.BEACON.overstressTable)[Math.min(remaining, 3)];
    const roll = await new Roll("1d6").evaluate();
    const entry = table.find(([lo, hi]) => roll.total >= lo && roll.total <= hi);
    const key = entry?.[2] ?? "dazed";
    const effects = { dazed: ["dazed"], staggered: ["slowed", "stunned"], exposed: ["vulnerable", "weakened"] }[key] ?? [];
    for (const id of effects) await this.toggleStatusEffect(id, { active: true });
    if (key === "lostMana") await this.update({ "system.lostMana": (sys.lostMana ?? 0) + 1 });
    return ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this }),
      rolls: [roll],
      content: `<div class="beacon-card">
        <header class="card-header"><h3>${label} ${count}/${cap}</h3></header>
        ${await roll.render()}
        <div class="beacon-outcome failure">${t(`BEACON.Harm.${key}`)}</div>
        <p class="harm-desc">${t(`BEACON.Harm.${key}Desc`)}</p>
      </div>`
    });
  }

  async spendRecovery() {
    const sys = this.system;
    if (!sys.recoveries || sys.recoveries.value <= 0) return ui.notifications.warn(t("BEACON.Warn.noRecoveries"));
    await this.update({ "system.recoveries.value": sys.recoveries.value - 1, "system.hp.value": sys.hp.max });
    return this._chatNote(game.i18n.format("BEACON.Chat.spentRecovery", { name: this.name }));
  }

  async _chatNote(text) {
    return ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this }),
      content: `<div class="beacon-card small"><p>${text}</p></div>`
    });
  }

  async _clearConditions(keep = ["bloodied", "breaking", "dead"]) {
    for (const id of Array.from(this.statuses)) {
      if (!keep.includes(id)) await this.toggleStatusEffect(id, { active: false });
    }
  }

  async _restoreItems({ full = false } = {}) {
    const updates = this.items.filter(i => i.type === "ability").map(i => {
      const u = { _id: i.id, "system.loaded": true, "system.charged": true };
      if (full) {
        u["system.destroyed"] = false;
        if (i.system.usesType !== "none") u["system.uses.value"] = i.system.uses.max;
      }
      return u;
    });
    if (updates.length) await this.updateEmbeddedDocuments("Item", updates);
  }

  async shortRest() {
    await this.update({
      "system.stress.value": 0,
      "system.mp.value": this.system.mp.max,
      "system.discord": 0,
      "system.focus": 0,
      "system.tempHp": 0
    });
    await this._restoreItems();
    await this._clearConditions();
    return this._chatNote(game.i18n.format("BEACON.Chat.shortRest", { name: this.name }));
  }

  async longRest() {
    const sys = this.system;
    await this.update({
      "system.lostMana": 0,
      "system.wounds.value": 0,
      "system.overstress.value": 0,
      "system.stress.value": 0,
      "system.discord": 0,
      "system.focus": 0,
      "system.tempHp": 0,
      "system.surge": 0,
      "system.limitBreakUsed": false,
      "system.recoveries.value": sys.attributes.recoveries ?? 0
    });
    await this.update({ "system.hp.value": this.system.hp.max, "system.mp.value": this.system.mp.max });
    await this._restoreItems({ full: true });
    await this._clearConditions([]);
    return this._chatNote(game.i18n.format("BEACON.Chat.longRest", { name: this.name }));
  }

  async surge() {
    const level = this.system.surge ?? 0;
    const formula = CONFIG.BEACON.surgeCost[Math.clamp(level, 0, 3)];
    const roll = await new Roll(formula).evaluate();
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this }),
      rolls: [roll],
      content: `<div class="beacon-card"><header class="card-header"><h3>${t("BEACON.Combat.surge")} (${t("BEACON.Combat.surgeLevel")} ${level})</h3></header>${await roll.render()}<p>${game.i18n.format("BEACON.Chat.surge", { name: this.name, amount: roll.total })}</p></div>`
    });
    await this.update({ "system.surge": Math.min(3, level + 1) });
    await this.applyStress(roll.total, { silent: true });
  }

  async defend() {
    const roll = await new Roll(`${this.system.attributes.armor} + 1d3`).evaluate();
    await this.update({ "system.focus": this.system.focus + roll.total });
    return ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this }),
      rolls: [roll],
      content: `<div class="beacon-card"><header class="card-header"><h3>${t("BEACON.Action.defend")}</h3></header>${await roll.render()}<p>${game.i18n.format("BEACON.Chat.defend", { name: this.name, amount: roll.total })}</p></div>`
    });
  }

  async refresh() {
    const isNPC = this.type === "npc";
    const first = isNPC ? "" : `
      <div class="form-group"><label>${t("BEACON.Refresh.first")}</label><select name="first">
        <option value="hp">${t("BEACON.Refresh.hp")}</option>
        <option value="stress">${t("BEACON.Refresh.stress")}</option>
        <option value="mp">${t("BEACON.Refresh.mp")}</option>
      </select></div>`;
    const content = `<div class="beacon-roll-dialog">${first}
      <div class="form-group"><label>${t("BEACON.Refresh.second")}</label><select name="second">
        <option value="reload">${t("BEACON.Refresh.reload")}</option>
        ${isNPC ? "" : `<option value="discord">${t("BEACON.Refresh.discord")}</option>`}
        <option value="condition">${t("BEACON.Refresh.condition")}</option>
      </select></div></div>`;
    let choice;
    try {
      choice = await DialogV2.prompt({
        window: { title: t("BEACON.Action.refresh") },
        content,
        rejectClose: true,
        ok: { callback: (event, button) => new foundry.applications.ux.FormDataExtended(button.form).object }
      });
    } catch {
      return null;
    }
    const sys = this.system;
    const update = {};
    const notes = [];
    if (isNPC || choice.first === "mp") {
      update["system.mp.value"] = sys.mp.max;
      notes.push(t("BEACON.Refresh.mp"));
    }
    if (choice.first === "hp") {
      if (sys.recoveries.value <= 0) return ui.notifications.warn(t("BEACON.Warn.noRecoveries"));
      update["system.recoveries.value"] = sys.recoveries.value - 1;
      update["system.hp.value"] = sys.hp.max;
      notes.push(t("BEACON.Refresh.hp"));
    }
    if (choice.first === "stress") {
      update["system.stress.value"] = 0;
      notes.push(t("BEACON.Refresh.stress"));
    }
    if (choice.second === "discord") {
      update["system.discord"] = 0;
      notes.push(t("BEACON.Refresh.discord"));
    }
    await this.update(update);
    if (choice.second === "reload") {
      await this._restoreItems();
      notes.push(t("BEACON.Refresh.reload"));
    }
    if (choice.second === "condition") notes.push(t("BEACON.Refresh.condition"));
    return this._chatNote(`<strong>${t("BEACON.Action.refresh")}</strong>: ${notes.join("; ")}`);
  }

  async discordCheck() {
    const sys = this.system;
    if (sys.discord <= 0) return ui.notifications.info(t("BEACON.Warn.noDiscord"));
    const result = await rollAbilityCheck(this, "magic", { skipDialog: true });
    if (!result) return null;
    if (result.outcome === "success") return this.update({ "system.discord": 0 });
    return this.applyDamage(sys.discord, { type: "discord", piercing: true, ongoing: true });
  }

  async rollRecharge() {
    const pending = this.items.filter(i => i.type === "ability" && i.system.recharge > 0 && !i.system.charged);
    if (!pending.length) return ui.notifications.info(t("BEACON.Warn.nothingToRecharge"));
    const roll = await new Roll("1d6").evaluate();
    const recharged = pending.filter(i => roll.total >= i.system.recharge);
    if (recharged.length) await this.updateEmbeddedDocuments("Item", recharged.map(i => ({ _id: i.id, "system.charged": true })));
    return ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this }),
      rolls: [roll],
      content: `<div class="beacon-card"><header class="card-header"><h3>${t("BEACON.NPC.recharge")}</h3></header>${await roll.render()}<p>${recharged.length ? recharged.map(i => i.name).join(", ") : "—"}</p></div>`
    });
  }

  async useLimitBreak() {
    const job = this.system.job;
    if (!job) return ui.notifications.warn(t("BEACON.Warn.noJob"));
    if (this.system.limitBreakUsed) return ui.notifications.warn(t("BEACON.Warn.limitBreakUsed"));
    const lb = job.system.limitBreak;
    const desc = await foundry.applications.ux.TextEditor.implementation.enrichHTML(lb.description, { relativeTo: job });
    await this.update({ "system.limitBreakUsed": true });
    return ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this }),
      content: `<div class="beacon-card limit-break"><header class="card-header"><h3><i class="fa-solid fa-star"></i> ${lb.name || t("BEACON.Job.limitBreak")}</h3></header>${lb.range ? `<div class="beacon-tags"><span class="tag">${lb.range}</span></div>` : ""}<div class="card-desc">${desc}</div></div>`
    });
  }
}
