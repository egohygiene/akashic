import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { aetherCanonicalSha256 } from "./legal-source-export.mjs";
import { validateLegalSourceSnapshotManifest } from "./legal-source-snapshots.mjs";

export const LEGAL_SOURCE_PACK_SCHEMA_VERSION = 1;
export const EMPLOYMENT_PACK_SUBJECTS = Object.freeze([
  "benefits",
  "discrimination",
  "filing-and-deadlines",
  "leave",
  "personnel-records",
  "release-and-waiver",
  "unemployment",
  "wage-and-payment",
]);

const AUTHORITY_STATUSES = new Set([
  "official-guidance",
  "official-primary",
  "official-primary-unofficial-presentation",
  "official-self-help",
  "official-service-or-form",
  "secondary-official",
]);
const CURRENTNESS_STATUSES = new Set(["current", "historical", "mixed", "unknown"]);
const MATERIAL_TYPES = new Set([
  "agency-guidance",
  "codified-law",
  "filing-pathway",
  "legal-edition",
  "official-form",
  "regulation",
  "rulemaking-history",
  "self-help",
  "session-law-history",
  "topic-guide",
]);
const RIGHTS_STATUSES = new Set(["public-domain-with-exceptions", "restricted", "unknown"]);
const SNAPSHOT_STATUSES = new Set(["linked-synthetic-proof", "metadata-only"]);
const EVALUATION_DIMENSIONS = new Set(["citation", "conflicting-sources", "date", "jurisdiction", "uncertainty"]);
const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SHA256_PATTERN = /^[a-f0-9]{64}$/;

function compareStrings(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function assertObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} must be an object.`);
}

function assertExactFields(value, fields, label) {
  const actual = Object.keys(value).sort(compareStrings);
  const expected = [...fields].sort(compareStrings);
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`${label} fields do not match schema v1: ${actual.join(", ")}.`);
}

function assertString(value, label) {
  if (typeof value !== "string" || !value.trim() || value !== value.trim()) throw new Error(`${label} must be a trimmed non-empty string.`);
}

function assertId(value, label) {
  if (!ID_PATTERN.test(value || "")) throw new Error(`${label} must be a stable lowercase ID.`);
}

function assertSortedUniqueStrings(value, label, { allowEmpty = false, sorted = true } = {}) {
  if (!Array.isArray(value) || (!allowEmpty && !value.length) || value.some((item) => typeof item !== "string" || !item.trim() || item !== item.trim())) throw new Error(`${label} must be ${allowEmpty ? "an" : "a non-empty"} array of trimmed strings.`);
  if (new Set(value).size !== value.length) throw new Error(`${label} must not contain duplicates.`);
  if (sorted && JSON.stringify(value) !== JSON.stringify([...value].sort(compareStrings))) throw new Error(`${label} must be sorted.`);
}

function assertTimestamp(value, label) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(value) || Number.isNaN(Date.parse(value))) throw new Error(`${label} must be a UTC timestamp without fractional seconds.`);
}

function assertDate(value, label) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`))) throw new Error(`${label} must be a date.`);
}

function assertHttpsUrl(value, label) {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "https:" || parsed.username || parsed.password) throw new Error();
  } catch {
    throw new Error(`${label} must be a credential-free HTTPS URL.`);
  }
}

function safeRepositoryPath(root, value, prefix, label) {
  assertString(value, label);
  if (path.isAbsolute(value) || value.includes("\\")) throw new Error(`${label} must be a repository-relative POSIX path.`);
  const normalized = path.posix.normalize(value);
  if (normalized !== value || !normalized.startsWith(prefix)) throw new Error(`${label} must stay inside ${prefix}.`);
  const resolved = path.resolve(root, value);
  const relative = path.relative(root, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) throw new Error(`${label} escapes the repository.`);
  return resolved;
}

function validateDateRecord(record, label) {
  assertObject(record, label);
  assertExactFields(record, ["status", "value"], label);
  if (!["known", "not-applicable", "unknown"].includes(record.status)) throw new Error(`${label} has an unsupported status.`);
  if (record.status === "known") assertDate(record.value, `${label} value`);
  else if (record.value !== null) throw new Error(`${label} ${record.status} value must be null.`);
}

