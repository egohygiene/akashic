import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  AETHER_EVIDENCE_CAPABILITY,
  AETHER_EVIDENCE_PACKET_SEMVER,
  AETHER_EVIDENCE_POLICY,
  aetherCanonicalSha256,
  createAetherLegalSourceEvidencePacket,
  validateAetherEvidenceContractLock,
} from "./legal-source-export.mjs";
import { validateLegalSourcePack } from "./legal-source-packs.mjs";

function compareStrings(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function assertSortedStrings(value, label) {
  if (!Array.isArray(value) || !value.length || value.some((item) => typeof item !== "string" || !item.trim())) throw new Error(`${label} must be a non-empty string array.`);
  if (new Set(value).size !== value.length || JSON.stringify(value) !== JSON.stringify([...value].sort(compareStrings))) throw new Error(`${label} must be unique and sorted.`);
}

function safePackPath(root, packPath) {
  if (typeof packPath !== "string" || path.isAbsolute(packPath) || packPath.includes("\\") || path.posix.normalize(packPath) !== packPath || !packPath.startsWith("research/legal/packs/")) throw new Error("Legal source pack export path must stay inside research/legal/packs/.");
  const resolved = path.resolve(root, packPath);
  const relative = path.relative(root, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) throw new Error("Legal source pack export path escapes the repository.");
  return resolved;
}

function packetEnvelope(packet) {
  return { schema_version: packet.schema_version, packet: packet.packet, payload: packet.payload };
}

function packAttachment(pack, packPath, bytes) {
  return {
    id: `attachment/${pack.packId}/inventory`,
    kind: "relative-file",
    path: packPath,
    url: null,
    media_type: "application/json",
    bytes: bytes.length,
    digest: { algorithm: "sha256-bytes", value: createHash("sha256").update(bytes).digest("hex") },
    sensitivity: "public",
    content_treatment: "untrusted-evidence",
  };
}

function packSource(pack, attachment) {
  return {
    id: `source/${pack.packId}/inventory`,
    url: null,
    stable_source_id: pack.packId,
    authority: "secondary",
    jurisdiction_id: "us-federal+us-ma",
    retrieved_at: pack.baseline.observedAt,
    effective_at: null,
    rights: "curated metadata only; source-specific rights remain in the attached inventory",
    digest: structuredClone(attachment.digest),
    attachment_ids: [attachment.id],
    excerpts: [{
      id: `excerpt/${pack.packId}/inventory`,
      attachment_id: attachment.id,
      start_byte: 0,
      end_byte: attachment.bytes,
      digest: structuredClone(attachment.digest),
    }],
  };
}

function sourcePacketCitationExcerpts(sourcePacket, citations) {
  const source = structuredClone(sourcePacket.payload.evidence.sources[0]);
  const attachmentByPath = new Map(sourcePacket.payload.evidence.attachments.map((attachment) => [attachment.path, attachment]));
  source.excerpts = citations.map((citation) => {
    const attachment = attachmentByPath.get(citation.artifactPath);
    if (!attachment) throw new Error(`Pack citation ${citation.id} has no exported source attachment.`);
    return {
      id: `excerpt/${citation.id}`,
      attachment_id: attachment.id,
      start_byte: citation.startByte,
      end_byte: citation.endByte,
      digest: { algorithm: "sha256-bytes", value: citation.spanSha256 },
    };
  });
  return source;
}

export async function createAetherLegalSourcePackEvidencePacket(pack, contractLock, {
  destinationScope = ["egohygiene/realm#25"],
  jurisdictionById = new Map(),
  manifestByPath = new Map(),
  packPath,
  requiredPolicyIds = [AETHER_EVIDENCE_POLICY],
  requiredSessionCapabilities = [AETHER_EVIDENCE_CAPABILITY],
  root = process.cwd(),
} = {}) {
  validateAetherEvidenceContractLock(contractLock);
  const validated = await validateLegalSourcePack(pack, { jurisdictionById, manifestByPath, root });
  if (pack.export.contractVersion !== contractLock.contractVersion || pack.export.contractRevision !== contractLock.revision || pack.export.schemaSha256 !== contractLock.schemaSha256) throw new Error("Legal source pack export does not match the pinned Aether contract.");
  assertSortedStrings(destinationScope, "Aether pack destination scope");
  assertSortedStrings(requiredPolicyIds, "Aether pack required policy IDs");
  assertSortedStrings(requiredSessionCapabilities, "Aether pack required session capabilities");

  const packBytes = await readFile(safePackPath(root, packPath));
  const inventoryAttachment = packAttachment(pack, packPath, packBytes);
  const attachments = [inventoryAttachment];
  const sources = [packSource(pack, inventoryAttachment)];
  const transformations = [];
  const tools = new Map([["akashic-legal-source-pack-export@1", { name: "akashic-legal-source-pack-export", version: "1" }]]);
  const citationsBySourceId = new Map();
  for (const citation of pack.citations) {
    const entries = citationsBySourceId.get(citation.sourceId) || [];
    entries.push(citation);
    citationsBySourceId.set(citation.sourceId, entries);
  }

  for (const [sourceId, citations] of [...citationsBySourceId.entries()].sort(([left], [right]) => compareStrings(left, right))) {
    const packSourceRecord = pack.sources.find((source) => source.id === sourceId);
    const manifestPath = packSourceRecord.integrity.snapshot.manifestPath;
    const manifest = manifestByPath.get(manifestPath) || JSON.parse(await readFile(path.join(root, manifestPath), "utf8"));
    const sourcePacket = await createAetherLegalSourceEvidencePacket(manifest, contractLock, {
      destinationScope,
      jurisdictionById,
      requiredPolicyIds,
      requiredSessionCapabilities,
      root,
      snapshotId: packSourceRecord.integrity.snapshot.snapshotId,
    });
    attachments.push(...sourcePacket.payload.evidence.attachments);
    sources.push(sourcePacketCitationExcerpts(sourcePacket, citations));
    transformations.push(...sourcePacket.payload.provenance.transformations);
    for (const tool of sourcePacket.payload.provenance.tools) tools.set(`${tool.name}@${tool.version}`, tool);
  }

  const reviewDates = pack.sources.map((source) => source.dates.reviewDue).sort(compareStrings);
  const validUntil = `${reviewDates[0]}T23:59:59Z`;
  const packet = {
    schema_version: contractLock.contractVersion,
    packet: {
      id: `packet/${pack.packId}/${pack.version}`,
      version: AETHER_EVIDENCE_PACKET_SEMVER,
      producer: "egohygiene/akashic",
      workflow_id: "legal-source-pack-export",
      revision: validated.digest,
      created_at: pack.baseline.observedAt,
    },
    payload: {
      request: {
        id: `task/${pack.packId}/${pack.version}`,
        objective: "Transfer a bounded federal and Massachusetts employment-separation source inventory with exact synthetic citation proofs.",
        scope: [...pack.baseline.jurisdictionIds, ...pack.baseline.subjects].sort(compareStrings),
        public_inputs_only: true,
      },
      evidence: { attachments, sources },
      findings: {
        items: [],
        rejected_claims: [
          "Every source in the inventory controls or applies to a private dispute.",
          "The inventory is complete or resolves a legal comparison.",
          "The packet provides legal advice or authorizes an action.",
        ],
        overall_limitations: [pack.notice, ...pack.knownOmissions],
      },
      provenance: {
        transformations: transformations.sort((left, right) => compareStrings(left.id, right.id)),
        tools: [...tools.values()].sort((left, right) => compareStrings(`${left.name}@${left.version}`, `${right.name}@${right.version}`)),
      },
      policy: {
        destination_scope: destinationScope,
        maximum_sensitivity: "public",
        required_policy_ids: requiredPolicyIds,
        required_session_capabilities: requiredSessionCapabilities,
        grants_capabilities: false,
        max_attachment_count: attachments.length,
        max_attachment_bytes: attachments.reduce((sum, attachment) => sum + attachment.bytes, 0),
        contains_private_data: false,
      },
      review: {
        human: { status: "pending", reviewer: null, reviewed_at: null, evidence: null },
        sanitization: { status: "pending", reviewer: null, reviewed_at: null, evidence: null },
        declassification: { status: "not-applicable", reviewer: null, reviewed_at: null, evidence: null },
      },
      lifecycle: {
        state: "draft",
        freshness: { status: "current", evaluated_at: pack.baseline.observedAt, valid_until: validUntil },
        expires_at: validUntil,
        superseded_by: null,
        revocation: null,
        incompatibility: null,
        partial_failures: [],
      },
    },
    integrity: {
      envelope_digest: { algorithm: "sha256-canonical-json", value: "" },
      signature: { status: "unsigned", algorithm: null, key_id: null, value: null },
    },
  };
  packet.integrity.envelope_digest.value = aetherCanonicalSha256(packetEnvelope(packet));
  return packet;
}

export function formatAetherLegalSourcePackEvidencePacket(packet) {
  return [
    `Packet: ${packet.packet.id}`,
    `Contract: ${packet.schema_version}`,
    `Revision: ${packet.packet.revision}`,
    `State: ${packet.payload.lifecycle.state}`,
    `Sources: ${packet.payload.evidence.sources.length}`,
    `Attachments: ${packet.payload.evidence.attachments.length}`,
    `Envelope SHA-256: ${packet.integrity.envelope_digest.value}`,
    "Transport authorized: no",
    "",
  ].join("\n");
}
