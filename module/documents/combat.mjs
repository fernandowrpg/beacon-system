const { DialogV2 } = foundry.applications.api;
const t = k => game.i18n.localize(k);

export async function promptPhase(name) {
  const buttons = Object.entries(CONFIG.BEACON.phases).map(([n, p]) => ({
    action: n,
    label: `${n}. ${t(p.label)}`,
    icon: p.icon,
    callback: () => Number(n)
  }));
  try {
    return await DialogV2.wait({
      window: { title: game.i18n.format("BEACON.Combat.choosePhase", { name }) },
      classes: ["beacon-phase-dialog"],
      content: `<p>${t("BEACON.Combat.choosePhaseHint")}</p>`,
      buttons,
      rejectClose: true
    });
  } catch {
    return null;
  }
}

export function phaseLabel(n) {
  const p = CONFIG.BEACON.phases[n];
  return p ? t(p.label) : "";
}

export class BeaconCombat extends Combat {
  _sortCombatants(a, b) {
    const ia = Number.isFinite(a.initiative) ? a.initiative : 99;
    const ib = Number.isFinite(b.initiative) ? b.initiative : 99;
    if (ia !== ib) return ia - ib;
    const pa = a.actor?.type === "beacon" || a.hasPlayerOwner ? 0 : 1;
    const pb = b.actor?.type === "beacon" || b.hasPlayerOwner ? 0 : 1;
    if (pa !== pb) return pa - pb;
    return (a.name ?? "").localeCompare(b.name ?? "") || a.id.localeCompare(b.id);
  }

  get currentPhase() {
    return this.combatant?.initiative ?? null;
  }

  async rollInitiative(ids, { updateTurn = true } = {}) {
    ids = typeof ids === "string" ? [ids] : Array.from(ids ?? []);
    const currentId = this.combatant?.id;
    const updates = [];
    const extra = [];
    for (const id of ids) {
      const combatant = this.combatants.get(id);
      if (!combatant?.isOwner) continue;
      const actor = combatant.actor;
      let value;
      if (actor?.type === "npc") {
        const base = actor.system.attributes.initiative;
        const turnIndex = combatant.getFlag("beacon", "turnIndex") ?? 0;
        value = Math.min(8, base + 5 * turnIndex);
        const turns = actor.system.turns ?? 1;
        const siblings = this.combatants.filter(c => c.tokenId === combatant.tokenId && c.actorId === combatant.actorId);
        if (turnIndex === 0 && turns > siblings.length && game.user.isGM) {
          for (let k = siblings.length; k < turns; k++) {
            extra.push({
              tokenId: combatant.tokenId,
              sceneId: combatant.sceneId,
              actorId: combatant.actorId,
              hidden: combatant.hidden,
              initiative: Math.min(8, base + 5 * k),
              flags: { beacon: { turnIndex: k } }
            });
          }
        }
      } else {
        value = await promptPhase(combatant.name);
      }
      if (value === null || value === undefined) continue;
      updates.push({ _id: id, initiative: value });
    }
    if (updates.length) await this.updateEmbeddedDocuments("Combatant", updates);
    if (extra.length) await this.createEmbeddedDocuments("Combatant", extra);
    if (updateTurn && currentId) {
      const turn = this.turns.findIndex(c => c.id === currentId);
      if (turn >= 0 && turn !== this.turn) await this.update({ turn });
    }
    return this;
  }

  async nextRound() {
    const result = await super.nextRound();
    if (game.user.isGM && game.settings.get("beacon", "resetPhases")) {
      const updates = this.combatants
        .filter(c => c.actor?.type === "beacon")
        .map(c => ({ _id: c.id, initiative: null }));
      if (updates.length) await this.updateEmbeddedDocuments("Combatant", updates);
      await this.update({ turn: 0 });
    }
    return result;
  }
}

export function onRenderCombatTracker(app, html) {
  const root = html instanceof HTMLElement ? html : html?.[0];
  const combat = app.viewed ?? game.combat;
  if (!root || !combat) return;
  for (const li of root.querySelectorAll("[data-combatant-id]")) {
    const combatant = combat.combatants.get(li.dataset.combatantId);
    if (!combatant || !Number.isFinite(combatant.initiative)) continue;
    const span = li.querySelector(".token-initiative .initiative") ?? li.querySelector(".initiative");
    if (!span) continue;
    const phase = CONFIG.BEACON.phases[combatant.initiative];
    if (!phase) continue;
    span.innerHTML = `<i class="${phase.icon}"></i>`;
    span.title = `${combatant.initiative}. ${t(phase.label)}`;
    span.classList.add("beacon-phase");
  }
  const phase = CONFIG.BEACON.phases[combat.currentPhase];
  const header = root.querySelector(".encounter-title, .combat-tracker-header h4, header .encounter");
  if (phase && header && !root.querySelector(".beacon-current-phase")) {
    header.insertAdjacentHTML("afterend", `<div class="beacon-current-phase"><i class="${phase.icon}"></i> ${t("BEACON.Combat.phase")} ${combat.currentPhase}: ${t(phase.label)}</div>`);
  }
}
