import { cp, mkdir, rm } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const publicDirectory = resolve(root, "public");
const publishFiles = ["index.html", "css", "js"];

await rm(publicDirectory, { recursive: true, force: true });
await mkdir(publicDirectory, { recursive: true });
for (const source of publishFiles) {
  await cp(resolve(root, source), resolve(publicDirectory, source), { recursive: true });
}
await mkdir(resolve(publicDirectory, "assets"), { recursive: true });
await cp(resolve(root, "assets", "card-back.svg"), resolve(publicDirectory, "assets", "card-back.svg"));
await cp(resolve(root, "assets", "card-images"), resolve(publicDirectory, "assets", "card-images"), { recursive: true });
console.log(`Static assets built: ${publicDirectory}`);
