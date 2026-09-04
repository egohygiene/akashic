import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cp, mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  LEGAL_SOURCE_APPLY_SCHEMA,
  applyLegalSourceAcquisition,
  formatLegalSourceAcquisitionApply,
  prepareLegalSourceAcquisitionApply,
} from "../scripts/lib/legal-source-apply.mjs";
import { canonicalSha256, createLegalSourceAcquisitionPlan } from "../scripts/lib/legal-source-acquisition.mjs";
import { validateLegalSourceSnapshotManifest } from "../scripts/lib/legal-source-snapshots.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readJson = async (relativePath, base = root) => JSON.parse(await readFile(path.join(base, relativePath), "utf8"));
const manifestPath = "research/legal/fixtures/us-federal-govinfo-cfr-v1.json";
const changedObservationPath = "research/legal/fixtures/observations/us-federal-govinfo-cfr-changed-v1.json";
const unavailableObservationPath = "research/legal/fixtures/observations/us-federal-govinfo-cfr-unavailable-v1.json";
const changedRequestPath = "research/legal/fixtures/apply/us-federal-govinfo-cfr-changed-v1.json";
const unavailableRequestPath = "research/legal/fixtures/apply/us-federal-govinfo-cfr-unavailable-v1.json";
const manifest = await readJson(manifestPath);
const changedObservation = await readJson(changedObservationPath);
const unavailableObservation = await readJson(unavailableObservationPath);
const changedRequest = await readJson(changedRequestPath);
const unavailableRequest = await readJson(unavailableRequestPath);
const applySchema = await readJson("research/legal/schemas/legal-source-apply-v1.schema.json");
const jurisdictionById = new Map([["us-federal", { id: "us-federal" }]]);

test("publishes a digest-bound apply request schema", () => {
  assert.equal(applySchema.$id, LEGAL_SOURCE_APPLY_SCHEMA);
  assert.equal(applySchema.properties.planCanonicalSha256.$ref, "#/$defs/sha256");
  assert.deepEqual(applySchema.properties.lifecycle.enum, ["corrects", "none", "supersedes"]);
  assert.equal(applySchema.$defs.capture.properties.normalized.minItems, 1);
  assert.equal(applySchema.$defs.privacy.properties.publicInputsOnly.const, true);
});

test("previews an immutable supersession without writing", async () => {
  const first = await prepareLegalSourceAcquisitionApply(manifest, changedObservation, changedRequest, { jurisdictionById, root });
  const second = await prepareLegalSourceAcquisitionApply(structuredClone(manifest), structuredClone(changedObservation), structuredClone(changedRequest), { jurisdictionById, root });
  assert.deepEqual(first.result, second.result);
  assert.equal(first.result.action, "create-snapshot");
  assert.equal(first.result.lifecycle, "supersedes");
  assert.deepEqual(first.result.effects, {
    networkRequests: 0,
    artifactCreates: 2,
    existingArtifactsOverwritten: 0,
    manifestWrites: 1,
  });
  const previous = first.manifest.snapshots.find((snapshot) => snapshot.id === manifest.snapshots[0].id);
  const created = first.manifest.snapshots.find((snapshot) => snapshot.id === first.result.snapshotId);
  assert.equal(previous.state, "superseded");
  assert.equal(previous.supersededBy, created.id);
  assert.equal(created.state, "current");
  assert.equal(created.supersedes, previous.id);
  assert.equal(created.rawArtifact.sha256, changedObservation.bodySha256);
  assert.equal(canonicalSha256(first.manifest), first.result.manifestAfterSha256);
  await assert.rejects(stat(path.join(root, created.rawArtifact.path)), { code: "ENOENT" });
});

test("requires an explicit correction relation and preserves reciprocal history", async () => {
  const correctionRequest = structuredClone(changedRequest);
  correctionRequest.lifecycle = "corrects";
  const prepared = await prepareLegalSourceAcquisitionApply(manifest, changedObservation, correctionRequest, { jurisdictionById, root });
  const previous = prepared.manifest.snapshots.find((snapshot) => snapshot.id === manifest.snapshots[0].id);
  const created = prepared.manifest.snapshots.find((snapshot) => snapshot.id === prepared.result.snapshotId);
  assert.equal(previous.state, "corrected");
  assert.equal(previous.correctedBy, created.id);
  assert.equal(created.corrects, previous.id);

  const ambiguous = structuredClone(changedRequest);
  ambiguous.lifecycle = "none";
  await assert.rejects(prepareLegalSourceAcquisitionApply(manifest, changedObservation, ambiguous, { jurisdictionById, root }), /must explicitly correct or supersede/);
});

test("persists an unavailable event without replacing the last captured evidence", async () => {
  const prepared = await prepareLegalSourceAcquisitionApply(manifest, unavailableObservation, unavailableRequest, { jurisdictionById, root });
  const current = prepared.manifest.snapshots.find((snapshot) => snapshot.state === "current");
  const unavailable = prepared.manifest.snapshots.find((snapshot) => snapshot.id === prepared.result.snapshotId);
  assert.equal(current.id, manifest.snapshots[0].id);
  assert.equal(unavailable.state, "unavailable");
  assert.equal(unavailable.availability, "unavailable");
  assert.equal(unavailable.rawArtifact, null);
  assert.deepEqual(unavailable.normalizedArtifacts, []);
  assert.deepEqual(unavailable.transformations, []);
  assert.deepEqual(prepared.result.effects, {
    networkRequests: 0,
    artifactCreates: 0,
    existingArtifactsOverwritten: 0,
    manifestWrites: 1,
  });
});