function sourceDigestInput(source) {
  const clone = structuredClone(source);
  clone.integrity.recordSha256 = "";
  return clone;
}

export function legalSourcePackRecordSha256(source) {
  return aetherCanonicalSha256(sourceDigestInput(source));
}

async function validatePackSource(source, { jurisdictionById, root, manifestByPath }) {
  const label = `Legal source pack source ${source?.id || "unknown"}`;
  assertObject(source, label);
  assertExactFields(source, ["authorityStatus", "availability", "canonicalUrl", "currentnessStatus", "dates", "id", "inclusionRationale", "integrity", "issuingBody", "limitations", "materialType", "metadataReview", "name", "publisher", "rights", "subjects", "supersededBy", "jurisdictionId"], label);
  assertId(source.id, `${label} id`);
  if (!jurisdictionById.has(source.jurisdictionId)) throw new Error(`${label} references an unknown jurisdiction.`);
  if (!AUTHORITY_STATUSES.has(source.authorityStatus)) throw new Error(`${label} authorityStatus is unsupported.`);
  if (!MATERIAL_TYPES.has(source.materialType)) throw new Error(`${label} materialType is unsupported.`);
  if (!CURRENTNESS_STATUSES.has(source.currentnessStatus)) throw new Error(`${label} currentnessStatus is unsupported.`);
  for (const field of ["name", "issuingBody", "publisher", "inclusionRationale"]) assertString(source[field], `${label} ${field}`);
  assertHttpsUrl(source.canonicalUrl, `${label} canonicalUrl`);
  assertSortedUniqueStrings(source.subjects, `${label} subjects`);
  if (source.subjects.some((subject) => !EMPLOYMENT_PACK_SUBJECTS.includes(subject))) throw new Error(`${label} has an unsupported subject.`);
  assertSortedUniqueStrings(source.limitations, `${label} limitations`, { sorted: false });
  if (!["available", "unavailable", "unknown"].includes(source.availability)) throw new Error(`${label} availability is unsupported.`);
  if (source.supersededBy !== null) assertId(source.supersededBy, `${label} supersededBy`);

  assertObject(source.dates, `${label} dates`);
  assertExactFields(source.dates, ["currentThrough", "effective", "observed", "publication", "reviewDue"], `${label} dates`);
  for (const field of ["publication", "effective", "currentThrough"]) validateDateRecord(source.dates[field], `${label} ${field}`);
  assertDate(source.dates.observed, `${label} observed`);
  assertDate(source.dates.reviewDue, `${label} reviewDue`);

  assertObject(source.rights, `${label} rights`);
  assertExactFields(source.rights, ["notes", "quotation", "redistribution", "status", "termsUrl"], `${label} rights`);
  if (!RIGHTS_STATUSES.has(source.rights.status)) throw new Error(`${label} rights status is unsupported.`);
  if (!["fair-use-only", "review-required", "unknown"].includes(source.rights.quotation) || !["review-required", "unknown"].includes(source.rights.redistribution)) throw new Error(`${label} rights must remain review bounded.`);
  if (source.rights.termsUrl !== null) assertHttpsUrl(source.rights.termsUrl, `${label} rights termsUrl`);
  assertString(source.rights.notes, `${label} rights notes`);
  if (source.rights.status === "unknown" && (source.rights.quotation !== "unknown" || source.rights.redistribution !== "unknown")) throw new Error(`${label} unknown rights must fail closed.`);

  assertObject(source.metadataReview, `${label} metadataReview`);
  assertExactFields(source.metadataReview, ["humanStatus", "reviewedAt", "reviewer", "status"], `${label} metadataReview`);
  if (source.metadataReview.status !== "reviewed" || source.metadataReview.humanStatus !== "pending") throw new Error(`${label} must preserve reviewed metadata and pending human approval separately.`);
  assertString(source.metadataReview.reviewer, `${label} metadata reviewer`);
  assertTimestamp(source.metadataReview.reviewedAt, `${label} metadata reviewedAt`);

  assertObject(source.integrity, `${label} integrity`);
  assertExactFields(source.integrity, ["recordSha256", "snapshot"], `${label} integrity`);
  if (!SHA256_PATTERN.test(source.integrity.recordSha256 || "") || source.integrity.recordSha256 !== legalSourcePackRecordSha256(source)) throw new Error(`${label} record digest does not match its canonical metadata.`);
  const snapshot = source.integrity.snapshot;
  assertObject(snapshot, `${label} snapshot integrity`);
  assertExactFields(snapshot, ["manifestPath", "normalizedArtifactPath", "note", "sha256", "snapshotId", "status"], `${label} snapshot integrity`);
  if (!SNAPSHOT_STATUSES.has(snapshot.status)) throw new Error(`${label} snapshot status is unsupported.`);
  assertString(snapshot.note, `${label} snapshot note`);
  if (snapshot.status === "metadata-only") {
    for (const field of ["manifestPath", "normalizedArtifactPath", "sha256", "snapshotId"]) if (snapshot[field] !== null) throw new Error(`${label} metadata-only source must not claim immutable source bytes.`);
    return;
  }

  if (!SHA256_PATTERN.test(snapshot.sha256 || "")) throw new Error(`${label} linked snapshot must include a SHA-256 digest.`);
  assertId(snapshot.snapshotId, `${label} linked snapshotId`);
  const manifestPath = snapshot.manifestPath;
  const artifactPath = snapshot.normalizedArtifactPath;
  safeRepositoryPath(root, manifestPath, "research/legal/fixtures/", `${label} manifestPath`);
  const artifactFile = safeRepositoryPath(root, artifactPath, "research/legal/fixtures/artifacts/", `${label} normalizedArtifactPath`);
  const manifest = manifestByPath.get(manifestPath) || JSON.parse(await readFile(path.join(root, manifestPath), "utf8"));
  await validateLegalSourceSnapshotManifest(manifest, { jurisdictionById, root });
  const manifestSnapshot = manifest.snapshots.find((item) => item.id === snapshot.snapshotId);
  const artifact = manifestSnapshot?.normalizedArtifacts.find((item) => item.path === artifactPath);
  if (!manifestSnapshot || !artifact || artifact.sha256 !== snapshot.sha256) throw new Error(`${label} immutable snapshot link does not match its manifest.`);
  const bytes = await readFile(artifactFile);
  if (createHash("sha256").update(bytes).digest("hex") !== snapshot.sha256) throw new Error(`${label} immutable snapshot bytes do not match.`);
}

