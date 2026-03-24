import { cp, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const desktopDist = path.join(root, "desktop/dist");
const target = path.join(root, "mobile/dist/desktop");

await rm(target, { recursive: true, force: true });
await cp(desktopDist, target, { recursive: true });
