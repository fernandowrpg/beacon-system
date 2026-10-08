import { tiered } from "./config.mjs";
import { abilityReach, sourceToken, tokenDistance } from "./canvas/distance.mjs";

const { DialogV2 } = foundry.applications.api;

export function accuracyFormula(accuracy = 0, difficulty = 0) {
  const net = Math.clamp(accuracy - difficulty, -6, 6);
  if (net > 0) return ` + ${net}d6kh`;
  if (net < 0) return ` - ${-net}d6kh`;
  return "";
}

export function signed(n) {
  n = Number(n) || 0;
  return n >= 0 ? `+ ${n}` : `- ${Math.abs(n)}`;
}

export function critFormula(formula) {
  return String(formula).replace(/(\d*)d(\d+)(?!\d*k)/gi, (m, n, f) => {
    n = Number(n || 1);
    return `${n * 2}d${f}kh${n}`;
  });
}

export async function promptRollOptions({ title, accuracy = 0, difficulty = 0, bonus = 0, target = null, extra = "" }) {
  const t = k => game.i18n.localize(k);
  const content = `
    <div class="beacon-roll-dialog">
      <div class="form-group"><label>${t("BEACON.Roll.accuracy")}</label><input type="number" name="accuracy" value="${accuracy}" min="0" max="6"></div>
      <div class="form-group"><label>${t("BEACON.Roll.difficulty")}</label><input type="number" name="difficulty" value="${difficulty}" min="0" max="6"></div>
      <div class="form-group"><label>${t("BEACON.Roll.bonus")}</label><input type="number" name="bonus" value="${bonus}"></div>
      ${target !== null ? `<div class="form-group"><label>${t("BEACON.Roll.target")}</label><input type="number" name="target" value="${target}"></div>` : ""}
      ${extra}
    </div>`;
  try {
    return await DialogV2.prompt({
      window: { title },
      content,
      rejectClose: true,
      ok: {
        label: t("BEACON.Roll.roll"),
        icon: "fa-solid fa-dice-d20",
        callback: (event, button) => new foundry.applications.ux.FormDataExtended(button.form).object
      }
    });
  } catch {
    return null;
  }
}

function speakerFor(actor) {
  return ChatMessage.getSpeaker({ actor });
}

export function d20Outcome(total, target) {
  if (total >= 20) return "crit";
  return total >= target ? "hit" : "miss";
}

function outcomeLabel(outcome) {
  return game.i18n.localize(`BEACON.Outcome.${outcome}`);
}

export async function rollD20({ actor, title, modifier = 0, accuracy = 0, difficulty = 0, bonus = 0, target = 10, kind = "check", skipDialog = false, extraFlavor = "" }) {
  if (kind !== "skill" && actor?.statuses?.has("dazed")) difficulty += 1;
  let opts = { accuracy, difficulty, bonus, target };
  if (!skipDialog) {
    opts = await promptRollOptions({ title, accuracy, difficulty, bonus, target: kind === "skill" ? null : target });
    if (!opts) return null;
    opts.target ??= target;
  }
  const formula = `1d20 ${signed(Number(modifier) + Number(opts.bonus || 0))}${accuracyFormula(Number(opts.accuracy), Number(opts.difficulty))}`;
  const roll = await new Roll(formula).evaluate();
  const tgt = Number(opts.target ?? target);
  const outcome = kind === "skill"
    ? (roll.total >= 20 ? "crit" : roll.total >= 10 ? "hit" : "miss")
    : (roll.total >= tgt ? "success" : "failure");
  const rollHTML = await roll.render();
  const content = `
    <div class="beacon-card">
      <header class="card-header"><h3>${title}</h3></header>
      ${extraFlavor}
      ${rollHTML}
      <div class="beacon-outcome ${outcome}">${outcomeLabel(outcome)}${kind === "skill" ? "" : ` <span class="vs">(${game.i18n.localize("BEACON.Roll.vs")} ${tgt})</span>`}</div>
    </div>`;
  await ChatMessage.create({ speaker: speakerFor(actor), content, rolls: [roll] });
  return { roll, outcome };
}