async function validateCitation(citation, { sourceById, root }) {
  const label = `Legal source pack citation ${citation?.id || "unknown"}`;
  assertObject(citation, label);
  assertExactFields(citation, ["artifactPath", "artifactSha256", "citationText", "endByte", "id", "sourceId", "spanSha256", "startByte"], label);
  assertId(citation.id, `${label} id`);
  const source = sourceById.get(citation.sourceId);
  if (!source) throw new Error(`${label} references an unknown source.`);
  if (source.integrity.snapshot.status !== "linked-synthetic-proof" || source.integrity.snapshot.normalizedArtifactPath !== citation.artifactPath || source.integrity.snapshot.sha256 !== citation.artifactSha256) throw new Error(`${label} must bind its source's normalized immutable artifact.`);
  if (!Number.isInteger(citation.startByte) || !Number.isInteger(citation.endByte) || citation.startByte < 0 || citation.endByte <= citation.startByte) throw new Error(`${label} byte span is invalid.`);
  if (!SHA256_PATTERN.test(citation.spanSha256 || "")) throw new Error(`${label} span digest is invalid.`);
  assertString(citation.citationText, `${label} citationText`);
  const bytes = await readFile(safeRepositoryPath(root, citation.artifactPath, "research/legal/fixtures/artifacts/", `${label} artifactPath`));
  if (createHash("sha256").update(bytes).digest("hex") !== citation.artifactSha256 || citation.endByte > bytes.length) throw new Error(`${label} artifact digest or bounds do not match.`);
  const span = bytes.subarray(citation.startByte, citation.endByte);
  if (createHash("sha256").update(span).digest("hex") !== citation.spanSha256 || span.toString("utf8") !== citation.citationText) throw new Error(`${label} exact byte span does not match its citation text.`);
}

