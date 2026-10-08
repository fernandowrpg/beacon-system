import hashlib
import json
import os
import shutil
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "data", "npcs")
SRC = os.path.join(ROOT, "packs-src")
IMPORT = os.path.join(ROOT, "import")

ROLES = {"artillery", "controller", "defender", "striker", "support"}
CATEGORY_IMG = {
    "weapon": "icons/svg/sword.svg",
    "support": "icons/svg/shield.svg",
    "spell": "icons/svg/lightning.svg",
    "skill": "icons/svg/upgrade.svg",
    "trait": "icons/svg/aura.svg",
    "limitbreak": "icons/svg/explosion.svg",
}
ROLE_IMG = {
    "artillery": "icons/svg/target.svg",
    "controller": "icons/svg/net.svg",
    "defender": "icons/svg/shield.svg",
    "striker": "icons/svg/sword.svg",
    "support": "icons/svg/heal.svg",
}
STAT_KEYS = ["saveTarget", "armor", "scope", "initiative", "hp", "stressCap", "dodge", "adef",
             "speed", "mp", "bulk", "agility", "mind", "magic"]


def make_id(*parts):
    digest = hashlib.sha1("|".join(parts).encode("utf-8")).hexdigest()
    alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    n = int(digest, 16)
    out = ""
    for _ in range(16):
        n, r = divmod(n, len(alphabet))
        out += alphabet[r]
    return out


def page_ref(page):
    return f"<p><em>Beacon Core, p. {page}.</em></p>" if page else ""


def load(name):
    path = os.path.join(DATA, name)
    if not os.path.exists(path):
        return []
    with open(path, encoding="utf-8") as fh:
        return json.load(fh)


def num(value, default=0):
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def ability(f, *, key_prefix, parent_id=None, folder=None, seed=""):
    item_id = make_id("item", seed, f.get("name", ""), str(f.get("page", "")))
    category = f.get("category", "trait")
    feature = f.get("feature", "base")
    uses_type = f.get("usesType", "none") or "none"
    doc = {
        "_id": item_id,
        "name": f.get("name", "?"),
        "type": "ability",
        "img": CATEGORY_IMG.get(category, "icons/svg/aura.svg"),
        "system": {
            "category": category,
            "action": f.get("action", "passive") or "passive",
            "attack": f.get("attack", "none") or "none",
            "defense": f.get("defense", "dodge") or "dodge",
            "size": f.get("size", "none") or "none",
            "weaponType": f.get("weaponType", "none") or "none",
            "tags": f.get("tags", "") or "",
            "range": f.get("range", "") or "",
            "attackBonus": f.get("attackBonus", "") or "",
            "damage": f.get("damage", "") or "",
            "damageType": f.get("damageType", "physical") or "physical",
            "mana": num(f.get("mana")),
            "focus": num(f.get("focus")),
            "recharge": num(f.get("recharge")),
            "usesType": uses_type,
            "uses": {"value": num(f.get("uses")), "max": num(f.get("uses"))},
            "equipped": feature != "extra",
            "npcFeature": feature if feature in ("base", "extra") else "base",
            "source": "Beacon Core",
            "description": page_ref(f.get("page")),
        },
    }
    if folder:
        doc["folder"] = folder
    doc["_key"] = f"!{key_prefix}!{parent_id + '.' if parent_id else ''}{item_id}"
    return doc


def npc_actor(n, folder):
    actor_id = make_id("actor", n["name"])
    tiers = {}
    for t in ("1", "2", "3"):
        src = n.get("tiers", {}).get(t) or n.get("tiers", {}).get("1") or {}
        tiers[t] = {k: num(src.get(k)) for k in STAT_KEYS}
        tiers[t]["initiative"] = min(8, max(1, tiers[t]["initiative"] or 4))
    role = n.get("role", "striker") if n.get("role") in ROLES else "striker"
    size = str(n.get("size", "1"))
    spaces = max(1, int(float(size))) if size.replace(".", "", 1).isdigit() else 1
    wound_cap = max(1, num(n.get("woundCap"), 1))
    over_cap = max(1, num(n.get("overstressCap"), 1))
    items = [ability(f, key_prefix="actors.items", parent_id=actor_id, seed=n["name"] + str(i))
             for i, f in enumerate(n.get("features", []))]
    return {
        "_id": actor_id,
        "_key": f"!actors!{actor_id}",
        "name": n["name"],
        "type": "npc",
        "img": ROLE_IMG.get(role, "icons/svg/mystery-man.svg"),
        "folder": folder,
        "system": {
            "tier": 1,
            "role": role,
            "npcType": n["name"].split(" — ")[0],
            "size": size,
            "turns": max(1, num(n.get("turns"), 1)),
            "tiers": tiers,
            "hp": {"value": tiers["1"]["hp"], "max": tiers["1"]["hp"]},
            "stress": {"value": 0, "max": tiers["1"]["stressCap"]},
            "mp": {"value": tiers["1"]["mp"], "max": tiers["1"]["mp"]},
            "wounds": {"value": 0, "max": wound_cap},
            "overstress": {"value": 0, "max": over_cap},
            "description": page_ref(n.get("page")),
        },
        "prototypeToken": {
            "name": n["name"],
            "width": spaces,
            "height": spaces,
            "actorLink": False,
            "disposition": -1,
            "bar1": {"attribute": "hp"},
            "bar2": {"attribute": "stress"},
        },
        "items": items,
    }


