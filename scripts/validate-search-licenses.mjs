import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { validateSearchLicenseManifest } from "./lib/search-licenses.mjs";

const root = process.cwd();
const manifestOptionIndex = process.argv.indexOf("--manifest");
if (manifestOptionIndex !== -1 && (!process.argv[manifestOptionIndex + 1] || process.argv[manifestOptionIndex + 1].startsWith("--"))) {
  throw new Error("--manifest requires a path.");
}
const manifestPath = path.resolve(manifestOptionIndex === -1 ? "research/search/licenses.json" : process.argv[manifestOptionIndex + 1]);
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const result = await validateSearchLicenseManifest(manifest, { root });
console.log(`Validated ${result.entryCount} search license records: ${result.shippedCount} shipped and ${result.candidateCount} candidates.`);