export async function validateLegalSourcePack(pack, {
  jurisdictionById = new Map(),
  manifestByPath = new Map(),
  root = process.cwd(),
} = {}) {
  assertObject(pack, "Legal source pack");
  assertExactFields(pack, ["$schema", "baseline", "citations", "coverage", "evaluations", "export", "knownOmissions", "manualReview", "notice", "packId", "privacy", "refreshPolicy", "schemaVersion", "sources", "title", "version"], "Legal source pack");
  if (pack.$schema !== "../schemas/legal-source-pack-v1.schema.json" || pack.schemaVersion !== LEGAL_SOURCE_PACK_SCHEMA_VERSION || pack.version !== "1.0.0") throw new Error("Unsupported legal source pack schema or version.");
  assertId(pack.packId, "Legal source pack ID");
  for (const field of ["title", "notice"]) assertString(pack[field], `Legal source pack ${field}`);

  assertObject(pack.baseline, "Legal source pack baseline");
  assertExactFields(pack.baseline, ["applicability", "comparativeClaims", "jurisdictionIds", "observedAt", "scope", "subjects"], "Legal source pack baseline");
  assertTimestamp(pack.baseline.observedAt, "Legal source pack observedAt");
  if (pack.baseline.comparativeClaims !== false) throw new Error("Legal source pack must not make comparative legal claims.");
  assertSortedUniqueStrings(pack.baseline.jurisdictionIds, "Legal source pack jurisdictions");
  if (JSON.stringify(pack.baseline.jurisdictionIds) !== JSON.stringify(["us-federal", "us-ma"])) throw new Error("Employment pack v1 must keep the federal and Massachusetts boundary explicit.");
  for (const jurisdictionId of pack.baseline.jurisdictionIds) if (!jurisdictionById.has(jurisdictionId)) throw new Error(`Legal source pack references an unknown jurisdiction: ${jurisdictionId}.`);
  assertSortedUniqueStrings(pack.baseline.subjects, "Legal source pack subjects");
  if (JSON.stringify(pack.baseline.subjects) !== JSON.stringify(EMPLOYMENT_PACK_SUBJECTS)) throw new Error("Employment pack must explicitly cover every baseline subject.");
  assertString(pack.baseline.scope, "Legal source pack scope");
  assertObject(pack.baseline.applicability, "Legal source pack applicability");
  assertExactFields(pack.baseline.applicability, ["rule", "status"], "Legal source pack applicability");
  if (pack.baseline.applicability.status !== "not-determined") throw new Error("Legal source pack must not infer applicability from source inclusion or geography.");
  assertString(pack.baseline.applicability.rule, "Legal source pack applicability rule");

  if (!Array.isArray(pack.sources) || !pack.sources.length) throw new Error("Legal source pack sources must be non-empty.");
  const sourceById = new Map();
  for (const source of pack.sources) {
    if (sourceById.has(source.id)) throw new Error(`Duplicate legal source pack source ID: ${source.id}.`);
    await validatePackSource(source, { jurisdictionById, root, manifestByPath });
    sourceById.set(source.id, source);
  }
  if (JSON.stringify([...sourceById.keys()]) !== JSON.stringify([...sourceById.keys()].sort(compareStrings))) throw new Error("Legal source pack sources must be sorted by ID.");

  assertObject(pack.coverage, "Legal source pack coverage");
  if (JSON.stringify(Object.keys(pack.coverage).sort(compareStrings)) !== JSON.stringify(EMPLOYMENT_PACK_SUBJECTS)) throw new Error("Legal source pack coverage must address each baseline subject exactly once.");
  for (const subject of EMPLOYMENT_PACK_SUBJECTS) {
    const entry = pack.coverage[subject];
    assertObject(entry, `Legal source pack coverage ${subject}`);
    assertExactFields(entry, ["limitations", "sourceIds"], `Legal source pack coverage ${subject}`);
    assertSortedUniqueStrings(entry.sourceIds, `Legal source pack coverage ${subject} sourceIds`);
    assertSortedUniqueStrings(entry.limitations, `Legal source pack coverage ${subject} limitations`, { sorted: false });
    for (const sourceId of entry.sourceIds) {
      const source = sourceById.get(sourceId);
      if (!source || !source.subjects.includes(subject)) throw new Error(`Coverage ${subject} references an incompatible source: ${sourceId}.`);
    }
  }

  const distinctions = new Set(pack.sources.map((source) => source.authorityStatus));
  for (const required of ["official-guidance", "official-primary", "official-primary-unofficial-presentation", "official-self-help", "official-service-or-form", "secondary-official"]) if (!distinctions.has(required)) throw new Error(`Legal source pack must preserve authority distinction: ${required}.`);
  if (!pack.sources.some((source) => source.currentnessStatus === "historical")) throw new Error("Legal source pack must keep historical material distinguishable.");
  const materialTypes = new Set(pack.sources.map((source) => source.materialType));
  for (const required of ["official-form", "self-help", "session-law-history"]) if (!materialTypes.has(required)) throw new Error(`Legal source pack must preserve material distinction: ${required}.`);

  if (!Array.isArray(pack.citations) || !pack.citations.length) throw new Error("Legal source pack must include stable citation proofs.");
  const citationIds = new Set();
  for (const citation of pack.citations) {
    if (citationIds.has(citation.id)) throw new Error(`Duplicate legal source pack citation ID: ${citation.id}.`);
    await validateCitation(citation, { sourceById, root });
    citationIds.add(citation.id);
  }

  if (!Array.isArray(pack.evaluations) || !pack.evaluations.length) throw new Error("Legal source pack evaluations must be non-empty.");
  const dimensions = new Set();
  for (const evaluation of pack.evaluations) {
    assertObject(evaluation, `Legal source pack evaluation ${evaluation?.id || "unknown"}`);
    assertExactFields(evaluation, ["dimensions", "expectedBehavior", "id", "question", "synthetic"], `Legal source pack evaluation ${evaluation?.id || "unknown"}`);
    assertId(evaluation.id, "Legal source pack evaluation ID");
    if (evaluation.synthetic !== true) throw new Error("Legal source pack evaluations must contain synthetic questions only.");
    assertString(evaluation.question, `Legal source pack evaluation ${evaluation.id} question`);
    assertString(evaluation.expectedBehavior, `Legal source pack evaluation ${evaluation.id} expectedBehavior`);
    assertSortedUniqueStrings(evaluation.dimensions, `Legal source pack evaluation ${evaluation.id} dimensions`);
    for (const dimension of evaluation.dimensions) {
      if (!EVALUATION_DIMENSIONS.has(dimension)) throw new Error(`Unsupported legal source pack evaluation dimension: ${dimension}.`);
      dimensions.add(dimension);
    }
  }
  for (const required of ["citation", "conflicting-sources", "date", "jurisdiction", "uncertainty"]) if (!dimensions.has(required)) throw new Error(`Legal source pack evaluations do not prove ${required} behavior.`);

  assertObject(pack.manualReview, "Legal source pack manualReview");
  assertExactFields(pack.manualReview, ["requiredBefore", "status"], "Legal source pack manualReview");
  if (pack.manualReview.status !== "pending" || JSON.stringify(pack.manualReview.requiredBefore) !== JSON.stringify(["comparative-claims", "coverage-expansion", "legal-use"])) throw new Error("Legal source pack must require pending human review before expansion, comparison, or legal use.");
  assertObject(pack.refreshPolicy, "Legal source pack refreshPolicy");
  assertExactFields(pack.refreshPolicy, ["cadence", "onChange", "preserveHistory", "triggers"], "Legal source pack refreshPolicy");
  if (pack.refreshPolicy.cadence !== "source-review-due" || pack.refreshPolicy.onChange !== "require-human-review" || pack.refreshPolicy.preserveHistory !== true) throw new Error("Legal source pack refresh policy must be review-due, history-preserving, and human-gated.");
  assertSortedUniqueStrings(pack.refreshPolicy.triggers, "Legal source pack refresh triggers");
  if (JSON.stringify(pack.refreshPolicy.triggers) !== JSON.stringify(["authority-change", "content-change", "review-due", "source-unavailable", "supersession"])) throw new Error("Legal source pack refresh triggers are incomplete.");
  assertObject(pack.privacy, "Legal source pack privacy");
  assertExactFields(pack.privacy, ["containsPrivateData", "containsUserQueries", "publicInputsOnly", "syntheticEvaluationsOnly"], "Legal source pack privacy");
  if (pack.privacy.publicInputsOnly !== true || pack.privacy.containsPrivateData !== false || pack.privacy.containsUserQueries !== false || pack.privacy.syntheticEvaluationsOnly !== true) throw new Error("Legal source pack violates the public-only privacy boundary.");
  assertObject(pack.export, "Legal source pack export");
  assertExactFields(pack.export, ["contractRevision", "contractVersion", "schemaSha256", "status", "target"], "Legal source pack export");
  if (pack.export.target !== "aether-public-evidence" || pack.export.status !== "compatible") throw new Error("Legal source pack is not marked compatible for deterministic public export.");
  if (!/^[a-f0-9]{40}$/.test(pack.export.contractRevision || "") || !SHA256_PATTERN.test(pack.export.schemaSha256 || "")) throw new Error("Legal source pack export lock is invalid.");
  assertSortedUniqueStrings(pack.knownOmissions, "Legal source pack knownOmissions", { sorted: false });

  return {
    packId: pack.packId,
    sourceCount: pack.sources.length,
    citationCount: pack.citations.length,
    evaluationCount: pack.evaluations.length,
    digest: aetherCanonicalSha256(pack),
  };
}

