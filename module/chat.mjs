import { postDamage } from "./rolls.mjs";

const t = k => game.i18n.localize(k);

function harmTargets() {
  const controlled = canvas?.tokens?.controlled ?? [];
  const tokens = controlled.length ? controlled : Array.from(game.user.targets ?? []);
  return tokens.map(tk => tk.actor).filter(Boolean);
}

async function onChatAction(event) {
  event.preventDefault();
  const btn = event.currentTarget;
  const d = btn.dataset;
  switch (d.beaconAction) {
    case "damage":
    case "reliable": {
      const actor = await fromUuid(d.actorUuid);
      const item = actor?.items.get(d.itemId);
      if (!item) return ui.notifications.warn(t("BEACON.Warn.itemMissing"));
      return postDamage(actor, item, { crit: d.crit === "1", formula: d.beaconAction === "reliable" ? d.amount : null });
    }
    case "apply": {
      const actors = harmTargets();
      if (!actors.length) return ui.notifications.warn(t("BEACON.Warn.selectToken"));
      const mult = Number(d.mult);
      const base = Number(d.amount);
      for (const actor of actors) {
        if (!actor.isOwner) {
          ui.notifications.warn(game.i18n.format("BEACON.Warn.notOwner", { name: actor.name }));
          continue;
        }
        if (mult < 0) await actor.heal(base);
        else await actor.applyDamage(Math.ceil(base * mult), { type: d.type, piercing: d.piercing === "1" });
      }
      return null;
    }
  }
  return null;
}

export function onRenderChatMessage(message, html) {
  const root = html instanceof HTMLElement ? html : html?.[0];
  if (!root) return;
  for (const btn of root.querySelectorAll("[data-beacon-action]")) {
    btn.addEventListener("click", onChatAction);
  }
}
