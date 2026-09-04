import { createHash, randomUUID } from "node:crypto";
import { mkdir, open, readFile, rename, stat, unlink } from "node:fs/promises";
import path from "node:path";
import {
  canonicalSha256,
  createLegalSourceAcquisitionPlan,
  validateLegalSourceAcquisitionPlan,
  validateLegalSourceObservation,
} from "./legal-source-acquisition.mjs";
import { validateLegalSourceSnapshotManifest } from "./legal-source-snapshots.mjs";

const DATE_FIELDS = ["publication", "amendment", "effective", "currentThrough", "retrieved", "reviewDue", "expires"];
const DATE_STATUSES = new Set(["known", "unknown", "not-applicable"]);
const LIFECYCLES = new Set(["corrects", "none", "supersedes"]);
const PARSER_STATUSES = new Set(["compatible", "incompatible", "unknown"]);
const SIGNATURE_STATUSES = new Set(["verified", "unverified", "not-supplied", "unknown"]);
const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SHA256_PATTERN = /^[a-f0-9]{64}$/;

export const LEGAL_SOURCE_APPLY_SCHEMA = "https://akashic.egohygiene.io/schemas/legal-source-apply-v1.schema.json";
export const LEGAL_SOURCE_APPLY_SCHEMA_VERSION = 1;

function assertObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} must be an object.`);
}

function rejectUnknownFields(value, allowed, label) {
  const unknown = Object.keys(value).filter((field) => !allowed.includes(field));
  if (unknown.length) throw new Error(`${label} has unsupported fields: ${unknown.join(", ")}.`);
}

function assertId(value, label) {
  if (!ID_PATTERN.test(value || "")) throw new Error(`${label} must be a stable lowercase ID.`);
}

function assertString(value, label) {
  if (typeof value !== "string" || !value.trim() || value !== value.trim()) throw new Error(`${label} must be a trimmed non-empty string.`);
}

function assertSha256(value, label) {
  if (!SHA256_PATTERN.test(value || "")) throw new Error(`${label} must be a lowercase SHA-256 digest.`);
}

function isRealDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}

function validateDates(dates, observation) {
  assertObject(dates, "Legal source apply dates");
  rejectUnknownFields(dates, DATE_FIELDS, "Legal source apply dates");
  for (const field of DATE_FIELDS) {
    const record = dates[field];
    assertObject(record, `Legal source apply ${field}`);
    rejectUnknownFields(record, ["status", "value"], `Legal source apply ${field}`);
    if (!DATE_STATUSES.has(record.status)) throw new Error(`Legal source apply ${field} status must use a controlled value.`);
    if (record.status === "known") {
      if (!isRealDate(record.value)) throw new Error(`Legal source apply ${field} must contain a real known date.`);
    } else if (record.value !== null) throw new Error(`Legal source apply ${field} must be null unless known.`);
  }
  if (dates.retrieved.status !== "known" || dates.retrieved.value !== observation.observedAt.slice(0, 10)) throw new Error("Legal source apply retrieval date must match the observation timestamp.");
  if (dates.reviewDue.status !== "known" || dates.reviewDue.value < dates.retrieved.value) throw new Error("Legal source apply reviewDue must be a known date on or after retrieval.");
}

function safeRepositoryPath(root, value, prefix, label) {
  assertString(value, label);
  if (path.isAbsolute(value) || value.includes("\\")) throw new Error(`${label} must be a repository-relative POSIX path.`);
  const normalized = path.posix.normalize(value);
  if (normalized !== value || !normalized.startsWith(prefix)) throw new Error(`${label} must stay inside ${prefix}.`);
  const resolved = path.resolve(root, normalized);
  const relative = path.relative(root, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) throw new Error(`${label} escapes the repository.`);
  return resolved;
}

function validateSignature(signature, label) {
  assertObject(signature, label);
  rejectUnknownFields(signature, ["evidence", "status"], label);
  if (!SIGNATURE_STATUSES.has(signature.status)) throw new Error(`${label} status must use a controlled value.`);
  if (["verified", "unverified"].includes(signature.status)) assertString(signature.evidence, `${label} evidence`);
  else if (signature.evidence !== null) throw new Error(`${label} evidence must be null without a supplied signature.`);
}

function validatePrivacy(privacy) {
  assertObject(privacy, "Legal source apply privacy");
  rejectUnknownFields(privacy, ["containsPrivateData", "containsUserQueries", "maximumSensitivity", "publicInputsOnly", "sourceContentIsInstructions"], "Legal source apply privacy");
  if (privacy.publicInputsOnly !== true || privacy.containsPrivateData !== false || privacy.containsUserQueries !== false || privacy.maximumSensitivity !== "public" || privacy.sourceContentIsInstructions !== false) throw new Error("Legal source apply requests must preserve the public-only, evidence-not-instructions privacy boundary.");
}

async function pathExists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
}

async function validateCapture(capture, { fixture, observation, root }) {
  assertObject(capture, "Legal source apply capture");
  rejectUnknownFields(capture, ["normalized", "raw", "transformations"], "Legal source apply capture");
  if (!Array.isArray(capture.normalized) || !capture.normalized.length) throw new Error("Legal source apply capture must include normalized artifacts.");
  if (!Array.isArray(capture.transformations) || !capture.transformations.length) throw new Error("Legal source apply capture must include transformations.");
  const sourcePrefix = fixture ? "research/legal/fixtures/captures/" : "research/legal/captures/";
  const targetPrefix = fixture ? "research/legal/fixtures/artifacts/" : "research/legal/artifacts/";
  const captures = [capture.raw, ...capture.normalized];
  const targetPaths = new Set();
  const sourcePaths = new Set();
  const contentsByTargetPath = new Map();
  const writes = [];

  for (const [index, item] of captures.entries()) {
    const raw = index === 0;
    const label = `Legal source apply ${raw ? "raw" : `normalized ${index}`} capture`;
    assertObject(item, label);
    rejectUnknownFields(item, raw ? ["bytes", "mediaType", "path", "sha256", "signature", "sourcePath"] : ["bytes", "mediaType", "path", "sha256", "signature", "sourcePath", "transformationIds"], label);
    assertString(item.mediaType, `${label} mediaType`);
    if (!Number.isInteger(item.bytes) || item.bytes < 1) throw new Error(`${label} bytes must be a positive integer.`);
    assertSha256(item.sha256, `${label} sha256`);
    validateSignature(item.signature, `${label} signature`);
    if (raw && (item.bytes !== observation.bodyBytes || item.sha256 !== observation.bodySha256 || item.mediaType !== observation.mediaType)) throw new Error("Legal source apply raw capture must match the bound observation body evidence.");
    if (!raw) {
      if (!Array.isArray(item.transformationIds) || !item.transformationIds.length || item.transformationIds.some((id) => !ID_PATTERN.test(id))) throw new Error(`${label} transformationIds must be non-empty stable IDs.`);
      if (new Set(item.transformationIds).size !== item.transformationIds.length || JSON.stringify(item.transformationIds) !== JSON.stringify([...item.transformationIds].sort())) throw new Error(`${label} transformationIds must be unique and sorted.`);
    }
    const source = safeRepositoryPath(root, item.sourcePath, sourcePrefix, `${label} sourcePath`);
    const target = safeRepositoryPath(root, item.path, targetPrefix, `${label} path`);
    if (source === target || sourcePaths.has(item.sourcePath) || targetPaths.has(item.path)) throw new Error("Legal source apply capture paths must be distinct.");
    sourcePaths.add(item.sourcePath);
    targetPaths.add(item.path);
    if (await pathExists(target)) throw new Error(`${label} refuses to overwrite immutable artifact ${item.path}.`);
    const contents = await readFile(source);
    const digest = createHash("sha256").update(contents).digest("hex");
    if (contents.length !== item.bytes || digest !== item.sha256) throw new Error(`${label} does not match its staged bytes and digest.`);
    contentsByTargetPath.set(item.path, contents);
    writes.push({ sourcePath: item.sourcePath, path: item.path, bytes: item.bytes, sha256: item.sha256, contents });
  }

  return { contentsByTargetPath, writes };
}

function validateParserCompatibility(entries) {
  if (!Array.isArray(entries) || !entries.length) throw new Error("Legal source apply parserCompatibility must be non-empty.");
  const identities = new Set();
  for (const entry of entries) {
    assertObject(entry, "Legal source apply parser compatibility");
    rejectUnknownFields(entry, ["parser", "status", "version"], "Legal source apply parser compatibility");
    assertString(entry.parser, "Legal source apply parser");
    assertString(entry.version, "Legal source apply parser version");
    if (!PARSER_STATUSES.has(entry.status)) throw new Error("Legal source apply parser status must use a controlled value.");
    const identity = `${entry.parser}@${entry.version}`;
    if (identities.has(identity)) throw new Error(`Legal source apply has duplicate parser compatibility: ${identity}.`);
    identities.add(identity);
  }
}

function validateLimitations(limitations) {
  if (!Array.isArray(limitations) || limitations.some((item) => typeof item !== "string" || !item.trim() || item !== item.trim())) throw new Error("Legal source apply limitations must be an array of trimmed strings.");
  if (new Set(limitations).size !== limitations.length) throw new Error("Legal source apply limitations must not contain duplicates.");
}

function artifactFromCapture(capture, raw) {
  return {
    path: capture.path,
    mediaType: capture.mediaType,
    bytes: capture.bytes,
    sha256: capture.sha256,
    digestStatus: "verified",
    signature: structuredClone(capture.signature),
    derivedFromSha256: raw ? null : undefined,
    transformationIds: raw ? [] : structuredClone(capture.transformationIds),
  };
}

function buildSnapshot(manifest, observation, plan, request) {
  const unavailable = plan.decision.action === "record-unavailable";
  const current = manifest.snapshots.find((snapshot) => snapshot.state === "current") || null;
  const rawArtifact = unavailable ? null : artifactFromCapture(request.snapshot.capture.raw, true);
  const normalizedArtifacts = unavailable ? [] : request.snapshot.capture.normalized.map((capture) => ({
    ...artifactFromCapture(capture, false),
    derivedFromSha256: rawArtifact.sha256,
  }));
  const snapshot = {
    id: plan.decision.proposedSnapshotId,
    state: unavailable ? "unavailable" : "current",
    dates: structuredClone(request.snapshot.dates),
    availability: unavailable ? "unavailable" : "available",
    response: {
      status: unavailable ? "unavailable" : manifest.fixture ? "synthetic" : "captured",
      retrievedAt: observation.observedAt,
      httpStatus: observation.httpStatus,
      mediaType: observation.mediaType,
      headersSha256: observation.headersSha256,
      bodySha256: observation.bodySha256,
    },
    rawArtifact,
    normalizedArtifacts,
    transformations: unavailable ? [] : structuredClone(request.snapshot.capture.transformations),
    parserCompatibility: structuredClone(request.snapshot.parserCompatibility),
    supersedes: request.lifecycle === "supersedes" ? current.id : null,
    supersededBy: null,
    corrects: request.lifecycle === "corrects" ? current.id : null,
    correctedBy: null,
    repeal: null,
    limitations: structuredClone(request.snapshot.limitations),
  };
  return { current, snapshot };
}

function applyLifecycle(manifest, current, snapshot, lifecycle) {
  const next = structuredClone(manifest);
  if (current && lifecycle !== "none") {
    const previous = next.snapshots.find((candidate) => candidate.id === current.id);
    if (lifecycle === "supersedes") {
      previous.state = "superseded";
      previous.supersededBy = snapshot.id;
    } else {
      previous.state = "corrected";
      previous.correctedBy = snapshot.id;
    }
  }
  next.snapshots.push(snapshot);
  next.snapshots.sort((left, right) => left.id.localeCompare(right.id));
  next.manualReview = {
    status: "pending",
    reviewedBy: null,
    reviewedAt: null,
    requiredFor: ["authority", "content-bounds", "currency", "rights"],
  };
  return next;
}

export async function prepareLegalSourceAcquisitionApply(manifest, observation, request, { jurisdictionById = new Map(), root = process.cwd() } = {}) {
  await validateLegalSourceSnapshotManifest(manifest, { jurisdictionById, root });
  validateLegalSourceObservation(observation, manifest);
  const plan = createLegalSourceAcquisitionPlan(manifest, observation);
  validateLegalSourceAcquisitionPlan(plan);

  assertObject(request, "Legal source apply request");
  rejectUnknownFields(request, ["$schema", "applyId", "fixture", "lifecycle", "manifestCanonicalSha256", "manifestId", "observationCanonicalSha256", "planCanonicalSha256", "planId", "privacy", "schemaVersion", "snapshot"], "Legal source apply request");
  if (request.$schema !== LEGAL_SOURCE_APPLY_SCHEMA || request.schemaVersion !== LEGAL_SOURCE_APPLY_SCHEMA_VERSION) throw new Error("Unsupported legal source apply schema.");
  assertId(request.applyId, "Legal source applyId");
  if (request.applyId !== `${plan.planId}-apply-v1`) throw new Error("Legal source applyId does not match the bound plan.");
  if (request.fixture !== manifest.fixture || request.fixture !== observation.fixture) throw new Error("Legal source apply fixture status must match its inputs.");
  if (request.manifestId !== manifest.manifestId || request.planId !== plan.planId) throw new Error("Legal source apply request does not identify its manifest and plan.");
  assertSha256(request.planCanonicalSha256, "Legal source apply planCanonicalSha256");
  assertSha256(request.manifestCanonicalSha256, "Legal source apply manifestCanonicalSha256");
  assertSha256(request.observationCanonicalSha256, "Legal source apply observationCanonicalSha256");
  if (request.manifestCanonicalSha256 !== canonicalSha256(manifest)) throw new Error("Legal source apply request is stale for the manifest content.");
  if (request.observationCanonicalSha256 !== canonicalSha256(observation)) throw new Error("Legal source apply request does not match the observation content.");
  if (request.planCanonicalSha256 !== canonicalSha256(plan)) throw new Error("Legal source apply request does not match the deterministic plan content.");
  if (!plan.decision.requiresManifestApply || !["create-snapshot", "record-unavailable"].includes(plan.decision.action)) throw new Error("Legal source apply requires a plan that proposes a manifest update.");
  if (!LIFECYCLES.has(request.lifecycle)) throw new Error("Legal source apply lifecycle must use a controlled value.");
  validatePrivacy(request.privacy);
  assertObject(request.snapshot, "Legal source apply snapshot");
  rejectUnknownFields(request.snapshot, ["capture", "dates", "limitations", "parserCompatibility"], "Legal source apply snapshot");
  validateDates(request.snapshot.dates, observation);
  validateParserCompatibility(request.snapshot.parserCompatibility);
  validateLimitations(request.snapshot.limitations);

  const current = manifest.snapshots.find((snapshot) => snapshot.state === "current") || null;
  const unavailable = plan.decision.action === "record-unavailable";
  if (unavailable) {
    if (request.lifecycle !== "none" || request.snapshot.capture !== null) throw new Error("Unavailable legal source applies append an event without replacing captured evidence or inventing artifacts.");
  } else {
    if (request.snapshot.capture === null) throw new Error("Available legal source applies require captured raw and normalized artifacts.");
    if (current && !["corrects", "supersedes"].includes(request.lifecycle)) throw new Error("A changed current snapshot must explicitly correct or supersede its predecessor.");
    if (!current && request.lifecycle !== "none") throw new Error("A first legal source snapshot cannot claim a predecessor lifecycle relation.");
  }

  const captureResult = unavailable ? { contentsByTargetPath: new Map(), writes: [] } : await validateCapture(request.snapshot.capture, { fixture: manifest.fixture, observation, root });
  const { current: baseSnapshot, snapshot } = buildSnapshot(manifest, observation, plan, request);
  const updatedManifest = applyLifecycle(manifest, baseSnapshot, snapshot, request.lifecycle);
  await validateLegalSourceSnapshotManifest(updatedManifest, { artifactContentsByPath: captureResult.contentsByTargetPath, jurisdictionById, root });
  const result = {
    applyId: request.applyId,
    action: plan.decision.action,
    lifecycle: request.lifecycle,
    planId: plan.planId,
    planSha256: canonicalSha256(plan),
    snapshotId: snapshot.id,
    manifestBeforeSha256: canonicalSha256(manifest),
    manifestAfterSha256: canonicalSha256(updatedManifest),
    observationSha256: canonicalSha256(observation),
    effects: {
      networkRequests: 0,
      artifactCreates: captureResult.writes.length,
      existingArtifactsOverwritten: 0,
      manifestWrites: 1,
    },
  };
  return { captures: captureResult.writes, manifest: updatedManifest, plan, result };
}

export async function applyLegalSourceAcquisition(manifest, observation, request, { jurisdictionById = new Map(), manifestPath, root = process.cwd() } = {}) {
  if (!manifestPath) throw new Error("Legal source apply requires an explicit manifestPath.");
  const absoluteManifestPath = path.resolve(manifestPath);
  const relativeManifestPath = path.relative(root, absoluteManifestPath);
  if (relativeManifestPath.startsWith("..") || path.isAbsolute(relativeManifestPath) || path.extname(relativeManifestPath) !== ".json") throw new Error("Legal source apply manifestPath must be a JSON file inside the repository.");
  const currentManifest = JSON.parse(await readFile(absoluteManifestPath, "utf8"));
  if (canonicalSha256(currentManifest) !== canonicalSha256(manifest)) throw new Error("Legal source apply manifest changed after it was loaded.");
  const prepared = await prepareLegalSourceAcquisitionApply(manifest, observation, request, { jurisdictionById, root });
  const created = [];
  const temporaryManifestPath = `${absoluteManifestPath}.${request.applyId}.${randomUUID()}.tmp`;
  let temporaryCreated = false;
  try {
    for (const capture of prepared.captures) {
      const target = path.resolve(root, capture.path);
      await mkdir(path.dirname(target), { recursive: true });
      const handle = await open(target, "wx");
      created.push(target);
      try {
        await handle.writeFile(capture.contents);
      } finally {
        await handle.close();
      }
    }
    const handle = await open(temporaryManifestPath, "wx");
    temporaryCreated = true;
    try {
      await handle.writeFile(`${JSON.stringify(prepared.manifest, null, 2)}\n`, "utf8");
    } finally {
      await handle.close();
    }
    const latestManifest = JSON.parse(await readFile(absoluteManifestPath, "utf8"));
    if (canonicalSha256(latestManifest) !== request.manifestCanonicalSha256) throw new Error("Legal source apply manifest changed before atomic replacement.");
    await rename(temporaryManifestPath, absoluteManifestPath);
    temporaryCreated = false;
  } catch (error) {
    await Promise.allSettled([...(temporaryCreated ? [unlink(temporaryManifestPath)] : []), ...created.map((target) => unlink(target))]);
    throw error;
  }
  return prepared.result;
}

export function formatLegalSourceAcquisitionApply(result, { applied = false } = {}) {
  const lines = [
    `Legal source acquisition ${applied ? "applied" : "apply preview"}`,
    `Apply: ${result.applyId}`,
    `Plan: ${result.planId}`,
    `Plan digest: ${result.planSha256}`,
    `Decision: ${result.action}`,
    `Lifecycle: ${result.lifecycle}`,
    `Snapshot: ${result.snapshotId}`,
    `Manifest: ${result.manifestBeforeSha256} -> ${result.manifestAfterSha256}`,
    `Effects: ${result.effects.networkRequests} network requests, ${result.effects.artifactCreates} immutable artifact creates, ${result.effects.existingArtifactsOverwritten} artifact overwrites, ${result.effects.manifestWrites} manifest write`,
  ];
  return `${lines.join("\n")}\n`;
}