export function createLegalSourcePackRefreshReport(baseline, candidate, { asOf } = {}) {
  assertDate(asOf, "Legal source pack refresh asOf");
  if (baseline.packId !== candidate.packId) throw new Error("Legal source pack refresh requires the same stable pack ID.");
  const baselineById = new Map(baseline.sources.map((source) => [source.id, source]));
  const candidateById = new Map(candidate.sources.map((source) => [source.id, source]));
  const added = [...candidateById.keys()].filter((id) => !baselineById.has(id)).sort(compareStrings);
  const changed = [...candidateById.keys()].filter((id) => baselineById.has(id) && baselineById.get(id).integrity.recordSha256 !== candidateById.get(id).integrity.recordSha256).sort(compareStrings);
  const stale = candidate.sources.filter((source) => source.dates.reviewDue < asOf).map((source) => source.id).sort(compareStrings);
  const unavailable = candidate.sources.filter((source) => source.availability === "unavailable").map((source) => source.id).sort(compareStrings);
  const superseded = candidate.sources.filter((source) => source.supersededBy !== null).map((source) => source.id).sort(compareStrings);
  return {
    schemaVersion: 1,
    packId: baseline.packId,
    asOf,
    baselineDigest: aetherCanonicalSha256(baseline),
    candidateDigest: aetherCanonicalSha256(candidate),
    added,
    changed,
    stale,
    unavailable,
    superseded,
    requiresHumanReview: [added, changed, stale, unavailable, superseded].some((items) => items.length),
  };
}

export function formatLegalSourcePackRefreshReport(report) {
  const render = (label, values) => `${label}: ${values.length ? values.join(", ") : "none"}`;
  return [
    `Pack: ${report.packId}`,
    `As of: ${report.asOf}`,
    render("Added", report.added),
    render("Changed", report.changed),
    render("Stale", report.stale),
    render("Unavailable", report.unavailable),
    render("Superseded", report.superseded),
    `Human review required: ${report.requiresHumanReview ? "yes" : "no"}`,
    "",
  ].join("\n");
}
