export const BEACON = {};

BEACON.abilityScores = {
  bulk: "BEACON.Ability.bulk",
  agility: "BEACON.Ability.agility",
  mind: "BEACON.Ability.mind",
  magic: "BEACON.Ability.magic"
};

BEACON.phases = {
  1: { key: "bolster", label: "BEACON.Phase.bolster", icon: "fa-solid fa-shield-halved" },
  2: { key: "channel", label: "BEACON.Phase.channel", icon: "fa-solid fa-hand-sparkles" },
  3: { key: "skirmish", label: "BEACON.Phase.skirmish", icon: "fa-solid fa-crosshairs" },
  4: { key: "reposition", label: "BEACON.Phase.reposition", icon: "fa-solid fa-person-running" },
  5: { key: "brawl", label: "BEACON.Phase.brawl", icon: "fa-solid fa-hand-fist" },
  6: { key: "release", label: "BEACON.Phase.release", icon: "fa-solid fa-burst" },
  7: { key: "fullattack", label: "BEACON.Phase.fullattack", icon: "fa-solid fa-khanda" },
  8: { key: "delay", label: "BEACON.Phase.delay", icon: "fa-solid fa-hourglass-half" }
};

BEACON.actions = {
  passive: "BEACON.Action.passive",
  minor: "BEACON.Action.minor",
  free: "BEACON.Action.free",
  reaction: "BEACON.Action.reaction",
  special: "BEACON.Action.special",
  bolster: "BEACON.Action.bolster",
  defend: "BEACON.Action.defend",
  refresh: "BEACON.Action.refresh",
  channel: "BEACON.Action.channel",
  skirmish: "BEACON.Action.skirmish",
  mark: "BEACON.Action.mark",
  search: "BEACON.Action.search",
  volley: "BEACON.Action.volley",
  reposition: "BEACON.Action.reposition",
  hide: "BEACON.Action.hide",
  rush: "BEACON.Action.rush",
  brawl: "BEACON.Action.brawl",
  fight: "BEACON.Action.fight",
  grapple: "BEACON.Action.grapple",
  shove: "BEACON.Action.shove",
  release: "BEACON.Action.release",
  fullattack: "BEACON.Action.fullattack",
  delay: "BEACON.Action.delay",
  ready: "BEACON.Action.ready"
};

BEACON.actionPhase = {
  bolster: 1, defend: 1, refresh: 1,
  channel: 2,
  skirmish: 3, mark: 3, search: 3, volley: 3,
  reposition: 4, hide: 4, rush: 4,
  brawl: 5, fight: 5, grapple: 5, shove: 5,
  release: 6,
  fullattack: 7,
  delay: 8
};

BEACON.abilityCategories = {
  weapon: "BEACON.Category.weapon",
  support: "BEACON.Category.support",
  spell: "BEACON.Category.spell",
  skill: "BEACON.Category.skill",
  trait: "BEACON.Category.trait",
  limitbreak: "BEACON.Category.limitbreak"
};

BEACON.attackTypes = {
  none: "BEACON.Attack.none",
  melee: "BEACON.Attack.melee",
  ranged: "BEACON.Attack.ranged",
  auto: "BEACON.Attack.auto"
};

BEACON.defenses = {
  dodge: "BEACON.Attr.dodge",
  adef: "BEACON.Attr.adef"
};

BEACON.sizes = {
  none: "BEACON.Size.none",
  light: "BEACON.Size.light",
  main: "BEACON.Size.main",
  heavy: "BEACON.Size.heavy"
};

BEACON.weaponTypes = {
  none: "BEACON.WeaponType.none",
  artifact: "BEACON.WeaponType.artifact",
  blade: "BEACON.WeaponType.blade",
  bow: "BEACON.WeaponType.bow",
  club: "BEACON.WeaponType.club",
  longarm: "BEACON.WeaponType.longarm",
  magitech: "BEACON.WeaponType.magitech"
};

