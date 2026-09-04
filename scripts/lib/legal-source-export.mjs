import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { validateLegalSourceSnapshotManifest } from "./legal-source-snapshots.mjs";

export const AETHER_EVIDENCE_PACKET_VERSION = "aether.cross-agent-evidence-packet/v1";
export const AETHER_EVIDENCE_PACKET_SEMVER = "1.0.0";
export const AETHER_EVIDENCE_POLICY = "egohygiene/hygiene#39";
export const AETHER_EVIDENCE_CAPABILITY = "public-evidence-import";

const LOCK_FIELDS = ["contractVersion", "repository", "revision", "schemaPath", "schemaSha256", "schemaUrl", "schemaVersion", "target"];
const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const REVISION_PATTERN = /^[a-f0-9]{40}$/;

function compareStrings(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort(compareStrings).map((key) => [key, canonicalize(value[key])]));
  return value;
}

export function aetherCanonicalJson(value) {
  return JSON.stringify(canonicalize(value)).replace(/[\u007f-\uffff]/g, (character) => `\\u${character.charCodeAt(0).toString(16).padStart(4, "0")}`);
}

export function aetherCanonicalSha256(value) {
  return createHash("sha256").update(aetherCanonicalJson(value)).digest("hex");
}

function assertObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} must be an object.`);
}

function assertExactFields(value, fields, label) {
  const actual = Object.keys(value).sort(compareStrings);
  const expected = [...fields].sort(compareStrings);
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`${label} fields do not match the pinned contract.`);
}

function assertSortedStrings(value, label) {
  if (!Array.isArray(value) || !value.length || value.some((item) => typeof item !== "string" || !item.trim())) throw new Error(`${label} must be a non-empty string array.`);
  if (new Set(value).size !== value.length) throw new Error(`${label} must not contain duplicates.`);
  if (JSON.stringify(value) !== JSON.stringify([...value].sort(compareStrings))) throw new Error(`${label} must be sorted.`);
}

export function validateAetherEvidenceContractLock(lock) {
  assertObject(lock, "Aether evidence contract lock");
  assertExactFields(lock, LOCK_FIELDS, "Aether evidence contract lock");
  if (lock.schemaVersion !== 1 || lock.target !== "aether-public-evidence" || lock.contractVersion !== AETHER_EVIDENCE_PACKET_VERSION) throw new Error("Unsupported Aether evidence contract lock.");
  if (lock.repository !== "egohygiene/aether") throw new Error("Aether evidence contract lock must identify the canonical repository.");
  if (!REVISION_PATTERN.test(lock.revision || "")) throw new Error("Aether evidence contract lock revision must be an immutable commit SHA.");
  if (lock.schemaPath !== "catalog/schemas/aether.cross-agent-evidence-packet.v1.schema.json") throw new Error("Aether evidence contract lock schema path is unsupported.");
  if (!SHA256_PATTERN.test(lock.schemaSha256 || "")) throw new Error("Aether evidence contract lock must include the schema SHA-256 digest.");
  const expectedUrl = `https://github.com/${lock.repository}/blob/${lock.revision}/${lock.schemaPath}`;
  if (lock.schemaUrl !== expectedUrl) throw new Error("Aether evidence contract lock URL must bind its repository, revision, and schema path.");
  return lock;
}

function validateManifestExportLock(manifest, lock) {
  if (manifest.export.status !== "compatible" || manifest.export.blockers.length) throw new Error("Legal source manifest is not compatible with Aether evidence export.");
  for (const field of ["contractVersion", "contractRevision", "schemaSha256"]) {
    const lockField = field === "contractRevision" ? "revision" : field;
    if (manifest.export[field] !== lock[lockField]) throw new Error(`Legal source manifest export ${field} does not match the pinned Aether contract.`);
  }
}

function sourceAuthority(manifest) {
  if (manifest.source.contentStatuses.includes("official") || manifest.source.contentStatuses.includes("authenticated")) return "official";
  if (manifest.source.contentStatuses.some((status) => ["unofficial", "archival", "derivative"].includes(status))) return "secondary";
  return "unknown";
}

function knownDateTimestamp(dateRecord, endOfDay = false) {
  if (dateRecord.status !== "known") return null;
  return `${dateRecord.value}T${endOfDay ? "23:59:59" : "00:00:00"}Z`;
}

function freshnessFor(snapshot) {
  const evaluatedAt = snapshot.response.retrievedAt;
  const validUntil = knownDateTimestamp(snapshot.dates.expires, true) || knownDateTimestamp(snapshot.dates.reviewDue, true);
  if (validUntil === null) return { status: "unknown", evaluated_at: evaluatedAt, valid_until: null };
  return {
    status: Date.parse(validUntil) < Date.parse(evaluatedAt) ? "stale" : "current",
    evaluated_at: evaluatedAt,
    valid_until: validUntil,
  };
}