test("fails closed on stale bindings, substituted bytes, and no-change plans", async () => {
  const stale = structuredClone(changedRequest);
  stale.manifestCanonicalSha256 = "0".repeat(64);
  await assert.rejects(prepareLegalSourceAcquisitionApply(manifest, changedObservation, stale, { jurisdictionById, root }), /stale for the manifest/);

  const substituted = structuredClone(changedRequest);
  substituted.snapshot.capture.raw.sha256 = "1".repeat(64);
  await assert.rejects(prepareLegalSourceAcquisitionApply(manifest, changedObservation, substituted, { jurisdictionById, root }), /raw capture must match the bound observation/);

  const alteredPlan = structuredClone(changedRequest);
  alteredPlan.planCanonicalSha256 = "2".repeat(64);
  await assert.rejects(prepareLegalSourceAcquisitionApply(manifest, changedObservation, alteredPlan, { jurisdictionById, root }), /does not match the deterministic plan/);

  const unchangedObservation = await readJson("research/legal/fixtures/observations/us-federal-govinfo-cfr-unchanged-v1.json");
  const unchangedPlan = createLegalSourceAcquisitionPlan(manifest, unchangedObservation);
  const noChange = structuredClone(changedRequest);
  noChange.applyId = `${unchangedPlan.planId}-apply-v1`;
  noChange.planId = unchangedPlan.planId;
  noChange.planCanonicalSha256 = canonicalSha256(unchangedPlan);
  noChange.observationCanonicalSha256 = canonicalSha256(unchangedObservation);
  await assert.rejects(prepareLegalSourceAcquisitionApply(manifest, unchangedObservation, noChange, { jurisdictionById, root }), /requires a plan that proposes/);
});

test("applies captures in isolation, validates the result, and refuses overwrite", async () => {
  const temporaryRoot = await mkdtemp(path.join(tmpdir(), "akashic-legal-apply-"));
  try {
    await cp(path.join(root, "atlas"), path.join(temporaryRoot, "atlas"), { recursive: true });
    await cp(path.join(root, "research", "legal", "fixtures"), path.join(temporaryRoot, "research", "legal", "fixtures"), { recursive: true });
    const temporaryManifestPath = path.join(temporaryRoot, manifestPath);
    const temporaryManifest = await readJson(manifestPath, temporaryRoot);
    const result = await applyLegalSourceAcquisition(temporaryManifest, changedObservation, changedRequest, {
      jurisdictionById,
      manifestPath: temporaryManifestPath,
      root: temporaryRoot,
    });
    const appliedManifest = await readJson(manifestPath, temporaryRoot);
    const created = appliedManifest.snapshots.find((snapshot) => snapshot.id === result.snapshotId);
    assert.equal((await readFile(path.join(temporaryRoot, created.rawArtifact.path))).toString(), (await readFile(path.join(temporaryRoot, changedRequest.snapshot.capture.raw.sourcePath))).toString());
    assert.equal((await readFile(path.join(temporaryRoot, created.normalizedArtifacts[0].path))).toString(), (await readFile(path.join(temporaryRoot, changedRequest.snapshot.capture.normalized[0].sourcePath))).toString());
    await validateLegalSourceSnapshotManifest(appliedManifest, { jurisdictionById, root: temporaryRoot });
    await assert.rejects(
      prepareLegalSourceAcquisitionApply(temporaryManifest, changedObservation, changedRequest, { jurisdictionById, root: temporaryRoot }),
      /refuses to overwrite immutable artifact/,
    );
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});

test("formats reviewable effects and keeps CLI preview repeatable", () => {
  const result = {
    applyId: changedRequest.applyId,
    action: "create-snapshot",
    lifecycle: "supersedes",
    planId: changedRequest.planId,
    planSha256: changedRequest.planCanonicalSha256,
    snapshotId: "snapshot-id",
    manifestBeforeSha256: "a".repeat(64),
    manifestAfterSha256: "b".repeat(64),
    observationSha256: changedRequest.observationCanonicalSha256,
    effects: { networkRequests: 0, artifactCreates: 2, existingArtifactsOverwritten: 0, manifestWrites: 1 },
  };
  assert.match(formatLegalSourceAcquisitionApply(result), /^Legal source acquisition apply preview\n/);
  assert.match(formatLegalSourceAcquisitionApply(result), /0 artifact overwrites/);

  const argumentsList = [
    "scripts/apply-legal-source-acquisition.mjs",
    "--manifest", manifestPath,
    "--observation", changedObservationPath,
    "--request", changedRequestPath,
    "--format", "json",
  ];
  const first = spawnSync(process.execPath, argumentsList, { cwd: root, encoding: "utf8" });
  const second = spawnSync(process.execPath, argumentsList, { cwd: root, encoding: "utf8" });
  assert.equal(first.status, 0, first.stderr);
  assert.equal(second.status, 0, second.stderr);
  assert.equal(first.stderr, "");
  assert.equal(first.stdout, second.stdout);
  assert.equal(JSON.parse(first.stdout).mode, "preview");
});