BEACON.damageTypes = {
  physical: "BEACON.Damage.physical",
  force: "BEACON.Damage.force",
  astral: "BEACON.Damage.astral",
  lunar: "BEACON.Damage.lunar",
  discord: "BEACON.Damage.discord",
  stress: "BEACON.Damage.stress"
};

BEACON.usesTypes = {
  none: "BEACON.Uses.none",
  limited: "BEACON.Uses.limited",
  consumable: "BEACON.Uses.consumable"
};

BEACON.roles = {
  artillery: "BEACON.Role.artillery",
  controller: "BEACON.Role.controller",
  defender: "BEACON.Role.defender",
  striker: "BEACON.Role.striker",
  support: "BEACON.Role.support"
};

BEACON.characterSizes = {
  "0.5": "1/2",
  "1": "1",
  "2": "2",
  "3": "3",
  "4": "4"
};

BEACON.npcFeatureTypes = {
  none: "BEACON.NPCFeature.none",
  base: "BEACON.NPCFeature.base",
  extra: "BEACON.NPCFeature.extra"
};

BEACON.templateKinds = {
  mechanical: "BEACON.TemplateKind.mechanical",
  thematic: "BEACON.TemplateKind.thematic"
};

BEACON.surgeCost = ["2", "1d3+1", "1d6+2", "1d6+4"];

BEACON.woundTable = {
  3: [[5, 6, "dazed"], [3, 4, "brokenWeapon"], [1, 2, "brokenSupport"]],
  2: [[6, 6, "dazed"], [4, 5, "brokenWeapon"], [2, 3, "brokenSupport"], [1, 1, "staggered"]],
  1: [[5, 6, "brokenWeapon"], [3, 4, "brokenSupport"], [1, 2, "staggered"]]
};

BEACON.overstressTable = {
  3: [[5, 6, "dazed"], [3, 4, "brokenTech"], [1, 2, "lostMana"]],
  2: [[6, 6, "dazed"], [4, 5, "brokenTech"], [2, 3, "lostMana"], [1, 1, "exposed"]],
  1: [[5, 6, "brokenTech"], [3, 4, "lostMana"], [1, 2, "exposed"]]
};

BEACON.conditions = [
  { id: "blinded", img: "icons/svg/blind.svg" },
  { id: "dazed", img: "icons/svg/daze.svg" },
  { id: "disarmed", img: "icons/svg/sword.svg" },
  { id: "immobilized", img: "icons/svg/net.svg" },
  { id: "marked", img: "icons/svg/target.svg" },
  { id: "silenced", img: "icons/svg/silenced.svg" },
  { id: "slowed", img: "icons/svg/clockwork.svg" },
  { id: "stunned", img: "icons/svg/lightning.svg" },
  { id: "sundered", img: "icons/svg/degen.svg" },
  { id: "vulnerable", img: "icons/svg/acid.svg" },
  { id: "weakened", img: "icons/svg/downgrade.svg" }
];

BEACON.statuses = [
  { id: "bloodied", img: "icons/svg/blood.svg" },
  { id: "breaking", img: "icons/svg/terror.svg" },
  { id: "engaged", img: "icons/svg/combat.svg" },
  { id: "flying", img: "icons/svg/wing.svg" },
  { id: "grappled", img: "icons/svg/padlock.svg" },
  { id: "hidden", img: "icons/svg/mystery-man.svg" },
  { id: "invisible", img: "icons/svg/invisible.svg" },
  { id: "prone", img: "icons/svg/falling.svg" },
  { id: "channeling", img: "icons/svg/aura.svg" },
  { id: "resistant", img: "icons/svg/shield.svg" }
];

export function tiered(value, tier = 1) {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (!str.includes("/")) return str;
  return str.replace(/(-?[\w+]+(?:\/-?[\w+]+){2})/g, match => {
    const parts = match.split("/");
    return parts[Math.clamp((tier ?? 1) - 1, 0, parts.length - 1)];
  });
}

export function parseTag(tags, name) {
  const match = String(tags ?? "").match(new RegExp(`(?:^|,)\\s*${name}\\s*(\\d+)?`, "i"));
  if (!match) return null;
  return match[1] !== undefined ? Number(match[1]) : true;
}
