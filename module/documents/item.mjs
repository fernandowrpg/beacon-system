import { tiered } from "../config.mjs";
import { rollAttack } from "../rolls.mjs";

const t = k => game.i18n.localize(k);

export class BeaconItem extends Item {
  get tier() {
    return this.actor?.type === "npc" ? this.actor.system.tier : 1;
  }

  tagList() {
    const s = this.system;
    const tags = [];
    if (s.category) tags.push(t(CONFIG.BEACON.abilityCategories[s.category] ?? s.category));
    if (s.size && s.size !== "none") tags.push(t(CONFIG.BEACON.sizes[s.size]));
    if (s.weaponType && s.weaponType !== "none") tags.push(t(CONFIG.BEACON.weaponTypes[s.weaponType]));
    if (s.memory) tags.push(`${s.memory} ${t("BEACON.Attr.memory")}`);
    if (s.armor) tags.push(`+${s.armor} ${t("BEACON.Attr.armor")}`);
    for (const tag of String(s.tags ?? "").split(",").map(x => x.trim()).filter(Boolean)) tags.push(tiered(tag, this.tier));
    if (s.recharge) tags.push(`${t("BEACON.NPC.recharge")} ${s.recharge}+`);
    return tags;
  }

  async _cardHeader() {
    const s = this.system;
    const enrich = foundry.applications.ux.TextEditor.implementation.enrichHTML;
    const desc = await enrich(s.description ?? "", { relativeTo: this, rollData: this.actor?.getRollData?.() ?? {} });
    const action = s.action ? t(CONFIG.BEACON.actions[s.action] ?? s.action) : "";
    const phase = CONFIG.BEACON.phases[s.phase];
    const line = [
      action ? `<span class="act"><i class="${phase?.icon ?? "fa-solid fa-bolt"}"></i> ${action}</span>` : "",
      s.range ? `<span class="rng">${tiered(s.range, this.tier)}</span>` : "",
      s.damage ? `<span class="dmg dmg-${s.damageType}">${tiered(s.damage, this.tier)} ${t(CONFIG.BEACON.damageTypes[s.damageType] ?? "")}</span>` : ""
    ].join("");
    return `
      <header class="card-header"><img src="${this.img}" alt=""><h3>${this.name}</h3></header>
      <div class="beacon-tags">${this.tagList().map(x => `<span class="tag">${x}</span>`).join("")}</div>
      ${line ? `<div class="beacon-line">${line}</div>` : ""}
      ${desc ? `<div class="card-desc">${desc}</div>` : ""}`;
  }

