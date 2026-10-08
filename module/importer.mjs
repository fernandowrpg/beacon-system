const { DialogV2 } = foundry.applications.api;
const t = k => game.i18n.localize(k);

async function ensureFolder(name, type) {
  if (!name) return null;
  const existing = game.folders.find(f => f.type === type && f.name === name);
  if (existing) return existing.id;
  const folder = await Folder.create({ name, type });
  return folder.id;
}

export async function importBeaconData(data, { folderName = "" } = {}) {
  const list = Array.isArray(data) ? data : [...(data.items ?? []), ...(data.actors ?? [])];
  const items = [];
  const actors = [];
  for (const entry of list) {
    if (!entry?.name || !entry?.type) continue;
    if (entry.type in CONFIG.Item.dataModels) items.push(entry);
    else if (entry.type in CONFIG.Actor.dataModels) actors.push(entry);
  }
  if (items.length) {
    const folder = await ensureFolder(folderName, "Item");
    await Item.createDocuments(items.map(i => ({ ...i, folder: i.folder ?? folder })));
  }
  if (actors.length) {
    const folder = await ensureFolder(folderName, "Actor");
    await Actor.createDocuments(actors.map(a => ({ ...a, folder: a.folder ?? folder })));
  }
  ui.notifications.info(game.i18n.format("BEACON.Import.done", { items: items.length, actors: actors.length }));
  return { items: items.length, actors: actors.length };
}

export async function openImporter() {
  if (!game.user.isGM) return ui.notifications.warn(t("BEACON.Import.gmOnly"));
  const content = `
    <div class="beacon-importer">
      <p>${t("BEACON.Import.hint")}</p>
      <div class="form-group"><label>${t("BEACON.Import.folder")}</label><input type="text" name="folder" value="BEACON"></div>
      <textarea name="json" rows="16" placeholder='[{"name": "...", "type": "ability", "system": {...}}]'></textarea>
    </div>`;
  let result;
  try {
    result = await DialogV2.prompt({
      window: { title: t("BEACON.Import.title") },
      position: { width: 640 },
      content,
      rejectClose: true,
      ok: { label: t("BEACON.Import.import"), icon: "fa-solid fa-file-import", callback: (event, button) => new foundry.applications.ux.FormDataExtended(button.form).object }
    });
  } catch {
    return null;
  }
  let data;
  try {
    data = JSON.parse(result.json);
  } catch (err) {
    return ui.notifications.error(`${t("BEACON.Import.invalid")}: ${err.message}`);
  }
  return importBeaconData(data, { folderName: result.folder });
}

export function addImportButton(app, html) {
  if (!game.user.isGM) return;
  const root = html instanceof HTMLElement ? html : html?.[0];
  if (!root || root.querySelector(".beacon-import-btn")) return;
  const target = root.querySelector(".header-actions") ?? root.querySelector(".directory-header");
  if (!target) return;
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "beacon-import-btn";
  btn.innerHTML = `<i class="fa-solid fa-wand-magic-sparkles"></i> ${t("BEACON.Creator.button")}`;
  btn.addEventListener("click", ev => {
    ev.preventDefault();
    game.beacon.openCreator();
  });
  target.append(btn);
}