export async function rollAbilityCheck(actor, ability, { save = false, skipDialog = false } = {}) {
  const label = game.i18n.localize(CONFIG.BEACON.abilityScores[ability]);
  const title = game.i18n.format(save ? "BEACON.Roll.saveTitle" : "BEACON.Roll.checkTitle", { ability: label });
  return rollD20({
    actor, title, kind: save ? "save" : "check", skipDialog,
    modifier: actor.system.abilities?.[ability] ?? 0,
    target: 10
  });
}

export async function rollSkillCheck(actor, index, { skipDialog = false } = {}) {
  const skill = actor.system.backgroundSkills?.[index];
  const t = k => game.i18n.localize(k);
  const skills = actor.system.backgroundSkills ?? [];
  const options = [`<option value="-1">—</option>`]
    .concat(skills.map((s, i) => `<option value="${i}" ${i === index ? "selected" : ""}>${foundry.utils.escapeHTML(s.name)} (${s.rank})</option>`))
    .join("");
  const extra = `
    <div class="form-group"><label>${t("BEACON.Narrative.backgroundSkill")}</label><select name="skill">${options}</select></div>
    <div class="form-group"><label>${t("BEACON.Narrative.invokeTitle")}</label><input type="checkbox" name="invoke"></div>`;
  let opts = { accuracy: skill?.rank ?? 0, difficulty: 0, bonus: 0, skill: index ?? -1, invoke: false };
  if (!skipDialog) {
    opts = await promptRollOptions({ title: t("BEACON.Narrative.skillCheck"), accuracy: 0, difficulty: 0, bonus: 0, extra });
    if (!opts) return null;
    const chosen = skills[Number(opts.skill)];
    if (chosen) opts.accuracy = Number(opts.accuracy) + chosen.rank;
  }
  const chosen = skills[Number(opts.skill)];
  const bonus = Number(opts.bonus || 0) + (opts.invoke ? 2 : 0);
  const flavor = [
    chosen ? `<div class="beacon-tags"><span class="tag">${foundry.utils.escapeHTML(chosen.name)} (+${chosen.rank} ${t("BEACON.Roll.accShort")})</span></div>` : "",
    opts.invoke ? `<div class="beacon-tags"><span class="tag">${foundry.utils.escapeHTML(actor.system.title || t("BEACON.Narrative.title"))} (+2)</span></div>` : ""
  ].join("");
  return rollD20({
    actor, title: t("BEACON.Narrative.skillCheck"), kind: "skill", skipDialog: true,
    accuracy: Number(opts.accuracy), difficulty: Number(opts.difficulty), bonus, extraFlavor: flavor
  });
}

export function attackModifier(actor, item) {
  if (actor?.type === "npc") {
    const raw = tiered(item.system.attackBonus, actor.system.tier).replace(/vs.*$/i, "").trim();
    return Number.parseInt(raw) || 0;
  }
  return actor?.system.grit ?? 0;
}

export function defaultAccuracy(actor, item) {
  let accuracy = 0;
  let difficulty = 0;
  const tags = String(item?.system.tags ?? "");
  if (/\bAccurate\b/i.test(tags) && !/\bInaccurate\b/i.test(tags)) accuracy += 1;
  if (/\bInaccurate\b/i.test(tags)) difficulty += 1;
  if (item?.system.attack === "ranged" && actor?.statuses?.has("engaged")) difficulty += 1;
  return { accuracy, difficulty };
}

export function targetDefense(targetActor, defense) {
  if (!targetActor?.system) return null;
  return defense === "adef" ? targetActor.system.effectiveAdef : targetActor.system.effectiveDodge;
}

