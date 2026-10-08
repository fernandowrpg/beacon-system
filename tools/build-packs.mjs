import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { compilePack } from "@foundryvtt/foundryvtt-cli";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const srcRoot = path.join(root, "packs-src");
const outRoot = path.join(root, "packs");

for (const name of fs.readdirSync(srcRoot)) {
  const src = path.join(srcRoot, name);
  if (!fs.statSync(src).isDirectory()) continue;
  const dest = path.join(outRoot, name);
  fs.rmSync(dest, { recursive: true, force: true });
  await compilePack(src, dest);
  console.log(`packed ${name}`);
}
