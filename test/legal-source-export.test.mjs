import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  AETHER_EVIDENCE_PACKET_VERSION,
  aetherCanonicalSha256,
  createAetherLegalSourceEvidencePacket,
  validateAetherEvidenceContractLock,
  verifyAetherPacketAttachmentBytes,
} from "../scripts/lib/legal-source-export.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readJson = async (relativePath) => JSON.parse(await readFile(path.join(root, relativePath), "utf8"));
const contractLock = await readJson("research/legal/aether-public-evidence-v1.lock.json");
const federalFixture = await readJson("research/legal/fixtures/us-federal-govinfo-cfr-v1.json");
const massachusettsFixture = await readJson("research/legal/fixtures/us-ma-general-laws-v1.json");
const jurisdictions = await readJson("atlas/jurisdictions.json");
const jurisdictionById = new Map(jurisdictions.jurisdictions.map((jurisdiction) => [jurisdiction.id, jurisdiction]));

const createPacket = (manifest, options = {}) => createAetherLegalSourceEvidencePacket(manifest, contractLock, { jurisdictionById, root, ...options });

test("pins the immutable merged Aether contract revision and schema digest", () => {
  assert.equal(validateAetherEvidenceContractLock(contractLock), contractLock);
  assert.equal(contractLock.contractVersion, AETHER_EVIDENCE_PACKET_VERSION);
  assert.equal(contractLock.revision, "d92da857dcc96edef1efc6b99a7f938e3f48c0d0");
  assert.equal(contractLock.schemaSha256, "61214128c77616e3c722b1c8f4b55c3a22443ce519f7981743c6822f4f7083f9");

  const floating = structuredClone(contractLock);
  floating.revision = "main";
  assert.throws(() => validateAetherEvidenceContractLock(floating), /immutable commit SHA/);

  const redirected = structuredClone(contractLock);
  redirected.schemaUrl = "https://example.invalid/schema.json";
  assert.throws(() => validateAetherEvidenceContractLock(redirected), /must bind its repository/);
});

test("exports federal and Massachusetts evidence deterministically", async () => {
  for (const manifest of [federalFixture, massachusettsFixture]) {
    const first = await createPacket(manifest);
    const second = await createPacket(manifest);
    assert.deepEqual(first, second);
    assert.equal(first.schema_version, AETHER_EVIDENCE_PACKET_VERSION);
    assert.equal(first.integrity.envelope_digest.algorithm, "sha256-canonical-json");
    assert.equal(first.integrity.envelope_digest.value, aetherCanonicalSha256({
      schema_version: first.schema_version,
      packet: first.packet,
      payload: first.payload,
    }));
    assert.equal(first.integrity.signature.status, "unsigned");
    assert.equal(first.payload.policy.maximum_sensitivity, "public");
    assert.equal(first.payload.policy.contains_private_data, false);
    assert.equal(first.payload.policy.grants_capabilities, false);
    assert.equal(first.payload.review.human.status, "pending");
    assert.equal(first.payload.lifecycle.state, "draft");
    assert.deepEqual(first.payload.findings.items, []);
    await verifyAetherPacketAttachmentBytes(first, { root });
  }

  const federal = await createPacket(federalFixture);
  const massachusetts = await createPacket(massachusettsFixture);
  assert.equal(federal.payload.evidence.sources[0].authority, "official");
  assert.equal(massachusetts.payload.evidence.sources[0].authority, "secondary");
  assert.notEqual(federal.integrity.envelope_digest.value, massachusetts.integrity.envelope_digest.value);
});

