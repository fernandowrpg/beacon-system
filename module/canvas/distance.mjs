import { tiered } from "../config.mjs";

export function occupiedOffsets(token) {
  const doc = token?.document ?? token;
  if (!doc || !canvas?.grid) return [];
  if (typeof doc.getOccupiedGridSpaceOffsets === "function") {
    const offsets = doc.getOccupiedGridSpaceOffsets();
    if (offsets?.length) return offsets;
  }
  const size = canvas.grid.size;
  if (doc.width < 1 || doc.height < 1) {
    return [canvas.grid.getOffset({ x: doc.x + (doc.width * size) / 2, y: doc.y + (doc.height * size) / 2 })];
  }
  const w = Math.max(1, doc.width) * size;
  const h = Math.max(1, doc.height) * size;
  const step = size / 2;
  const seen = new Map();
  for (let x = doc.x + step / 2; x < doc.x + w; x += step) {
    for (let y = doc.y + step / 2; y < doc.y + h; y += step) {
      const o = canvas.grid.getOffset({ x, y });
      seen.set(`${o.i},${o.j}`, o);
    }
  }
  return Array.from(seen.values());
}

function pathSpaces(a, b) {
  const result = canvas.grid.measurePath([a, b]);
  if (Number.isFinite(result.spaces)) return result.spaces;
  return Math.round(result.distance / canvas.grid.distance);
}

export function tokenDistance(source, target) {
  if (!source || !target || !canvas?.grid) return null;
  const from = occupiedOffsets(source);
  const to = occupiedOffsets(target);
  if (!from.length || !to.length) return null;
  const toKeys = new Set(to.map(o => `${o.i},${o.j}`));
  if (from.some(o => toKeys.has(`${o.i},${o.j}`))) return 0;
  let best = Infinity;
  for (const a of from) {
    const pa = canvas.grid.getCenterPoint(a);
    for (const b of to) {
      const d = pathSpaces(pa, canvas.grid.getCenterPoint(b));
      if (d < best) best = d;
      if (best <= 1) return best;
    }
  }
  return Number.isFinite(best) ? best : null;
}

export function abilityReach(item, actor) {
  const s = item?.system;
  if (!s) return null;
  const tier = actor?.type === "npc" ? actor.system.tier : 1;
  const text = `${tiered(s.range, tier)}, ${tiered(s.tags, tier)}`;
  const scope = actor?.system?.attributes?.scope ?? null;
  const num = re => {
    const m = text.match(re);
    if (!m) return null;
    return m[1] ? Number(m[1]) : scope;
  };
  const range = num(/\bRange\s*(?:=\s*Scope|(\d+))/i);
  const reach = num(/\bReach\s*(\d+)/i);
  const thrown = num(/\bThrown\s*(\d+)/i);
  let max = null;
  if (s.attack === "melee") max = Math.max(reach ?? 1, thrown ?? 0);
  else if (s.attack === "ranged") max = range ?? reach;
  else max = Math.max(range ?? 0, reach ?? 0, thrown ?? 0) || null;
  return Number.isFinite(max) ? max : null;
}

export function sourceToken(actor) {
  if (!actor) return null;
  const controlled = canvas?.tokens?.controlled?.find(t => t.actor === actor);
  return controlled ?? actor.getActiveTokens?.()[0] ?? null;
}

const LABEL = "_beaconRangeLabel";

function clearLabel(token) {
  const label = token?.[LABEL];
  if (!label) return;
  label.destroy();
  token[LABEL] = null;
}

export function onHoverToken(token, hovered) {
  clearLabel(token);
  if (!hovered || !game.settings.get("beacon", "rangeLabel")) return;
  const source = canvas.tokens.controlled.find(t => t !== token);
  if (!source) return;
  const distance = tokenDistance(source, token);
  if (distance === null) return;
  const PreciseText = foundry.canvas.containers.PreciseText;
  const style = CONFIG.canvasTextStyle.clone();
  style.fontSize = Math.max(18, canvas.grid.size * 0.28);
  const text = new PreciseText(`${distance} ${game.i18n.localize("BEACON.Ruler.spaces")}`, style);
  text.anchor.set(0.5, 1);
  text.position.set(token.w / 2, -4);
  token[LABEL] = token.addChild(text);
}

export function onTokenCleanup(token) {
  clearLabel(token);
}
