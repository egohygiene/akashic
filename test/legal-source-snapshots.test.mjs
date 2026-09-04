import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { LEGAL_SOURCE_SNAPSHOT_SCHEMA_VERSION, LEGAL_SOURCE_SNAPSHOT_STATES, validateLegalSourceSnapshotManifest } from "../scripts/lib/legal-source-snapshots.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readJson = async (relativePath) => JSON.parse(await readFile(path.join(root, relativePath), "utf8"));
const federalFixture = await readJson("research/legal/fixtures/us-federal-govinfo-cfr-v1.json");
const massachusettsFixture = await readJson("research/legal/fixtures/us-ma-general-laws-v1.json");
const schema = await readJson("research/legal/schemas/legal-source-snapshot-v1.schema.json");
const jurisdictionById = new Map([
  ["us-federal", { id: "us-federal" }],
  ["us-ma", { id: "us-ma" }],
]);

const validate = (manifest) => validateLegalSourceSnapshotManifest(manifest, { jurisdictionById, root });

test("validates materially different federal and Massachusetts synthetic manifests", async () => {
  assert.deepEqual(await validate(federalFixture), {
    manifestId: "us-federal-govinfo-cfr-synthetic-v1",
    jurisdictionId: "us-federal",
    snapshotCount: 1,
  });
  assert.deepEqual(await validate(massachusettsFixture), {
    manifestId: "us-ma-general-laws-synthetic-v1",
    jurisdictionId: "us-ma",
    snapshotCount: 1,
  });
  assert.deepEqual(federalFixture.source.contentStatuses, ["archival", "official"]);
  assert.deepEqual(massachusettsFixture.source.contentStatuses, ["unofficial"]);
  assert.equal(federalFixture.rights.status, "public-domain-with-exceptions");
  assert.equal(massachusettsFixture.rights.status, "restricted");
  assert.equal(federalFixture.snapshots[0].dates.currentThrough.status, "unknown");
  assert.equal(massachusettsFixture.snapshots[0].dates.currentThrough.value, "2026-05-31");
});

test("publishes one schema version with every required lifecycle state", () => {
  assert.equal(federalFixture.schemaVersion, LEGAL_SOURCE_SNAPSHOT_SCHEMA_VERSION);
  assert.equal(schema.properties.$schema.const, federalFixture.$schema);
  assert.ok(schema.required.includes("$schema"));
  assert.deepEqual(schema.$defs.snapshot.properties.state.enum, LEGAL_SOURCE_SNAPSHOT_STATES);
  assert.deepEqual(new Set(LEGAL_SOURCE_SNAPSHOT_STATES), new Set(["historical", "current", "stale", "corrected", "superseded", "repealed", "unavailable", "unknown"]));
});

test("verifies checked-in artifact bytes, digests, and transformation links", async () => {
  const badDigest = structuredClone(federalFixture);
  badDigest.snapshots[0].rawArtifact.sha256 = "0".repeat(64);
  await assert.rejects(validate(badDigest), /does not match its checked-in bytes and SHA-256 digest/);

  const mismatchedResponse = structuredClone(federalFixture);
  mismatchedResponse.snapshots[0].response.bodySha256 = "0".repeat(64);
  await assert.rejects(validate(mismatchedResponse), /response body digest must match the raw artifact/);

  const brokenChain = structuredClone(federalFixture);
  brokenChain.snapshots[0].transformations[0].outputSha256 = "0".repeat(64);
  await assert.rejects(validate(brokenChain), /transformation chain does not link raw and normalized artifacts/);
});

test("keeps credentials out of durable acquisition metadata", async () => {
  const credentialBearing = structuredClone(federalFixture);
  credentialBearing.acquisition.requestParameters.api_key = "fixture-secret";
  await assert.rejects(validate(credentialBearing), /must not contain credential-bearing fields/);
});