test("preserves raw and normalized hashes, transformations, and exact byte spans", async () => {
  const packet = await createPacket(federalFixture);
  const snapshot = federalFixture.snapshots[0];
  const [raw, normalized] = packet.payload.evidence.attachments;
  const source = packet.payload.evidence.sources[0];
  assert.equal(raw.digest.value, snapshot.rawArtifact.sha256);
  assert.equal(normalized.digest.value, snapshot.normalizedArtifacts[0].sha256);
  assert.deepEqual(source.attachment_ids, [raw.id, normalized.id]);
  assert.deepEqual(source.excerpts[0], {
    id: `excerpt/${snapshot.id}/normalized-1`,
    attachment_id: normalized.id,
    start_byte: 0,
    end_byte: normalized.bytes,
    digest: { algorithm: "sha256-bytes", value: normalized.digest.value },
  });
  assert.deepEqual(packet.payload.provenance.transformations[0].input_refs, [raw.id]);
  assert.deepEqual(packet.payload.provenance.transformations[0].output_refs, [normalized.id]);
});

test("fails closed for contract drift, private data, and unavailable captures", async () => {
  const drifted = structuredClone(federalFixture);
  drifted.export.schemaSha256 = "0".repeat(64);
  await assert.rejects(createPacket(drifted), /does not match the pinned Aether contract/);

  const privateManifest = structuredClone(federalFixture);
  privateManifest.privacy.containsPrivateData = true;
  await assert.rejects(createPacket(privateManifest), /public-only, evidence-not-instructions/);

  const unavailable = structuredClone(federalFixture);
  const snapshot = unavailable.snapshots[0];
  snapshot.state = "unavailable";
  snapshot.availability = "unavailable";
  snapshot.rawArtifact = null;
  snapshot.normalizedArtifacts = [];
  snapshot.transformations = [];
  snapshot.response.status = "unavailable";
  snapshot.response.mediaType = null;
  snapshot.response.bodySha256 = null;
  await assert.rejects(createPacket(unavailable, { snapshotId: snapshot.id }), /requires captured raw and normalized public artifacts/);
});

test("review and freshness deterministically control packet readiness", async () => {
  const reviewed = structuredClone(federalFixture);
  reviewed.manualReview = {
    status: "reviewed",
    reviewedBy: "fixture-reviewer",
    reviewedAt: "2026-09-04T12:00:00Z",
    requiredFor: reviewed.manualReview.requiredFor,
  };
  const ready = await createPacket(reviewed);
  assert.equal(ready.payload.lifecycle.state, "ready");
  assert.equal(ready.payload.review.human.status, "approved");
  assert.equal(ready.payload.review.sanitization.status, "approved");

  const stale = structuredClone(reviewed);
  stale.snapshots[0].dates.reviewDue.value = "2026-09-03";
  const stalePacket = await createPacket(stale);
  assert.equal(stalePacket.payload.lifecycle.state, "stale");
  assert.equal(stalePacket.payload.lifecycle.freshness.status, "stale");
});

test("the CLI is deterministic, read-only, and reports no transport authority", async () => {
  const manifestPath = path.join(root, "research/legal/fixtures/us-federal-govinfo-cfr-v1.json");
  const before = createHash("sha256").update(await readFile(manifestPath)).digest("hex");
  const argumentsList = [
    "scripts/export-legal-source-evidence.mjs",
    "--manifest",
    "research/legal/fixtures/us-federal-govinfo-cfr-v1.json",
    "--format",
    "json",
  ];
  const first = spawnSync(process.execPath, argumentsList, { cwd: root, encoding: "utf8" });
  const second = spawnSync(process.execPath, argumentsList, { cwd: root, encoding: "utf8" });
  assert.equal(first.status, 0, first.stderr);
  assert.equal(second.status, 0, second.stderr);
  assert.equal(first.stdout, second.stdout);
  const packet = JSON.parse(first.stdout);
  assert.equal(packet.payload.policy.grants_capabilities, false);
  const after = createHash("sha256").update(await readFile(manifestPath)).digest("hex");
  assert.equal(after, before);

  const textResult = spawnSync(process.execPath, argumentsList.slice(0, -1).concat("text"), { cwd: root, encoding: "utf8" });
  assert.equal(textResult.status, 0, textResult.stderr);
  assert.match(textResult.stdout, /Transport authorized: no/);
});
