const { fields } = foundry.data;

const int = (initial = 0, opts = {}) => new fields.NumberField({ required: true, nullable: false, integer: true, initial, ...opts });
const pool = (value = 0, max = 0) => new fields.SchemaField({ value: int(value), max: int(max) });
const scores = (min = -6, max = 6) => new fields.SchemaField({
  bulk: int(0, { min, max }),
  agility: int(0, { min, max }),
  mind: int(0, { min, max }),
  magic: int(0, { min, max })
});

class BeaconActorBase extends foundry.abstract.TypeDataModel {
  static defineCommonSchema() {
    return {
      hp: pool(0, 0),
      stress: pool(0, 0),
      mp: pool(0, 0),
      wounds: pool(0, 4),
      overstress: pool(0, 4),
      tempHp: int(0, { min: 0 }),
      focus: int(0, { min: 0 }),
      discord: int(0, { min: 0 }),
      resistances: new fields.StringField({ initial: "" }),
      immunities: new fields.StringField({ initial: "" }),
      vulnerabilities: new fields.StringField({ initial: "" })
    };
  }

  get isBloodied() {
    return this.hp.value <= this.attributes.bloodied;
  }

  get isBreaking() {
    return this.attributes.stressCap > 0 && this.stress.value >= this.attributes.breaking;
  }

  get effectiveDodge() {
    return this.parent.statuses?.has("stunned") ? 5 : this.attributes.dodge;
  }

  get effectiveAdef() {
    return this.parent.statuses?.has("stunned") ? 5 : this.attributes.adef;
  }

  finalizeDerived() {
    const a = this.attributes;
    a.armor = Math.clamp(a.armor, 0, 4);
    a.bloodied = Math.ceil(a.hp / 2);
    a.breaking = Math.ceil(a.stressCap / 2);
    this.hp.max = a.hp;
    this.stress.max = a.stressCap;
    this.mp.max = Math.max(0, a.mp - (this.lostMana ?? 0));
    this.hp.value = Math.clamp(this.hp.value, 0, this.hp.max);
    this.mp.value = Math.clamp(this.mp.value, 0, this.mp.max);
  }
}

export class BeaconCharacterData extends BeaconActorBase {
  static LOCALIZATION_PREFIXES = ["BEACON.Actor"];

  static defineSchema() {
    const bonus = () => int(0);
    return {
      ...this.defineCommonSchema(),
      level: int(1, { min: 1, max: 12 }),
      title: new fields.StringField({ initial: "" }),
      abilities: scores(0, 6),
      recoveries: pool(0, 0),
      surge: int(0, { min: 0, max: 3 }),
      lostMana: int(0, { min: 0 }),
      gold: int(0, { min: 0 }),
      residuum: int(0, { min: 0 }),
      limitBreakUsed: new fields.BooleanField({ initial: false }),
      backgroundSkills: new fields.ArrayField(new fields.SchemaField({
        name: new fields.StringField({ initial: "" }),
        rank: int(1, { min: 1, max: 3 })
      })),
      bonuses: new fields.SchemaField({
        hp: bonus(), recoveries: bonus(), dodge: bonus(), speed: bonus(), stressCap: bonus(),
        memory: bonus(), adef: bonus(), mp: bonus(), scope: bonus(), saveTarget: bonus(), armor: bonus()
      }),
      biography: new fields.HTMLField({ initial: "" }),
      notes: new fields.HTMLField({ initial: "" })
    };
  }

