import { mkdir, copyFile, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";

const manifest = JSON.parse(await readFile("manifest-beta.json", "utf8"));
if (manifest.id !== "coz-initiative-tracker-beta") throw new Error("Expected the beta plugin identity.");
const output = path.resolve("dist/beta", manifest.id);
await mkdir(output, { recursive: true });
for (const file of ["main.js", "styles.css"]) await copyFile(file, path.join(output, file));
await copyFile("manifest-beta.json", path.join(output, "manifest.json"));
const hashes = {};
for (const file of ["main.js", "styles.css", "manifest.json"]) {
    hashes[file] = createHash("sha256").update(await readFile(path.join(output, file))).digest("hex");
}
await writeFile(path.resolve("dist/beta/checksums.json"), JSON.stringify({ version: manifest.version, files: hashes }, null, 2) + "\n");
console.log(`Beta ${manifest.version} packaged at ${output}`);