function reviewDecision(manifest) {
  if (manifest.manualReview.status === "pending") return { status: "pending", reviewer: null, reviewed_at: null, evidence: null };
  return {
    status: "approved",
    reviewer: manifest.manualReview.reviewedBy,
    reviewed_at: manifest.manualReview.reviewedAt,
    evidence: `manifest/${manifest.manifestId}#manualReview`,
  };
}

function lifecycleFor(manifest, snapshot) {
  const freshness = freshnessFor(snapshot);
  const parserIssue = snapshot.parserCompatibility.find((entry) => entry.status !== "compatible");
  let state = "draft";
  let incompatibility = null;
  if (parserIssue) {
    state = "incompatible";
    incompatibility = `${parserIssue.parser}@${parserIssue.version} is ${parserIssue.status}.`;
  } else if (freshness.status === "stale") state = "stale";
  else if (manifest.manualReview.status === "reviewed" && freshness.status === "current") state = "ready";
  return {
    state,
    freshness,
    expires_at: knownDateTimestamp(snapshot.dates.expires, true) || knownDateTimestamp(snapshot.dates.reviewDue, true),
    superseded_by: null,
    revocation: null,
    incompatibility,
    partial_failures: [],
  };
}

function rightsSummary(rights) {
  return [
    `status=${rights.status}`,
    `redistribution=${rights.redistribution}`,
    `quotation=${rights.quotation}`,
    `license=${rights.licenseExpression || "not-supplied"}`,
    `terms=${rights.termsUrl || "not-supplied"}`,
  ].join("; ");
}

function attachmentRecords(snapshot) {
  const artifacts = [snapshot.rawArtifact, ...snapshot.normalizedArtifacts];
  return artifacts.map((artifact, index) => ({
    id: `attachment/${snapshot.id}/${index === 0 ? "raw" : `normalized-${index}`}`,
    kind: "relative-file",
    path: artifact.path,
    url: null,
    media_type: artifact.mediaType,
    bytes: artifact.bytes,
    digest: { algorithm: "sha256-bytes", value: artifact.sha256 },
    sensitivity: "public",
    content_treatment: "untrusted-evidence",
  }));
}

function transformationRecords(snapshot, attachments) {
  const attachmentByDigest = new Map(attachments.map((attachment) => [attachment.digest.value, attachment.id]));
  return snapshot.transformations.map((transformation) => ({
    id: `transform/${transformation.id}`,
    operation: "akashic-legal-source-normalization",
    input_refs: [attachmentByDigest.get(transformation.inputSha256)],
    output_refs: [attachmentByDigest.get(transformation.outputSha256)],
  }));
}

function toolRecords(manifest, snapshot) {
  const records = [manifest.acquisition.tool, ...snapshot.transformations.map((item) => item.tool)];
  return [...new Map(records.map((item) => [`${item.name}@${item.version}`, { name: item.name, version: item.version }])).values()]
    .sort((left, right) => compareStrings(`${left.name}@${left.version}`, `${right.name}@${right.version}`));
}

function sourceRecord(manifest, snapshot, attachments) {
  const normalizedAttachments = attachments.slice(1);
  return {
    id: `source/${manifest.manifestId}`,
    url: manifest.source.canonicalUrl,
    stable_source_id: snapshot.id,
    authority: sourceAuthority(manifest),
    jurisdiction_id: manifest.jurisdictionId,
    retrieved_at: snapshot.response.retrievedAt,
    effective_at: knownDateTimestamp(snapshot.dates.effective),
    rights: rightsSummary(manifest.rights),
    digest: { algorithm: "sha256-bytes", value: snapshot.rawArtifact.sha256 },
    attachment_ids: attachments.map((attachment) => attachment.id),
    excerpts: normalizedAttachments.map((attachment, index) => ({
      id: `excerpt/${snapshot.id}/normalized-${index + 1}`,
      attachment_id: attachment.id,
      start_byte: 0,
      end_byte: attachment.bytes,
      digest: { algorithm: "sha256-bytes", value: attachment.digest.value },
    })),
  };
}

function packetReview(manifest) {
  const decision = reviewDecision(manifest);
  return {
    human: structuredClone(decision),
    sanitization: structuredClone(decision),
    declassification: { status: "not-applicable", reviewer: null, reviewed_at: null, evidence: null },
  };
}

function packetEnvelope(packet) {
  return { schema_version: packet.schema_version, packet: packet.packet, payload: packet.payload };
}

