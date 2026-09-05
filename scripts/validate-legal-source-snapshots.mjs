import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createLegalSourceAcquisitionPlan, validateLegalSourceObservation } from "./lib/legal-source-acquisition.mjs";
import { prepareLegalSourceAcquisitionApply } from "./lib/legal-source-apply.mjs";
import { createAetherLegalSourcePackEvidencePacket } from "./lib/legal-source-pack-export.mjs";
import { createAetherLegalSourceEvidencePacket, verifyAetherPacketAttachmentBytes } from "./lib/legal-source-export.mjs";
import { validateLegalSourcePack } from "./lib/legal-source-packs.mjs";
import { validateLegalSourceSnapshotManifest } from "./lib/legal-source-snapshots.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readJson = async (relativePath) => JSON.parse(await readFile(path.join(root, relativePath), "utf8"));
const jurisdictionManifest = await readJson("atlas/jurisdictions.json");
const aetherContractLock = await readJson("research/legal/aether-public-evidence-v1.lock.json");
const jurisdictionById = new Map(jurisdictionManifest.jurisdictions.map((jurisdiction) => [jurisdiction.id, jurisdiction]));
const fixtureDirectory = path.join(root, "research/legal/fixtures");
const fixturePaths = (await readdir(fixtureDirectory, { withFileTypes: true }))
  .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
  .map((entry) => path.posix.join("research/legal/fixtures", entry.name))
  .sort();

if (!fixturePaths.length) throw new Error("No legal source snapshot fixtures were found.");

const manifestById = new Map();
const manifestByPath = new Map();
for (const fixturePath of fixturePaths) {
  const manifest = await readJson(fixturePath);
  const result = await validateLegalSourceSnapshotManifest(manifest, { jurisdictionById, root });
  createLegalSourceAcquisitionPlan(manifest);
  const packet = await createAetherLegalSourceEvidencePacket(manifest, aetherContractLock, { jurisdictionById, root });
  await verifyAetherPacketAttachmentBytes(packet, { root });
  if (manifestById.has(manifest.manifestId)) throw new Error(`Duplicate legal source manifest ID: ${manifest.manifestId}.`);
  manifestById.set(manifest.manifestId, manifest);
  manifestByPath.set(fixturePath, manifest);
  console.log(`Validated ${result.manifestId}: ${result.snapshotCount} snapshot${result.snapshotCount === 1 ? "" : "s"}.`);
  console.log(`Validated ${packet.packet.id}: ${packet.integrity.envelope_digest.value}.`);
}

const packDirectory = path.join(root, "research/legal/packs");
const packPaths = (await readdir(packDirectory, { withFileTypes: true }))
  .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
  .map((entry) => path.posix.join("research/legal/packs", entry.name))
  .sort();

if (!packPaths.length) throw new Error("No legal source packs were found.");

for (const packPath of packPaths) {
  const pack = await readJson(packPath);
  const result = await validateLegalSourcePack(pack, { jurisdictionById, manifestByPath, root });
  const packet = await createAetherLegalSourcePackEvidencePacket(pack, aetherContractLock, { jurisdictionById, manifestByPath, packPath, root });
  await verifyAetherPacketAttachmentBytes(packet, { root });
  console.log(`Validated ${result.packId}: ${result.sourceCount} sources, ${result.citationCount} citations, ${result.evaluationCount} evaluations.`);
  console.log(`Validated ${packet.packet.id}: ${packet.integrity.envelope_digest.value}.`);
}

const observationDirectory = path.join(fixtureDirectory, "observations");
const observationPaths = (await readdir(observationDirectory, { withFileTypes: true }))
  .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
  .map((entry) => path.posix.join("research/legal/fixtures/observations", entry.name))
  .sort();

if (!observationPaths.length) throw new Error("No legal source observation fixtures were found.");

const observationIds = new Set();
const acquisitionByPlanId = new Map();
for (const observationPath of observationPaths) {
  const observation = await readJson(observationPath);
  const manifest = manifestById.get(observation.manifestId);
  if (!manifest) throw new Error(`Legal source observation references an unknown manifest: ${observation.manifestId}.`);
  const result = validateLegalSourceObservation(observation, manifest);
  if (observationIds.has(observation.observationId)) throw new Error(`Duplicate legal source observation ID: ${observation.observationId}.`);
  observationIds.add(observation.observationId);
  const plan = createLegalSourceAcquisitionPlan(manifest, observation);
  acquisitionByPlanId.set(plan.planId, { manifest, observation });
  console.log(`Validated ${result.observationId}: ${plan.decision.action}.`);
}

const applyDirectory = path.join(fixtureDirectory, "apply");
const applyPaths = (await readdir(applyDirectory, { withFileTypes: true }))
  .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
  .map((entry) => path.posix.join("research/legal/fixtures/apply", entry.name))
  .sort();

if (!applyPaths.length) throw new Error("No legal source apply fixtures were found.");

const applyIds = new Set();
for (const applyPath of applyPaths) {
  const request = await readJson(applyPath);
  const acquisition = acquisitionByPlanId.get(request.planId);
  if (!acquisition) throw new Error(`Legal source apply request references an unknown plan: ${request.planId}.`);
  if (applyIds.has(request.applyId)) throw new Error(`Duplicate legal source apply ID: ${request.applyId}.`);
  applyIds.add(request.applyId);
  const prepared = await prepareLegalSourceAcquisitionApply(acquisition.manifest, acquisition.observation, request, { jurisdictionById, root });
  console.log(`Validated ${prepared.result.applyId}: ${prepared.result.action}.`);
}
