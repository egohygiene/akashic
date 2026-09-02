import { access } from "node:fs/promises";
import path from "node:path";

const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const REVISION_PATTERN = /^[a-f0-9]{40}$/;
const KINDS = new Set([
  "repository-code",
  "repository-dataset",
  "repository-artifact",
  "runtime",
  "embedding-model",
]);
const LICENSES = new Set(["CC0-1.0", "Apache-2.0", "MIT", "Apache-2.0 OR MIT", "NOASSERTION"]);
const STATUSES = new Set(["shipped", "candidate", "approved", "blocked"]);
const REDISTRIBUTION = new Set(["repository-license", "not-approved", "permitted", "external-only"]);
const ENTRY_FIELDS = new Set([
  "id",
  "name",
  "kind",
  "status",
  "sourcePath",
  "sourceUrl",
  "sourceRevision",
  "licenseSpdx",
  "licenseEvidence",
  "checked",
  "coveredComponents",
  "redistribution",
  "obligations",
  "blockers",
  "notes",
]);

function isRealDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}

function assertString(value, label) {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${label} must be a non-empty string.`);
}

function assertStringArray(value, label, { allowEmpty = false } = {}) {
  if (!Array.isArray(value) || (!allowEmpty && value.length === 0) || value.some((item) => typeof item !== "string" || !item.trim())) {
    throw new Error(`${label} must be ${allowEmpty ? "an" : "a non-empty"} array of non-empty strings.`);
  }
  if (new Set(value).size !== value.length) throw new Error(`${label} must not contain duplicates.`);
}

function assertHttpsUrl(value, label) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${label} must be a valid HTTPS URL.`);
  }
  if (parsed.protocol !== "https:") throw new Error(`${label} must be a valid HTTPS URL.`);
}

function safeRepositoryPath(root, value, label) {
  assertString(value, label);
  if (path.isAbsolute(value)) throw new Error(`${label} must be repository-relative.`);
  const resolved = path.resolve(root, value);
  const relative = path.relative(root, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) throw new Error(`${label} must stay inside the repository.`);
  return resolved;
}

async function validateEntry(entry, index, root, seenIds) {
  const label = `license entry ${index + 1}`;
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) throw new Error(`${label} must be an object.`);
  const unknownFields = Object.keys(entry).filter((field) => !ENTRY_FIELDS.has(field));
  if (unknownFields.length) throw new Error(`${label} has unknown fields: ${unknownFields.join(", ")}.`);

  assertString(entry.id, `${label} id`);
  if (!ID_PATTERN.test(entry.id)) throw new Error(`${label} id must use lowercase letters, numbers, and single hyphens.`);
  if (seenIds.has(entry.id)) throw new Error(`Duplicate search license ID: ${entry.id}.`);
  seenIds.add(entry.id);

  assertString(entry.name, `${label} name`);
  if (!KINDS.has(entry.kind)) throw new Error(`${label} kind must use a controlled value.`);
  if (!STATUSES.has(entry.status)) throw new Error(`${label} status must use a controlled value.`);
  if (!REDISTRIBUTION.has(entry.redistribution)) throw new Error(`${label} redistribution must use a controlled value.`);
  assertString(entry.licenseSpdx, `${label} licenseSpdx`);
  if (!LICENSES.has(entry.licenseSpdx)) throw new Error(`${label} licenseSpdx must use a controlled SPDX expression.`);
  assertString(entry.licenseEvidence, `${label} licenseEvidence`);
  assertString(entry.notes, `${label} notes`);
  assertStringArray(entry.coveredComponents, `${label} coveredComponents`);
  assertStringArray(entry.obligations, `${label} obligations`, { allowEmpty: true });
  assertStringArray(entry.blockers, `${label} blockers`, { allowEmpty: true });

  if (typeof entry.checked !== "string" || !isRealDate(entry.checked)) throw new Error(`${label} checked must be a real YYYY-MM-DD date.`);
  const today = new Date().toISOString().slice(0, 10);
  if (entry.checked > today) throw new Error(`${label} checked must not be in the future.`);

  const hasPath = Object.hasOwn(entry, "sourcePath");
  const hasUrl = Object.hasOwn(entry, "sourceUrl");
  if (hasPath === hasUrl) throw new Error(`${label} must have exactly one of sourcePath or sourceUrl.`);
  if (hasPath) await access(safeRepositoryPath(root, entry.sourcePath, `${label} sourcePath`));
  if (hasUrl) assertHttpsUrl(entry.sourceUrl, `${label} sourceUrl`);

  if (entry.licenseEvidence.startsWith("https://")) {
    assertHttpsUrl(entry.licenseEvidence, `${label} licenseEvidence`);
  } else {
    await access(safeRepositoryPath(root, entry.licenseEvidence, `${label} licenseEvidence`));
  }

  if (entry.sourceRevision !== null && !REVISION_PATTERN.test(entry.sourceRevision)) {
    throw new Error(`${label} sourceRevision must be null or a full lowercase commit SHA.`);
  }
  if (entry.status === "approved" && hasUrl && entry.sourceRevision === null) {
    throw new Error(`${label} cannot approve an external source without an immutable revision.`);
  }
  if (["candidate", "blocked"].includes(entry.status) && !entry.blockers.length) {
    throw new Error(`${label} must record at least one blocker.`);
  }
  if (["candidate", "blocked"].includes(entry.status) && entry.redistribution !== "not-approved") {
    throw new Error(`${label} must keep candidate or blocked redistribution not-approved.`);
  }
  if (entry.status === "shipped" && (!hasPath || entry.redistribution !== "repository-license" || entry.blockers.length)) {
    throw new Error(`${label} shipped assets must be repository paths with repository-license redistribution and no blockers.`);
  }
}

export async function validateSearchLicenseManifest(manifest, { root = process.cwd() } = {}) {
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) throw new Error("Search license manifest must be an object.");
  const unknownTopLevelFields = Object.keys(manifest).filter((field) => !["schemaVersion", "policy", "entries"].includes(field));
  if (unknownTopLevelFields.length) throw new Error(`Search license manifest has unknown fields: ${unknownTopLevelFields.join(", ")}.`);
  if (manifest.schemaVersion !== 1) throw new Error("Search license manifest schemaVersion must be 1.");
  const expectedPolicy = {
    externalDefault: "not-approved",
    requireImmutableRevision: true,
    requireComponentCoverage: true,
    requireRedistributionNotices: true,
  };
  if (!manifest.policy || typeof manifest.policy !== "object" || Array.isArray(manifest.policy)) throw new Error("Search license manifest must define its approval policy.");
  const policyFields = Object.keys(manifest.policy);
  if (policyFields.length !== Object.keys(expectedPolicy).length || policyFields.some((field) => !Object.hasOwn(expectedPolicy, field) || manifest.policy[field] !== expectedPolicy[field])) {
    throw new Error("Search license manifest must preserve the approval policy guardrails.");
  }
  if (!Array.isArray(manifest.entries) || !manifest.entries.length) throw new Error("Search license manifest must contain entries.");

  const seenIds = new Set();
  for (const [index, entry] of manifest.entries.entries()) await validateEntry(entry, index, root, seenIds);
  return { entryCount: manifest.entries.length, shippedCount: manifest.entries.filter((entry) => entry.status === "shipped").length, candidateCount: manifest.entries.filter((entry) => entry.status === "candidate").length };
}
