import { cp, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const mobileDist = path.join(root, "mobile/dist");
const target = path.join(root, "desktop/dist/m");

await rm(target, { recursive: true, force: true });
await cp(mobileDist, target, { recursive: true });
