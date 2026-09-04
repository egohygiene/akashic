import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createLegalSourceAcquisitionPlan, validateLegalSourceObservation } from "./lib/legal-source-acquisition.mjs";
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

const manifestById = new Map();
for (const fixturePath of fixturePaths) {
  const manifest = await readJson(fixturePath);
  const result = await validateLegalSourceSnapshotManifest(manifest, { jurisdictionById, root });
  createLegalSourceAcquisitionPlan(manifest);
  if (manifestById.has(manifest.manifestId)) throw new Error(`Duplicate legal source manifest ID: ${manifest.manifestId}.`);
  manifestById.set(manifest.manifestId, manifest);
  console.log(`Validated ${result.manifestId}: ${result.snapshotCount} snapshot${result.snapshotCount === 1 ? "" : "s"}.`);
}

const observationDirectory = path.join(fixtureDirectory, "observations");
const observationPaths = (await readdir(observationDirectory, { withFileTypes: true }))
  .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
  .map((entry) => path.posix.join("research/legal/fixtures/observations", entry.name))
  .sort();

if (!observationPaths.length) throw new Error("No legal source observation fixtures were found.");

const observationIds = new Set();
for (const observationPath of observationPaths) {
  const observation = await readJson(observationPath);
  const manifest = manifestById.get(observation.manifestId);
  if (!manifest) throw new Error(`Legal source observation references an unknown manifest: ${observation.manifestId}.`);
  const result = validateLegalSourceObservation(observation, manifest);
  if (observationIds.has(observation.observationId)) throw new Error(`Duplicate legal source observation ID: ${observation.observationId}.`);
  observationIds.add(observation.observationId);
  const plan = createLegalSourceAcquisitionPlan(manifest, observation);
  console.log(`Validated ${result.observationId}: ${plan.decision.action}.`);
}
