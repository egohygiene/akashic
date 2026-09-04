import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { createAetherLegalSourcePackEvidencePacket } from "../scripts/lib/legal-source-pack-export.mjs";
import { aetherCanonicalSha256, verifyAetherPacketAttachmentBytes } from "../scripts/lib/legal-source-export.mjs";
import {
  EMPLOYMENT_PACK_SUBJECTS,
  LEGAL_SOURCE_PACK_SCHEMA_VERSION,
  createLegalSourcePackRefreshReport,
  legalSourcePackRecordSha256,
  validateLegalSourcePack,
} from "../scripts/lib/legal-source-packs.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packPath = "research/legal/packs/us-federal-ma-employment-separation-v1.json";
const readJson = async (relativePath) => JSON.parse(await readFile(path.join(root, relativePath), "utf8"));
const pack = await readJson(packPath);
const schema = await readJson("research/legal/schemas/legal-source-pack-v1.schema.json");
const contractLock = await readJson("research/legal/aether-public-evidence-v1.lock.json");
const jurisdictions = await readJson("atlas/jurisdictions.json");
const jurisdictionById = new Map(jurisdictions.jurisdictions.map((jurisdiction) => [jurisdiction.id, jurisdiction]));
const validate = (value) => validateLegalSourcePack(value, { jurisdictionById, root });

test("validates the bounded federal and Massachusetts employment source pack", async () => {
  assert.deepEqual(await validate(pack), {
    packId: "us-federal-ma-employment-separation",
    sourceCount: 21,
    citationCount: 2,
    evaluationCount: 4,
    digest: aetherCanonicalSha256(pack),
  });
  assert.equal(pack.schemaVersion, LEGAL_SOURCE_PACK_SCHEMA_VERSION);
  assert.equal(schema.properties.$schema.const, pack.$schema);
  assert.deepEqual(pack.baseline.jurisdictionIds, ["us-federal", "us-ma"]);
  assert.deepEqual(pack.baseline.subjects, EMPLOYMENT_PACK_SUBJECTS);
  assert.equal(pack.baseline.comparativeClaims, false);
});

test("keeps authority, currentness, rights, and immutable-byte gaps explicit", () => {
  const authorityStatuses = new Set(pack.sources.map((source) => source.authorityStatus));
  for (const expected of ["official-guidance", "official-primary", "official-primary-unofficial-presentation", "official-self-help", "official-service-or-form", "secondary-official"]) assert.ok(authorityStatuses.has(expected));
  assert.ok(pack.sources.some((source) => source.currentnessStatus === "historical"));
  assert.ok(pack.sources.every((source) => source.metadataReview.status === "reviewed" && source.metadataReview.humanStatus === "pending"));
  assert.ok(pack.sources.every((source) => source.integrity.recordSha256 === legalSourcePackRecordSha256(source)));
  assert.equal(pack.sources.filter((source) => source.integrity.snapshot.status === "linked-synthetic-proof").length, 2);
  assert.ok(pack.sources.filter((source) => source.integrity.snapshot.status === "metadata-only").every((source) => source.integrity.snapshot.sha256 === null));
});

test("binds stable citations to exact normalized byte spans", async () => {
  for (const citation of pack.citations) {
    const bytes = await readFile(path.join(root, citation.artifactPath));
    assert.equal(createHash("sha256").update(bytes).digest("hex"), citation.artifactSha256);
    const span = bytes.subarray(citation.startByte, citation.endByte);
    assert.equal(span.toString("utf8"), citation.citationText);
    assert.equal(createHash("sha256").update(span).digest("hex"), citation.spanSha256);
  }
});

test("exports the pack deterministically through the pinned Aether contract", async () => {
  const options = { jurisdictionById, packPath, root };
  const first = await createAetherLegalSourcePackEvidencePacket(pack, contractLock, options);
  const second = await createAetherLegalSourcePackEvidencePacket(pack, contractLock, options);
  assert.deepEqual(first, second);
  assert.equal(first.packet.workflow_id, "legal-source-pack-export");
  assert.equal(first.packet.revision, aetherCanonicalSha256(pack));
  assert.equal(first.payload.evidence.sources.length, 3);
  assert.equal(first.payload.evidence.attachments.length, 5);
  assert.deepEqual(first.payload.findings.items, []);
  assert.equal(first.payload.policy.contains_private_data, false);
  assert.equal(first.payload.policy.grants_capabilities, false);
  assert.equal(first.payload.review.human.status, "pending");
  assert.equal(first.payload.lifecycle.state, "draft");
  assert.equal(first.integrity.envelope_digest.value, aetherCanonicalSha256({
    schema_version: first.schema_version,
    packet: first.packet,
    payload: first.payload,
  }));
  for (const citation of pack.citations) {
    const excerpt = first.payload.evidence.sources.flatMap((source) => source.excerpts).find((item) => item.id === `excerpt/${citation.id}`);
    assert.deepEqual(excerpt, {
      id: `excerpt/${citation.id}`,
      attachment_id: first.payload.evidence.attachments.find((attachment) => attachment.path === citation.artifactPath).id,
      start_byte: citation.startByte,
      end_byte: citation.endByte,
      digest: { algorithm: "sha256-bytes", value: citation.spanSha256 },
    });
  }
  await verifyAetherPacketAttachmentBytes(first, { root });
});