def folder_doc(name, doc_type, sort=0, parent=None):
    fid = make_id("folder", doc_type, name)
    return {"_id": fid, "_key": f"!folders!{fid}", "name": name, "type": doc_type,
            "sorting": "a", "sort": sort, "folder": parent, "color": None}


def write_pack(name, docs):
    out = os.path.join(SRC, name)
    shutil.rmtree(out, ignore_errors=True)
    os.makedirs(out)
    for doc in docs:
        safe = "".join(c if c.isalnum() else "_" for c in doc["name"]).strip("_")
        prefix = "folder_" if doc["_key"].startswith("!folders!") else ""
        with open(os.path.join(out, f"{prefix}{safe}_{doc['_id']}.json"), "w", encoding="utf-8") as fh:
            json.dump(doc, fh, ensure_ascii=False, indent=2)


def strip_keys(doc):
    if isinstance(doc, dict):
        return {k: strip_keys(v) for k, v in doc.items() if k not in ("_key", "_id", "folder")}
    if isinstance(doc, list):
        return [strip_keys(v) for v in doc]
    return doc


def main():
    types = load("types-a.json") + load("types-b.json") + load("types-c.json") + load("types-d.json")
    bosses = load("bosses.json")
    universal = load("universal.json")
    templates = load("templates.json")

    f_types = folder_doc("Tipos de NPC", "Actor", 1)
    f_bosses = folder_doc("Chefes", "Actor", 2)
    npc_docs = [f_types, f_bosses]
    npc_docs += [npc_actor(n, f_types["_id"]) for n in sorted(types, key=lambda x: x["name"])]
    npc_docs += [npc_actor(n, f_bosses["_id"]) for n in bosses]
    write_pack("npcs", npc_docs)

    feature_docs = [ability(f, key_prefix="items", seed="universal") for f in universal]
    write_pack("npc-features", feature_docs)

    template_docs = []
    f_mech = folder_doc("Templates mecânicos", "Item", 1)
    f_them = folder_doc("Templates temáticos", "Item", 2)
    template_docs += [f_mech, f_them]
    for t in templates:
        parent = f_mech if t.get("kind") == "mechanical" else f_them
        tf = folder_doc(t["name"], "Item", 0, parent["_id"])
        template_docs.append(tf)
        tid = make_id("template", t["name"])
        names = ", ".join(f.get("name", "") for f in t.get("features", []))
        template_docs.append({
            "_id": tid, "_key": f"!items!{tid}", "name": t["name"], "type": "template",
            "img": "icons/svg/book.svg", "folder": tf["_id"],
            "system": {"kind": t.get("kind", "thematic"),
                       "description": page_ref(t.get("page")) + (f"<p>{names}</p>" if names else "")},
        })
        template_docs += [ability(f, key_prefix="items", folder=tf["_id"], seed="template" + t["name"])
                          for f in t.get("features", [])]
    write_pack("npc-templates", template_docs)

    os.makedirs(IMPORT, exist_ok=True)
    actors = [strip_keys(d) for d in npc_docs if d["_key"].startswith("!actors!")]
    with open(os.path.join(IMPORT, "inimigos.json"), "w", encoding="utf-8") as fh:
        json.dump(actors, fh, ensure_ascii=False, indent=1)
    items = [strip_keys(d) for d in feature_docs + template_docs if d["_key"].startswith("!items!")]
    with open(os.path.join(IMPORT, "inimigos-templates-e-features.json"), "w", encoding="utf-8") as fh:
        json.dump(items, fh, ensure_ascii=False, indent=1)

    feats = sum(len(d.get("items", [])) for d in npc_docs)
    print(f"npcs: {len(types)} tipos + {len(bosses)} blocos de chefe, {feats} features")
    print(f"features universais: {len(feature_docs)}; templates: {len(templates)}")


if __name__ == "__main__":
    sys.exit(main())
