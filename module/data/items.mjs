import { parseTag } from "../config.mjs";

const { fields } = foundry.data;

const int = (initial = 0, opts = {}) => new fields.NumberField({ required: true, nullable: false, integer: true, initial, ...opts });
const str = (initial = "") => new fields.StringField({ initial });
const html = () => new fields.HTMLField({ initial: "" });
const bool = (initial = false) => new fields.BooleanField({ initial });

export class AbilityData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      category: str("weapon"),
      action: str("fight"),
      attack: str("none"),
      defense: str("dodge"),
      size: str("none"),
      weaponType: str("none"),
      tags: str(),
      range: str(),
      attackBonus: str(),
      damage: str(),
      damageType: str("physical"),
      memory: int(0, { min: 0 }),
      mana: int(0, { min: 0 }),
      focus: int(0, { min: 0 }),
      stressful: int(0, { min: 0 }),
      armor: int(0),
      usesType: str("none"),
      uses: new fields.SchemaField({ value: int(0, { min: 0 }), max: int(0, { min: 0 }) }),
      reloading: bool(),
      loaded: bool(true),
      recharge: int(0, { min: 0, max: 6 }),
      charged: bool(true),
      equipped: bool(false),
      free: bool(false),
      destroyed: bool(false),
      source: str(),
      rank: int(0, { min: 0, max: 3 }),
      rarity: str(),
      npcFeature: str("none"),
      description: html()
    };
  }

  get isTechnique() {
    return ["spell", "skill"].includes(this.category);
  }

  get isEquipment() {
    return ["weapon", "support"].includes(this.category);
  }

  get hasAttack() {
    return this.attack !== "none";
  }

  get targetDefense() {
    return parseTag(this.tags, "Aetheric") ? "adef" : this.defense;
  }

  get manaCost() {
    return this.mana || Number(parseTag(this.tags, "Mana") || 0);
  }

  get focusCost() {
    return this.focus || Number(parseTag(this.tags, "Focus") || 0);
  }

  get stressCost() {
    return this.stressful || Number(parseTag(this.tags, "Stressful") || 0);
  }

  get isPiercing() {
    return this.damageType === "discord" || !!parseTag(this.tags, "Piercing");
  }

  get reliable() {
    return Number(parseTag(this.tags, "Reliable") || 0);
  }

  get isSlow() {
    return !!parseTag(this.tags, "Slow");
  }

  get phase() {
    return CONFIG.BEACON.actionPhase[this.action] ?? null;
  }
}

export class JobData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      role: str("striker"),
      className: str(),
      equipped: bool(false),
      scope: int(10),
      saveTarget: int(10),
      hp: int(6),
      recoveries: int(3),
      dodge: int(8),
      speed: int(4),
      stressCap: int(6),
      memory: int(6),
      adef: int(8),
      mp: int(3),
      weaponSlots: str("Main, Light"),
      supportSlots: str("Main, Light"),
      traits: html(),
      limitBreak: new fields.SchemaField({ name: str(), range: str(), description: html() }),
      description: html()
    };
  }
}

export class ClassData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      rank: int(1, { min: 0, max: 3 }),
      role: str("striker"),
      jobName: str(),
      abilities: html(),
      description: html()
    };
  }
}

const talentRank = () => new fields.SchemaField({ name: str(), description: html() });

export class TalentData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      rank: int(1, { min: 1, max: 3 }),
      rank1: talentRank(),
      rank2: talentRank(),
      rank3: talentRank(),
      description: html()
    };
  }
}

export class AncestryData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      size: str("1"),
      traits: html(),
      description: html()
    };
  }
}

export class SupplyData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      quantity: int(1, { min: 0 }),
      equipped: bool(false),
      cost: int(0, { min: 0 }),
      description: html()
    };
  }
}

export class TemplateData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      kind: str("thematic"),
      description: html()
    };
  }
}