test("requires explicit dates and fail-closed rights claims", async () => {
  const inventedDate = structuredClone(federalFixture);
  inventedDate.snapshots[0].dates.effective.value = "2026-01-01";
  await assert.rejects(validate(inventedDate), /unknown value must be null/);

  const inventedPermission = structuredClone(federalFixture);
  inventedPermission.rights.status = "unknown";
  inventedPermission.rights.redistribution = "allowed";
  await assert.rejects(validate(inventedPermission), /Unknown rights must fail closed/);
});

test("keeps unavailable, corrected, and superseded evidence explicit", async () => {
  const unavailable = structuredClone(federalFixture);
  unavailable.snapshots[0].state = "unavailable";
  unavailable.snapshots[0].availability = "unavailable";
  unavailable.snapshots[0].rawArtifact = null;
  unavailable.snapshots[0].normalizedArtifacts = [];
  unavailable.snapshots[0].transformations = [];
  unavailable.snapshots[0].response.status = "unavailable";
  unavailable.snapshots[0].response.mediaType = null;
  unavailable.snapshots[0].response.bodySha256 = null;
  assert.equal((await validate(unavailable)).snapshotCount, 1);

  for (const [state, relation, inverse] of [
    ["corrected", "correctedBy", "corrects"],
    ["superseded", "supersededBy", "supersedes"],
  ]) {
    const versioned = structuredClone(federalFixture);
    const prior = versioned.snapshots[0];
    const replacement = structuredClone(prior);
    prior.id = `a-${state}-snapshot`;
    prior.state = state;
    prior[relation] = "b-current-snapshot";
    replacement.id = "b-current-snapshot";
    replacement[inverse] = prior.id;
    versioned.snapshots = [prior, replacement];
    assert.equal((await validate(versioned)).snapshotCount, 2);

    replacement[inverse] = null;
    await assert.rejects(validate(versioned), /relation must be reciprocal/);
  }
});

test("represents repeal explicitly without inventing a replacement snapshot", async () => {
  const repealed = structuredClone(federalFixture);
  repealed.snapshots[0].state = "repealed";
  repealed.snapshots[0].repeal = {
    status: "confirmed",
    effective: { status: "known", value: "2026-09-10" },
    evidence: "https://example.invalid/synthetic-repeal-notice",
    notes: "Synthetic repeal evidence for lifecycle validation only.",
  };
  assert.equal((await validate(repealed)).snapshotCount, 1);

  const missingEvidence = structuredClone(repealed);
  missingEvidence.snapshots[0].repeal = null;
  await assert.rejects(validate(missingEvidence), /must include explicit repeal evidence/);

  const misplacedEvidence = structuredClone(federalFixture);
  misplacedEvidence.snapshots[0].repeal = structuredClone(repealed.snapshots[0].repeal);
  await assert.rejects(validate(misplacedEvidence), /outside the repealed state/);
});

test("pins compatible export metadata to the merged Aether contract", async () => {
  assert.equal(federalFixture.export.contractVersion, "aether.cross-agent-evidence-packet/v1");
  assert.equal(federalFixture.export.contractRevision, "d92da857dcc96edef1efc6b99a7f938e3f48c0d0");
  assert.equal(federalFixture.export.schemaSha256, "61214128c77616e3c722b1c8f4b55c3a22443ce519f7981743c6822f4f7083f9");
  assert.equal(federalFixture.export.status, "compatible");
  assert.deepEqual(federalFixture.export.blockers, []);

  const floating = structuredClone(federalFixture);
  floating.export.contractRevision = null;
  await assert.rejects(validate(floating), /must pin the Aether contract revision/);
});

test("rejects private data, premature review, and unknown jurisdictions", async () => {
  const privateManifest = structuredClone(federalFixture);
  privateManifest.privacy.containsPrivateData = true;
  await assert.rejects(validate(privateManifest), /public-only, evidence-not-instructions/);

  const falseReview = structuredClone(federalFixture);
  falseReview.manualReview.reviewedBy = "reviewer";
  await assert.rejects(validate(falseReview), /must not claim a reviewer/);

  const unknownJurisdiction = structuredClone(federalFixture);
  unknownJurisdiction.jurisdictionId = "us-fictional";
  await assert.rejects(validate(unknownJurisdiction), /unknown jurisdiction/);
});