export async function rollAttack(actor, item, { skipDialog = false } = {}) {
  const sys = item.system;
  const defense = sys.targetDefense;
  const modifier = attackModifier(actor, item);
  const defaults = defaultAccuracy(actor, item);
  if (actor?.statuses?.has("dazed")) defaults.difficulty += 1;
  let opts = { ...defaults, bonus: 0 };
  if (!skipDialog && sys.attack !== "auto") {
    opts = await promptRollOptions({ title: game.i18n.format("BEACON.Roll.attackTitle", { name: item.name }), ...defaults });
    if (!opts) return null;
  }
  const targets = Array.from(game.user.targets ?? []).filter(t => t.actor);
  const entries = targets.length ? targets : [null];
  const origin = sourceToken(actor);
  const maxRange = abilityReach(item, actor);
  const results = [];
  for (const token of entries) {
    const tActor = token?.actor ?? null;
    const def = tActor ? targetDefense(tActor, defense) : null;
    const distance = token && origin ? tokenDistance(origin, token) : null;
    const outOfRange = distance !== null && maxRange !== null && distance > maxRange;
    const where = { distance, maxRange, outOfRange };
    if (sys.attack === "auto") {
      results.push({ name: token?.name, outcome: "hit", def, roll: null, uuid: tActor?.uuid, ...where });
      continue;
    }
    let acc = Number(opts.accuracy);
    let dif = Number(opts.difficulty);
    if (tActor?.statuses?.has("prone")) acc += 1;
    if (tActor?.statuses?.has("invisible")) {
      const inv = await new Roll("1d6").evaluate();
      if (inv.total <= 3) {
        results.push({ name: token.name, outcome: "miss", def, roll: inv, invisible: true, uuid: tActor.uuid, ...where });
        continue;
      }
    }
    const formula = `1d20 ${signed(modifier + Number(opts.bonus || 0))}${accuracyFormula(acc, dif)}`;
    const roll = await new Roll(formula).evaluate();
    const outcome = roll.total >= 20 ? "crit" : (def === null ? "unknown" : roll.total >= def ? "hit" : "miss");
    results.push({ name: token?.name, outcome, def, roll, uuid: tActor?.uuid, ...where });
  }
  return { results, defense };
}

export async function rollDamage(actor, item, { crit = false, formula = null } = {}) {
  const sys = item?.system ?? {};
  const tier = actor?.type === "npc" ? actor.system.tier : 1;
  let base = formula ?? tiered(sys.damage, tier);
  base = String(base).trim();
  if (!base) return null;
  if (!Roll.validate(base)) {
    ui.notifications.warn(game.i18n.format("BEACON.Warn.badFormula", { formula: base }));
    return null;
  }
  let roll = new Roll(crit ? critFormula(base) : base, actor?.getRollData?.() ?? {});
  await roll.evaluate();
  let total = roll.total;
  if (actor?.statuses?.has("weakened") && !["discord", "stress"].includes(sys.damageType)) total = Math.ceil(total / 2);
  return { roll, total, type: sys.damageType ?? "physical", piercing: !!sys.isPiercing };
}

export function damageButtons(amount, type, piercing) {
  const t = k => game.i18n.localize(k);
  const data = `data-amount="${amount}" data-type="${type}" data-piercing="${piercing ? 1 : 0}"`;
  return `
    <div class="beacon-apply">
      <button type="button" data-beacon-action="apply" data-mult="1" ${data}><i class="fa-solid fa-heart-crack"></i> ${t("BEACON.Chat.apply")}</button>
      <button type="button" data-beacon-action="apply" data-mult="0.5" ${data}>½</button>
      <button type="button" data-beacon-action="apply" data-mult="2" ${data}>×2</button>
      <button type="button" data-beacon-action="apply" data-mult="-1" ${data} title="${t("BEACON.Chat.heal")}"><i class="fa-solid fa-heart"></i></button>
    </div>`;
}

export async function postDamage(actor, item, opts = {}) {
  const result = await rollDamage(actor, item, opts);
  if (!result) return null;
  const { roll, total, type, piercing } = result;
  const t = k => game.i18n.localize(k);
  const typeLabel = t(CONFIG.BEACON.damageTypes[type] ?? type);
  const weakened = actor?.statuses?.has("weakened") && total !== roll.total;
  const content = `
    <div class="beacon-card">
      <header class="card-header"><h3>${item?.name ?? t("BEACON.Chat.damage")}${opts.crit ? ` — ${t("BEACON.Outcome.crit")}` : ""}</h3></header>
      ${await roll.render()}
      <div class="beacon-damage-total dmg-${type}">${total} ${typeLabel}${piercing && type !== "discord" ? ` (${t("BEACON.Chat.piercing")})` : ""}${weakened ? ` <em>(${t("BEACON.Condition.weakened")})</em>` : ""}</div>
      ${damageButtons(total, type, piercing)}
    </div>`;
  await ChatMessage.create({ speaker: speakerFor(actor), content, rolls: [roll] });
  return result;
}