test("deterministic refresh reports every controlled change class", () => {
  const candidate = structuredClone(pack);
  const changed = candidate.sources.find((source) => source.id === "federal-eeoc-waivers");
  changed.limitations.push("Synthetic refresh-only metadata change.");
  changed.integrity.recordSha256 = legalSourcePackRecordSha256(changed);
  const stale = candidate.sources.find((source) => source.id === "federal-dol-cobra");
  stale.dates.reviewDue = "2026-09-03";
  stale.integrity.recordSha256 = legalSourcePackRecordSha256(stale);
  const unavailable = candidate.sources.find((source) => source.id === "ma-mcad");
  unavailable.availability = "unavailable";
  unavailable.integrity.recordSha256 = legalSourcePackRecordSha256(unavailable);
  const superseded = candidate.sources.find((source) => source.id === "ma-pfml-overview");
  superseded.supersededBy = "ma-pfml-overview-v2";
  superseded.integrity.recordSha256 = legalSourcePackRecordSha256(superseded);
  const added = structuredClone(candidate.sources[0]);
  added.id = "synthetic-added-source";
  added.dates.reviewDue = "2026-10-04";
  added.integrity.recordSha256 = legalSourcePackRecordSha256(added);
  candidate.sources.push(added);

  const first = createLegalSourcePackRefreshReport(pack, candidate, { asOf: "2026-09-04" });
  const second = createLegalSourcePackRefreshReport(pack, candidate, { asOf: "2026-09-04" });
  assert.deepEqual(first, second);
  assert.deepEqual(first.added, ["synthetic-added-source"]);
  assert.deepEqual(first.stale, ["federal-dol-cobra"]);
  assert.deepEqual(first.unavailable, ["ma-mcad"]);
  assert.deepEqual(first.superseded, ["ma-pfml-overview"]);
  assert.ok(first.changed.includes("federal-eeoc-waivers"));
  assert.equal(first.requiresHumanReview, true);
});

test("fails closed for private inputs, rights overclaims, and citation drift", async () => {
  const privatePack = structuredClone(pack);
  privatePack.privacy.containsPrivateData = true;
  await assert.rejects(validate(privatePack), /public-only privacy boundary/);

  const rightsOverclaim = structuredClone(pack);
  const source = rightsOverclaim.sources.find((item) => item.rights.status === "unknown");
  source.rights.quotation = "review-required";
  await assert.rejects(validate(rightsOverclaim), /unknown rights must fail closed/);

  const driftedCitation = structuredClone(pack);
  driftedCitation.citations[0].startByte += 1;
  await assert.rejects(validate(driftedCitation), /exact byte span does not match/);
});

test("pack export and refresh CLIs are deterministic and read-only", async () => {
  const absolutePackPath = path.join(root, packPath);
  const before = createHash("sha256").update(await readFile(absolutePackPath)).digest("hex");
  const exportArguments = ["scripts/export-legal-source-pack-evidence.mjs", "--pack", packPath, "--format", "json"];
  const first = spawnSync(process.execPath, exportArguments, { cwd: root, encoding: "utf8" });
  const second = spawnSync(process.execPath, exportArguments, { cwd: root, encoding: "utf8" });
  assert.equal(first.status, 0, first.stderr);
  assert.equal(second.status, 0, second.stderr);
  assert.equal(first.stdout, second.stdout);
  assert.equal(JSON.parse(first.stdout).payload.policy.grants_capabilities, false);

  const refresh = spawnSync(process.execPath, [
    "scripts/refresh-legal-source-pack.mjs",
    "--baseline", packPath,
    "--candidate", packPath,
    "--as-of", "2026-09-04",
    "--format", "json",
  ], { cwd: root, encoding: "utf8" });
  assert.equal(refresh.status, 0, refresh.stderr);
  assert.deepEqual(JSON.parse(refresh.stdout).added, []);
  assert.equal(JSON.parse(refresh.stdout).requiresHumanReview, false);
  const after = createHash("sha256").update(await readFile(absolutePackPath)).digest("hex");
  assert.equal(after, before);
});
