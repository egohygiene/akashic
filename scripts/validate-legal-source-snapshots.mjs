import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateLegalSourceSnapshotManifest } from "./lib/legal-source-snapshots.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readJson = async (relativePath) => JSON.parse(await readFile(path.join(root, relativePath), "utf8"));
const jurisdictionManifest = await readJson("atlas/jurisdictions.json");
const jurisdictionById = new Map(jurisdictionManifest.jurisdictions.map((jurisdiction) => [jurisdiction.id, jurisdiction]));
const fixtureDirectory = path.join(root, "research/legal/fixtures");
const fixturePaths = (await readdir(fixtureDirectory, { withFileTypes: true }))
  .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
  .map((entry) => path.posix.join("research/legal/fixtures", entry.name))
  .sort();

if (!fixturePaths.length) throw new Error("No legal source snapshot fixtures were found.");

for (const fixturePath of fixturePaths) {
  const result = await validateLegalSourceSnapshotManifest(await readJson(fixturePath), { jurisdictionById, root });
  console.log(`Validated ${result.manifestId}: ${result.snapshotCount} snapshot${result.snapshotCount === 1 ? "" : "s"}.`);
}
