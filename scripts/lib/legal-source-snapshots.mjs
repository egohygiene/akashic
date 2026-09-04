import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { LEGAL_SOURCE_COVERAGE_ROLES } from "./jurisdiction-sources.mjs";

const ACQUISITION_MODES = new Set(["api", "bulk", "manual", "synthetic-fixture"]);
const ACCESSIBILITY_STATUSES = new Set(["documented", "partial", "unknown"]);
const AUTHENTICATION_STATUSES = new Set(["available", "not-available", "unknown"]);
const CONTENT_STATUSES = new Set(["official", "authenticated", "unofficial", "archival", "derivative", "unknown"]);
const DATE_FIELDS = ["publication", "amendment", "effective", "currentThrough", "retrieved", "reviewDue", "expires"];
const DATE_STATUSES = new Set(["known", "unknown", "not-applicable"]);
const DIGEST_STATUSES = new Set(["verified", "unverified", "unknown"]);
const EXPORT_STATUSES = new Set(["planned", "compatible", "incompatible", "blocked"]);
const FRESHNESS_POLICIES = new Set(["event-driven", "interval", "event-and-interval", "manual"]);
const PARSER_STATUSES = new Set(["compatible", "incompatible", "unknown"]);
const PUBLISHER_STATUSES = new Set(["official", "unofficial", "unknown"]);
const QUOTATION_STATUSES = new Set(["allowed", "fair-use-only", "review-required", "unknown"]);
const REDISTRIBUTION_STATUSES = new Set(["allowed", "prohibited", "review-required", "unknown"]);
const REVIEW_REQUIREMENTS = ["authority", "content-bounds", "currency", "rights"];
const REVIEW_STATUSES = new Set(["pending", "reviewed"]);
const RIGHTS_STATUSES = new Set(["public-domain-with-exceptions", "permitted", "restricted", "unknown"]);
const RESPONSE_STATUSES = new Set(["captured", "synthetic", "unavailable", "unknown"]);
const SIGNATURE_STATUSES = new Set(["verified", "unverified", "not-supplied", "unknown"]);
const SNAPSHOT_STATES = new Set(["historical", "current", "stale", "corrected", "superseded", "unavailable", "unknown"]);
const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SHA256_PATTERN = /^[a-f0-9]{64}$/;

export const LEGAL_SOURCE_SNAPSHOT_SCHEMA_VERSION = 1;
export const LEGAL_SOURCE_SNAPSHOT_STATES = Object.freeze([...SNAPSHOT_STATES]);

function assertObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} must be an object.`);
}

function rejectUnknownFields(value, allowedFields, label) {
  const unknownFields = Object.keys(value).filter((field) => !allowedFields.includes(field));
  if (unknownFields.length) throw new Error(`${label} has unsupported fields: ${unknownFields.join(", ")}.`);
}

function assertString(value, label) {
  if (typeof value !== "string" || !value.trim() || value !== value.trim()) throw new Error(`${label} must be a trimmed non-empty string.`);
}

function assertId(value, label) {
  if (!ID_PATTERN.test(value || "")) throw new Error(`${label} must be a stable lowercase ID.`);
}

function assertControlled(value, allowed, label) {
  if (!allowed.has(value)) throw new Error(`${label} must use a controlled value.`);
}

function assertStringArray(value, label, { allowEmpty = false, sorted = false } = {}) {
  if (!Array.isArray(value) || (!allowEmpty && !value.length) || value.some((item) => typeof item !== "string" || !item.trim() || item !== item.trim())) throw new Error(`${label} must be ${allowEmpty ? "an" : "a non-empty"} array of trimmed strings.`);
  if (new Set(value).size !== value.length) throw new Error(`${label} must not contain duplicates.`);
  if (sorted && JSON.stringify(value) !== JSON.stringify([...value].sort())) throw new Error(`${label} must be sorted.`);
}

function assertHttpsUrl(value, label) {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "https:" || parsed.username || parsed.password) throw new Error();
  } catch {
    throw new Error(`${label} must be a credential-free HTTPS URL.`);
  }
}

function isRealDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}

function assertTimestamp(value, label) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(value) || Number.isNaN(Date.parse(value))) throw new Error(`${label} must be a UTC timestamp without fractional seconds.`);
}

function safeFixturePath(root, value, label) {
  assertString(value, label);
  if (path.isAbsolute(value) || value.includes("\\")) throw new Error(`${label} must be a repository-relative POSIX path.`);
  const normalized = path.posix.normalize(value);
  if (normalized !== value || !normalized.startsWith("research/legal/fixtures/artifacts/")) throw new Error(`${label} must stay inside the legal fixture artifact directory.`);
  const resolved = path.resolve(root, normalized);
  const relative = path.relative(root, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) throw new Error(`${label} escapes the repository.`);
  return resolved;
}

function validateSource(source) {
  assertObject(source, "Legal source");
  rejectUnknownFields(source, ["accessibilityStatus", "acquisitionEndpoint", "authenticationStatus", "canonicalUrl", "contentBounds", "contentStatuses", "formats", "issuingBody", "languages", "name", "publisher", "publisherStatus"], "Legal source");
  for (const field of ["name", "issuingBody", "publisher", "contentBounds"]) assertString(source[field], `Legal source ${field}`);
  assertHttpsUrl(source.canonicalUrl, "Legal source canonicalUrl");
  assertHttpsUrl(source.acquisitionEndpoint, "Legal source acquisitionEndpoint");
  assertControlled(source.publisherStatus, PUBLISHER_STATUSES, "Legal source publisherStatus");
  assertStringArray(source.contentStatuses, "Legal source contentStatuses", { sorted: true });
  if (source.contentStatuses.some((status) => !CONTENT_STATUSES.has(status))) throw new Error("Legal source contentStatuses must use controlled values.");
  if (source.contentStatuses.includes("unknown") && source.contentStatuses.length !== 1) throw new Error("Unknown legal source content status cannot be combined with another claim.");
  assertControlled(source.authenticationStatus, AUTHENTICATION_STATUSES, "Legal source authenticationStatus");
  assertStringArray(source.formats, "Legal source formats", { sorted: true });
  assertStringArray(source.languages, "Legal source languages", { sorted: true });
  assertControlled(source.accessibilityStatus, ACCESSIBILITY_STATUSES, "Legal source accessibilityStatus");
}

function validateAcquisition(acquisition, fixture) {
  assertObject(acquisition, "Legal source acquisition");
  rejectUnknownFields(acquisition, ["method", "mode", "requestParameters", "responseMediaType", "tool"], "Legal source acquisition");
  assertControlled(acquisition.mode, ACQUISITION_MODES, "Legal source acquisition mode");
  if (fixture !== (acquisition.mode === "synthetic-fixture")) throw new Error("Synthetic fixture manifests must use only synthetic-fixture acquisition mode.");
  if (acquisition.method !== "GET") throw new Error("Legal source acquisition method must be GET in schema v1.");
  assertObject(acquisition.tool, "Legal source acquisition tool");
  rejectUnknownFields(acquisition.tool, ["name", "version"], "Legal source acquisition tool");
  assertString(acquisition.tool.name, "Legal source acquisition tool name");
  assertString(acquisition.tool.version, "Legal source acquisition tool version");
  assertObject(acquisition.requestParameters, "Legal source acquisition requestParameters");
  if (Object.entries(acquisition.requestParameters).some(([key, value]) => !key || typeof value !== "string")) throw new Error("Legal source acquisition requestParameters must contain string values.");
  if (Object.keys(acquisition.requestParameters).some((key) => /(authorization|credential|key|secret|token)/i.test(key))) throw new Error("Legal source acquisition requestParameters must not contain credential-bearing fields.");
  assertString(acquisition.responseMediaType, "Legal source acquisition responseMediaType");
}

function validateRights(rights) {
  assertObject(rights, "Legal source rights");
  rejectUnknownFields(rights, ["licenseExpression", "notes", "quotation", "redistribution", "status", "termsUrl"], "Legal source rights");
  assertControlled(rights.status, RIGHTS_STATUSES, "Legal source rights status");
  if (rights.licenseExpression !== null) assertString(rights.licenseExpression, "Legal source licenseExpression");
  if (rights.termsUrl !== null) assertHttpsUrl(rights.termsUrl, "Legal source termsUrl");
  assertControlled(rights.redistribution, REDISTRIBUTION_STATUSES, "Legal source redistribution");
  assertControlled(rights.quotation, QUOTATION_STATUSES, "Legal source quotation");
  assertString(rights.notes, "Legal source rights notes");
  if (rights.status === "unknown" && (rights.redistribution !== "unknown" || rights.quotation !== "unknown")) throw new Error("Unknown rights must fail closed without redistribution or quotation claims.");
  if (rights.status === "restricted" && rights.redistribution === "allowed") throw new Error("Restricted rights cannot claim unrestricted redistribution.");
}

function validateFreshness(freshness) {
  assertObject(freshness, "Legal source freshness");
  rejectUnknownFields(freshness, ["maximumAgeDays", "onStale", "policy", "triggers"], "Legal source freshness");
  assertControlled(freshness.policy, FRESHNESS_POLICIES, "Legal source freshness policy");
  if (freshness.maximumAgeDays !== null && (!Number.isInteger(freshness.maximumAgeDays) || freshness.maximumAgeDays < 1)) throw new Error("Legal source maximumAgeDays must be null or a positive integer.");
  assertStringArray(freshness.triggers, "Legal source freshness triggers", { sorted: true });
  if (freshness.onStale !== "require-review") throw new Error("Stale legal sources must require review.");
}

function validateDateRecord(record, label) {
  assertObject(record, label);
  rejectUnknownFields(record, ["status", "value"], label);
  assertControlled(record.status, DATE_STATUSES, `${label} status`);
  if (record.status === "known") {
    if (!isRealDate(record.value)) throw new Error(`${label} known value must be a real date.`);
  } else if (record.value !== null) throw new Error(`${label} ${record.status} value must be null.`);
}

function validateDates(dates, label) {
  assertObject(dates, `${label} dates`);
  rejectUnknownFields(dates, DATE_FIELDS, `${label} dates`);
  for (const field of DATE_FIELDS) validateDateRecord(dates[field], `${label} ${field}`);
  if (dates.retrieved.status !== "known") throw new Error(`${label} must record a known retrieval date.`);
}

async function validateArtifact(artifact, { fixture, root, label, raw }) {
  assertObject(artifact, label);
  rejectUnknownFields(artifact, ["bytes", "derivedFromSha256", "digestStatus", "mediaType", "path", "sha256", "signature", "transformationIds"], label);
  assertString(artifact.mediaType, `${label} mediaType`);
  if (!Number.isInteger(artifact.bytes) || artifact.bytes < 1) throw new Error(`${label} bytes must be a positive integer.`);
  if (!SHA256_PATTERN.test(artifact.sha256 || "")) throw new Error(`${label} sha256 must be a lowercase SHA-256 digest.`);
  assertControlled(artifact.digestStatus, DIGEST_STATUSES, `${label} digestStatus`);
  if (artifact.digestStatus !== "verified") throw new Error(`${label} must fail closed until its digest is verified.`);
  if (raw ? artifact.derivedFromSha256 !== null : !SHA256_PATTERN.test(artifact.derivedFromSha256 || "")) throw new Error(`${label} has an invalid derivation link.`);
  assertStringArray(artifact.transformationIds, `${label} transformationIds`, { allowEmpty: raw, sorted: true });
  if (!raw && !artifact.transformationIds.length) throw new Error(`${label} must name its transformation chain.`);
  assertObject(artifact.signature, `${label} signature`);
  rejectUnknownFields(artifact.signature, ["evidence", "status"], `${label} signature`);
  assertControlled(artifact.signature.status, SIGNATURE_STATUSES, `${label} signature status`);
  if (["verified", "unverified"].includes(artifact.signature.status)) assertString(artifact.signature.evidence, `${label} signature evidence`);
  else if (artifact.signature.evidence !== null) throw new Error(`${label} signature evidence must be null when no signature was supplied.`);

  if (!fixture) throw new Error("Schema v1 validation currently accepts checked-in synthetic artifacts only; live acquisition belongs in plan/apply follow-up work.");
  const contents = await readFile(safeFixturePath(root, artifact.path, `${label} path`));
  const digest = createHash("sha256").update(contents).digest("hex");
  if (contents.length !== artifact.bytes || digest !== artifact.sha256) throw new Error(`${label} does not match its checked-in bytes and SHA-256 digest.`);
}

function validateParserCompatibility(entries, label) {
  if (!Array.isArray(entries) || !entries.length) throw new Error(`${label} parserCompatibility must be non-empty.`);
  const identities = new Set();
  for (const entry of entries) {
    assertObject(entry, `${label} parser compatibility`);
    rejectUnknownFields(entry, ["parser", "status", "version"], `${label} parser compatibility`);
    assertString(entry.parser, `${label} parser`);
    assertString(entry.version, `${label} parser version`);
    assertControlled(entry.status, PARSER_STATUSES, `${label} parser status`);
    const identity = `${entry.parser}@${entry.version}`;
    if (identities.has(identity)) throw new Error(`${label} has duplicate parser compatibility: ${identity}.`);
    identities.add(identity);
  }
}

function validateResponse(response, snapshot, fixture, label) {
  assertObject(response, `${label} response`);
  rejectUnknownFields(response, ["bodySha256", "headersSha256", "httpStatus", "mediaType", "retrievedAt", "status"], `${label} response`);
  assertControlled(response.status, RESPONSE_STATUSES, `${label} response status`);
  assertTimestamp(response.retrievedAt, `${label} response retrievedAt`);
  if (response.retrievedAt.slice(0, 10) !== snapshot.dates.retrieved.value) throw new Error(`${label} response timestamp must match its retrieval date.`);
  if (response.httpStatus !== null && (!Number.isInteger(response.httpStatus) || response.httpStatus < 100 || response.httpStatus > 599)) throw new Error(`${label} response httpStatus must be null or a valid HTTP status.`);
  if (response.mediaType !== null) assertString(response.mediaType, `${label} response mediaType`);
  for (const field of ["headersSha256", "bodySha256"]) if (response[field] !== null && !SHA256_PATTERN.test(response[field])) throw new Error(`${label} response ${field} must be null or a SHA-256 digest.`);
  if (fixture && response.status !== (snapshot.availability === "unavailable" ? "unavailable" : "synthetic")) throw new Error(`${label} fixture response status does not match availability.`);
  if (["captured", "synthetic"].includes(response.status)) {
    if (response.mediaType === null || response.bodySha256 === null) throw new Error(`${label} captured response must identify media type and body digest.`);
  } else if (response.bodySha256 !== null) throw new Error(`${label} uncaptured response must not claim a body digest.`);
}

async function validateSnapshot(snapshot, { fixture, root }) {
  const label = `Legal snapshot ${snapshot?.id || "unknown"}`;
  assertObject(snapshot, label);
  rejectUnknownFields(snapshot, ["availability", "correctedBy", "corrects", "dates", "id", "limitations", "normalizedArtifacts", "parserCompatibility", "rawArtifact", "response", "state", "supersededBy", "supersedes", "transformations"], label);
  assertId(snapshot.id, `${label} id`);
  assertControlled(snapshot.state, SNAPSHOT_STATES, `${label} state`);
  assertControlled(snapshot.availability, new Set(["available", "unavailable", "unknown"]), `${label} availability`);
  validateDates(snapshot.dates, label);
  validateResponse(snapshot.response, snapshot, fixture, label);
  assertStringArray(snapshot.limitations, `${label} limitations`, { allowEmpty: true });
  for (const field of ["supersedes", "supersededBy", "corrects", "correctedBy"]) if (snapshot[field] !== null) assertId(snapshot[field], `${label} ${field}`);
  validateParserCompatibility(snapshot.parserCompatibility, label);

  if (snapshot.availability === "unavailable") {
    if (snapshot.rawArtifact !== null || !Array.isArray(snapshot.normalizedArtifacts) || snapshot.normalizedArtifacts.length || !Array.isArray(snapshot.transformations) || snapshot.transformations.length) throw new Error(`${label} unavailable state must not invent artifacts or transformations.`);
  } else {
    if (snapshot.availability !== "available") throw new Error(`${label} must fail closed until availability is known.`);
    await validateArtifact(snapshot.rawArtifact, { fixture, root, label: `${label} raw artifact`, raw: true });
    if (snapshot.response.bodySha256 !== snapshot.rawArtifact.sha256) throw new Error(`${label} response body digest must match the raw artifact.`);
    if (!Array.isArray(snapshot.normalizedArtifacts) || !snapshot.normalizedArtifacts.length) throw new Error(`${label} must contain normalized artifacts.`);
    await Promise.all(snapshot.normalizedArtifacts.map((artifact, index) => validateArtifact(artifact, { fixture, root, label: `${label} normalized artifact ${index + 1}`, raw: false })));
    if (!Array.isArray(snapshot.transformations) || !snapshot.transformations.length) throw new Error(`${label} must record its transformation chain.`);
    const transformationById = new Map();
    for (const transformation of snapshot.transformations) {
      assertObject(transformation, `${label} transformation`);
      rejectUnknownFields(transformation, ["id", "inputSha256", "notes", "outputSha256", "parameters", "tool"], `${label} transformation`);
      assertId(transformation.id, `${label} transformation id`);
      if (transformationById.has(transformation.id)) throw new Error(`${label} has a duplicate transformation ID.`);
      assertObject(transformation.tool, `${label} transformation tool`);
      rejectUnknownFields(transformation.tool, ["name", "version"], `${label} transformation tool`);
      assertString(transformation.tool.name, `${label} transformation tool name`);
      assertString(transformation.tool.version, `${label} transformation tool version`);
      if (!SHA256_PATTERN.test(transformation.inputSha256 || "") || !SHA256_PATTERN.test(transformation.outputSha256 || "")) throw new Error(`${label} transformation digests must be SHA-256 values.`);
      assertObject(transformation.parameters, `${label} transformation parameters`);
      assertString(transformation.notes, `${label} transformation notes`);
      transformationById.set(transformation.id, transformation);
    }
    for (const artifact of snapshot.normalizedArtifacts) {
      if (artifact.derivedFromSha256 !== snapshot.rawArtifact.sha256) throw new Error(`${label} normalized artifact must derive from the raw artifact digest.`);
      for (const transformationId of artifact.transformationIds) {
        const transformation = transformationById.get(transformationId);
        if (!transformation || transformation.inputSha256 !== snapshot.rawArtifact.sha256 || transformation.outputSha256 !== artifact.sha256) throw new Error(`${label} transformation chain does not link raw and normalized artifacts.`);
      }
    }
  }

  if (snapshot.state === "superseded" && snapshot.supersededBy === null) throw new Error(`${label} superseded state must identify its replacement.`);
  if (snapshot.state === "corrected" && snapshot.correctedBy === null) throw new Error(`${label} corrected state must identify its correction.`);
  if (snapshot.state === "unavailable" && snapshot.availability !== "unavailable") throw new Error(`${label} unavailable lifecycle state must record unavailable acquisition.`);
}

function validateManualReview(review) {
  assertObject(review, "Legal source manualReview");
  rejectUnknownFields(review, ["requiredFor", "reviewedAt", "reviewedBy", "status"], "Legal source manualReview");
  assertControlled(review.status, REVIEW_STATUSES, "Legal source manualReview status");
  assertStringArray(review.requiredFor, "Legal source manualReview requiredFor", { sorted: true });
  if (JSON.stringify(review.requiredFor) !== JSON.stringify(REVIEW_REQUIREMENTS)) throw new Error("Legal source review must cover authority, content bounds, currency, and rights.");
  if (review.status === "pending") {
    if (review.reviewedBy !== null || review.reviewedAt !== null) throw new Error("Pending legal source review must not claim a reviewer or review time.");
  } else {
    assertString(review.reviewedBy, "Legal source reviewedBy");
    assertTimestamp(review.reviewedAt, "Legal source reviewedAt");
  }
}

function validatePrivacy(privacy) {
  assertObject(privacy, "Legal source privacy");
  rejectUnknownFields(privacy, ["containsPrivateData", "containsUserQueries", "maximumSensitivity", "publicInputsOnly", "sourceContentIsInstructions"], "Legal source privacy");
  if (privacy.publicInputsOnly !== true || privacy.containsPrivateData !== false || privacy.containsUserQueries !== false || privacy.maximumSensitivity !== "public" || privacy.sourceContentIsInstructions !== false) throw new Error("Legal source manifests must preserve the public-only, evidence-not-instructions privacy boundary.");
}

function validateExport(exportRecord) {
  assertObject(exportRecord, "Legal source export");
  rejectUnknownFields(exportRecord, ["blockers", "contractVersion", "status", "target"], "Legal source export");
  if (exportRecord.target !== "aether-public-evidence") throw new Error("Legal source export target must be aether-public-evidence.");
  assertControlled(exportRecord.status, EXPORT_STATUSES, "Legal source export status");
  assertStringArray(exportRecord.blockers, "Legal source export blockers", { allowEmpty: true });
  if (exportRecord.status === "compatible") {
    assertString(exportRecord.contractVersion, "Legal source export contractVersion");
    if (exportRecord.blockers.length) throw new Error("Compatible legal source exports must not retain blockers.");
  } else if (!exportRecord.blockers.length) throw new Error("Non-compatible legal source exports must record blockers.");
}

export async function validateLegalSourceSnapshotManifest(manifest, { jurisdictionById = new Map(), root = process.cwd() } = {}) {
  assertObject(manifest, "Legal source snapshot manifest");
  rejectUnknownFields(manifest, ["$schema", "acquisition", "authorityType", "export", "fixture", "freshness", "jurisdictionId", "knownGaps", "manifestId", "manualReview", "privacy", "rights", "schemaVersion", "snapshots", "source"], "Legal source snapshot manifest");
  if (manifest.schemaVersion !== LEGAL_SOURCE_SNAPSHOT_SCHEMA_VERSION) throw new Error("Unsupported legal source snapshot schema version.");
  if (manifest.$schema !== "../schemas/legal-source-snapshot-v1.schema.json") throw new Error("Legal source fixture must identify the versioned repository schema.");
  assertId(manifest.manifestId, "Legal source manifestId");
  if (typeof manifest.fixture !== "boolean") throw new Error("Legal source fixture must be boolean.");
  if (!jurisdictionById.has(manifest.jurisdictionId)) throw new Error(`Legal source manifest references an unknown jurisdiction: ${manifest.jurisdictionId}.`);
  if (!LEGAL_SOURCE_COVERAGE_ROLES.includes(manifest.authorityType)) throw new Error("Legal source authorityType must use the jurisdiction coverage vocabulary.");
  validateSource(manifest.source);
  validateAcquisition(manifest.acquisition, manifest.fixture);
  validateRights(manifest.rights);
  validateFreshness(manifest.freshness);
  validateManualReview(manifest.manualReview);
  validatePrivacy(manifest.privacy);
  validateExport(manifest.export);
  assertStringArray(manifest.knownGaps, "Legal source knownGaps", { allowEmpty: true });
  if (!Array.isArray(manifest.snapshots) || !manifest.snapshots.length) throw new Error("Legal source manifest must contain snapshots.");
  if (JSON.stringify(manifest.snapshots.map((snapshot) => snapshot.id)) !== JSON.stringify([...manifest.snapshots.map((snapshot) => snapshot.id)].sort())) throw new Error("Legal source snapshots must be sorted by stable ID.");
  const snapshotIds = new Set();
  for (const snapshot of manifest.snapshots) {
    if (snapshotIds.has(snapshot.id)) throw new Error(`Duplicate legal snapshot ID: ${snapshot.id}.`);
    snapshotIds.add(snapshot.id);
    await validateSnapshot(snapshot, { fixture: manifest.fixture, root });
  }
  if (manifest.snapshots.filter((snapshot) => snapshot.state === "current").length > 1) throw new Error("A legal source manifest cannot claim multiple current snapshots.");
  const snapshotById = new Map(manifest.snapshots.map((snapshot) => [snapshot.id, snapshot]));
  const inverseRelations = new Map([
    ["supersedes", "supersededBy"],
    ["supersededBy", "supersedes"],
    ["corrects", "correctedBy"],
    ["correctedBy", "corrects"],
  ]);
  for (const snapshot of manifest.snapshots) {
    for (const [field, inverse] of inverseRelations) {
      if (snapshot[field] === null) continue;
      if (snapshot[field] === snapshot.id) throw new Error(`Legal snapshot ${snapshot.id} cannot reference itself through ${field}.`);
      const related = snapshotById.get(snapshot[field]);
      if (!related) throw new Error(`Legal snapshot ${snapshot.id} has an unknown ${field} reference.`);
      if (related[inverse] !== snapshot.id) throw new Error(`Legal snapshot ${snapshot.id} ${field} relation must be reciprocal.`);
    }
  }
  return { manifestId: manifest.manifestId, jurisdictionId: manifest.jurisdictionId, snapshotCount: manifest.snapshots.length };
}