  prepareDerivedData() {
    const items = this.parent.items;
    const job = items.find(i => i.type === "job" && i.system.equipped) ?? null;
    const ancestry = items.find(i => i.type === "ancestry") ?? null;
    const base = job?.system ?? {};
    const ab = this.abilities;
    const b = this.bonuses;
    const grit = Math.floor(this.level / 2);
    this.grit = grit;
    this.job = job;
    this.ancestry = ancestry;
    this.size = ancestry?.system.size ?? "1";

    const equipped = items.filter(i => i.type === "ability" && i.system.equipped && !i.system.destroyed);
    const armorItems = equipped.reduce((t, i) => t + (i.system.armor ?? 0), 0);

    this.attributes = {
      scope: (base.scope ?? 0) + b.scope,
      saveTarget: (base.saveTarget ?? 10) + grit + b.saveTarget,
      hp: (base.hp ?? 0) + 2 * ab.bulk + grit + b.hp,
      recoveries: (base.recoveries ?? 0) + Math.floor(ab.bulk / 2) + b.recoveries,
      dodge: (base.dodge ?? 0) + ab.agility + b.dodge,
      speed: (base.speed ?? 0) + Math.floor(ab.agility / 2) + b.speed,
      stressCap: (base.stressCap ?? 0) + ab.mind + b.stressCap,
      memory: (base.memory ?? 0) + Math.floor(ab.mind / 2) + grit + b.memory,
      adef: (base.adef ?? 0) + ab.magic + b.adef,
      mp: (base.mp ?? 0) + Math.floor(ab.magic / 2) + b.mp,
      armor: armorItems + b.armor,
      woundCap: this.wounds.max,
      overstressCap: this.overstress.max
    };

    this.memoryUsed = equipped
      .filter(i => ["spell", "skill"].includes(i.system.category) && !i.system.free)
      .reduce((t, i) => t + (i.system.memory ?? 0), 0);
    this.recoveries.max = this.attributes.recoveries;
    this.recoveries.value = Math.clamp(this.recoveries.value, 0, this.recoveries.max);
    this.classRanks = items.filter(i => i.type === "class").reduce((t, i) => t + i.system.rank, 0);
    this.talentRanks = items.filter(i => i.type === "talent").reduce((t, i) => t + i.system.rank, 0);
    this.finalizeDerived();
  }

  getRollData() {
    return { ...this.abilities, grit: this.grit, level: this.level, ...this.attributes };
  }
}

const tierStats = () => new fields.SchemaField({
  saveTarget: int(10),
  armor: int(0, { min: 0 }),
  scope: int(5),
  initiative: int(4, { min: 1, max: 8 }),
  hp: int(10, { min: 0 }),
  stressCap: int(6, { min: 0 }),
  dodge: int(10),
  adef: int(8),
  speed: int(4, { min: 0 }),
  mp: int(0, { min: 0 }),
  bulk: int(0),
  agility: int(0),
  mind: int(0),
  magic: int(0)
});

export class BeaconNPCData extends BeaconActorBase {
  static LOCALIZATION_PREFIXES = ["BEACON.Actor"];

  static defineSchema() {
    const schema = this.defineCommonSchema();
    schema.wounds = pool(0, 1);
    schema.overstress = pool(0, 1);
    return {
      ...schema,
      tier: int(1, { min: 1, max: 3 }),
      role: new fields.StringField({ initial: "striker" }),
      npcType: new fields.StringField({ initial: "" }),
      size: new fields.StringField({ initial: "1" }),
      turns: int(1, { min: 1, max: 4 }),
      templates: new fields.StringField({ initial: "" }),
      isSummon: new fields.BooleanField({ initial: false }),
      tiers: new fields.SchemaField({ 1: tierStats(), 2: tierStats(), 3: tierStats() }),
      description: new fields.HTMLField({ initial: "" })
    };
  }

  prepareDerivedData() {
    const t = this.tiers[this.tier];
    this.abilities = { bulk: t.bulk, agility: t.agility, mind: t.mind, magic: t.magic };
    this.grit = 0;
    this.attributes = {
      scope: t.scope,
      saveTarget: t.saveTarget,
      initiative: t.initiative,
      hp: t.hp,
      dodge: t.dodge,
      speed: t.speed,
      stressCap: t.stressCap,
      adef: t.adef,
      mp: t.mp,
      armor: t.armor,
      woundCap: this.wounds.max,
      overstressCap: this.overstress.max
    };
    this.finalizeDerived();
  }

  getRollData() {
    return { ...this.abilities, tier: this.tier, ...this.attributes };
  }
}