  async toChat() {
    return ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: `<div class="beacon-card">${await this._cardHeader()}</div>`
    });
  }

  async _payCosts() {
    const s = this.system;
    const actor = this.actor;
    if (!actor) return true;
    const update = {};
    const itemUpdate = {};
    if (s.destroyed) {
      ui.notifications.warn(game.i18n.format("BEACON.Warn.destroyed", { name: this.name }));
      return false;
    }
    if (s.reloading && !s.loaded) {
      ui.notifications.warn(game.i18n.format("BEACON.Warn.unloaded", { name: this.name }));
      return false;
    }
    if (s.recharge && !s.charged) {
      ui.notifications.warn(game.i18n.format("BEACON.Warn.notCharged", { name: this.name }));
      return false;
    }
    if (s.usesType !== "none" && s.uses.max > 0) {
      if (s.uses.value <= 0) {
        ui.notifications.warn(game.i18n.format("BEACON.Warn.noUses", { name: this.name }));
        return false;
      }
      itemUpdate["system.uses.value"] = s.uses.value - 1;
    }
    if (s.category === "spell" && actor.statuses.has("silenced")) {
      ui.notifications.warn(t("BEACON.Warn.silenced"));
      return false;
    }
    const mana = s.manaCost;
    if (mana) {
      if (actor.system.mp.value < mana) {
        ui.notifications.warn(game.i18n.format("BEACON.Warn.noMP", { cost: mana }));
        return false;
      }
      update["system.mp.value"] = actor.system.mp.value - mana;
    }
    const focus = s.focusCost;
    if (focus) {
      if (actor.system.focus < focus) {
        ui.notifications.warn(game.i18n.format("BEACON.Warn.noFocus", { cost: focus }));
        return false;
      }
      update["system.focus"] = actor.system.focus - focus;
    }
    if (s.reloading) itemUpdate["system.loaded"] = false;
    if (s.recharge) itemUpdate["system.charged"] = false;
    if (!foundry.utils.isEmpty(update)) await actor.update(update);
    if (!foundry.utils.isEmpty(itemUpdate)) await this.update(itemUpdate);
    if (s.stressCost) await actor.applyStress(s.stressCost, { silent: true });
    return true;
  }

  async use({ skipDialog = false } = {}) {
    if (this.type !== "ability") return this.toChat();
    const s = this.system;
    const actor = this.actor;
    let attack = null;
    if (s.hasAttack) {
      attack = await rollAttack(actor, this, { skipDialog });
      if (!attack) return null;
    }
    if (!(await this._payCosts())) return null;

    const rolls = [];
    let rows = "";
    let anyHit = false;
    let anyCrit = false;
    if (attack) {
      const defLabel = t(CONFIG.BEACON.defenses[attack.defense]);
      for (const r of attack.results) {
        if (r.roll) rolls.push(r.roll);
        if (["hit", "crit", "unknown"].includes(r.outcome)) anyHit = true;
        if (r.outcome === "crit") anyCrit = true;
        const vs = r.def !== null && r.def !== undefined ? `<span class="vs">${defLabel} ${r.def}</span>` : "";
        const dist = r.distance !== null && r.distance !== undefined
          ? `<span class="vs dist">${r.distance}${r.maxRange !== null ? `/${r.maxRange}` : ""} ${t("BEACON.Ruler.spaces")}</span>`
          : "";
        const range = r.outOfRange ? `<div class="beacon-range-warn"><i class="fa-solid fa-triangle-exclamation"></i> ${t("BEACON.Ruler.outOfRange")}</div>` : "";
        const rollHTML = r.roll && !r.invisible ? await r.roll.render() : "";
        rows += `<div class="beacon-attack-row">
          ${r.name ? `<div class="target-name">${foundry.utils.escapeHTML(r.name)} ${vs} ${dist}</div>` : ""}
          ${range}
          ${rollHTML}
          <div class="beacon-outcome ${r.outcome}">${t(`BEACON.Outcome.${r.invisible ? "invisibleMiss" : r.outcome}`)}</div>
        </div>`;
      }
    }
    const reliable = s.reliable;
    let buttons = "";
    if (s.damage) {
      const id = `data-actor-uuid="${actor?.uuid ?? ""}" data-item-id="${this.id}"`;
      if (!attack || anyHit) buttons += `<button type="button" data-beacon-action="damage" ${id}><i class="fa-solid fa-burst"></i> ${t("BEACON.Chat.rollDamage")}</button>`;
      if (anyCrit) buttons += `<button type="button" data-beacon-action="damage" data-crit="1" ${id}><i class="fa-solid fa-star"></i> ${t("BEACON.Chat.rollCritDamage")}</button>`;
      if (attack && reliable) buttons += `<button type="button" data-beacon-action="reliable" data-amount="${reliable}" ${id}><i class="fa-solid fa-shield"></i> ${t("BEACON.Chat.reliable")} ${reliable}</button>`;
    }
    const content = `<div class="beacon-card">
      ${await this._cardHeader()}
      ${rows ? `<div class="beacon-attacks">${rows}</div>` : ""}
      ${buttons ? `<div class="beacon-buttons">${buttons}</div>` : ""}
    </div>`;
    return ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }), content, rolls });
  }
}