function selectSnapshot(manifest, snapshotId) {
  const snapshot = snapshotId
    ? manifest.snapshots.find((candidate) => candidate.id === snapshotId)
    : manifest.snapshots.find((candidate) => candidate.state === "current");
  if (!snapshot) throw new Error(snapshotId ? `Unknown legal source snapshot: ${snapshotId}.` : "Legal source export requires an explicit snapshot or one current snapshot.");
  if (snapshot.availability !== "available" || snapshot.rawArtifact === null || !snapshot.normalizedArtifacts.length) throw new Error("Aether evidence export requires captured raw and normalized public artifacts.");
  return snapshot;
}

export async function createAetherLegalSourceEvidencePacket(manifest, contractLock, {
  destinationScope = ["egohygiene/realm#25"],
  jurisdictionById = new Map(),
  requiredPolicyIds = [AETHER_EVIDENCE_POLICY],
  requiredSessionCapabilities = [AETHER_EVIDENCE_CAPABILITY],
  root = process.cwd(),
  snapshotId = null,
} = {}) {
  validateAetherEvidenceContractLock(contractLock);
  await validateLegalSourceSnapshotManifest(manifest, { jurisdictionById, root });
  validateManifestExportLock(manifest, contractLock);
  assertSortedStrings(destinationScope, "Aether evidence destination scope");
  assertSortedStrings(requiredPolicyIds, "Aether evidence required policy IDs");
  assertSortedStrings(requiredSessionCapabilities, "Aether evidence required session capabilities");

  const snapshot = selectSnapshot(manifest, snapshotId);
  const attachments = attachmentRecords(snapshot);
  const source = sourceRecord(manifest, snapshot, attachments);
  const manifestDigest = aetherCanonicalSha256(manifest);
  const packet = {
    schema_version: contractLock.contractVersion,
    packet: {
      id: `packet/${manifest.manifestId}/${snapshot.id}`,
      version: AETHER_EVIDENCE_PACKET_SEMVER,
      producer: "egohygiene/akashic",
      workflow_id: "legal-source-snapshot-export",
      revision: manifestDigest,
      created_at: snapshot.response.retrievedAt,
    },
    payload: {
      request: {
        id: `task/${manifest.manifestId}/${snapshot.id}`,
        objective: "Transfer one immutable public legal-source snapshot as bounded evidence.",
        scope: [manifest.authorityType, manifest.jurisdictionId, snapshot.id].sort(compareStrings),
        public_inputs_only: true,
      },
      evidence: { attachments, sources: [source] },
      findings: {
        items: [],
        rejected_claims: [
          "The source controls or applies to a private dispute.",
          "The packet provides legal advice or authorizes an action.",
        ],
        overall_limitations: [
          `Akashic snapshot lifecycle state: ${snapshot.state}.`,
          manifest.source.contentBounds,
          ...snapshot.limitations,
          ...manifest.knownGaps,
        ],
      },
      provenance: {
        transformations: transformationRecords(snapshot, attachments),
        tools: toolRecords(manifest, snapshot),
      },
      policy: {
        destination_scope: destinationScope,
        maximum_sensitivity: "public",
        required_policy_ids: requiredPolicyIds,
        required_session_capabilities: requiredSessionCapabilities,
        grants_capabilities: false,
        max_attachment_count: attachments.length,
        max_attachment_bytes: attachments.reduce((total, attachment) => total + attachment.bytes, 0),
        contains_private_data: false,
      },
      review: packetReview(manifest),
      lifecycle: lifecycleFor(manifest, snapshot),
    },
    integrity: {
      envelope_digest: { algorithm: "sha256-canonical-json", value: "" },
      signature: { status: "unsigned", algorithm: null, key_id: null, value: null },
    },
  };
  packet.integrity.envelope_digest.value = aetherCanonicalSha256(packetEnvelope(packet));
  return packet;
}

export async function verifyAetherPacketAttachmentBytes(packet, { root = process.cwd() } = {}) {
  for (const attachment of packet.payload.evidence.attachments) {
    const resolved = path.resolve(root, attachment.path);
    const relative = path.relative(root, resolved);
    if (relative.startsWith("..") || path.isAbsolute(relative) || attachment.path.includes("\\")) throw new Error("Aether packet attachment path escapes its declared root.");
    const contents = await readFile(resolved);
    const digest = createHash("sha256").update(contents).digest("hex");
    if (contents.length !== attachment.bytes || digest !== attachment.digest.value) throw new Error(`Aether packet attachment does not match declared bytes: ${attachment.id}.`);
  }
  return true;
}

export function formatAetherLegalSourceEvidencePacket(packet) {
  return [
    `Packet: ${packet.packet.id}`,
    `Contract: ${packet.schema_version}`,
    `Revision: ${packet.packet.revision}`,
    `State: ${packet.payload.lifecycle.state}`,
    `Attachments: ${packet.payload.evidence.attachments.length}`,
    `Envelope SHA-256: ${packet.integrity.envelope_digest.value}`,
    "Transport authorized: no",
    "",
  ].join("\n");
}
