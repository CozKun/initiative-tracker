import { mkdir, copyFile, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";

const manifest = JSON.parse(await readFile("manifest.json", "utf8"));
if (manifest.id !== "coz-initiative-tracker" || manifest.version.includes("-")) {
    throw new Error("Expected the stable Community Edition identity and version.");
}
const output = path.resolve("dist/stable", manifest.id);
await mkdir(output, { recursive: true });
const files = ["main.js", "styles.css", "manifest.json", "CHANGELOG.md", "README.md", "LICENSE"];
const hashes = {};
for (const file of files) {
    await copyFile(file, path.join(output, file));
    hashes[file] = createHash("sha256").update(await readFile(path.join(output, file))).digest("hex");
}
await writeFile(path.resolve("dist/stable/checksums.json"), JSON.stringify({ version: manifest.version, files: hashes }, null, 2) + "\n");
console.log(`Community Edition ${manifest.version} packaged at ${output}`);
