import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  LEGAL_SOURCE_ACQUISITION_PLAN_SCHEMA,
  LEGAL_SOURCE_OBSERVATION_SCHEMA,
  createLegalSourceAcquisitionPlan,
  formatLegalSourceAcquisitionPlan,
  validateLegalSourceAcquisitionPlan,
  validateLegalSourceObservation,
} from "../scripts/lib/legal-source-acquisition.mjs";
import { validateLegalSourceSnapshotManifest } from "../scripts/lib/legal-source-snapshots.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readJson = async (relativePath) => JSON.parse(await readFile(path.join(root, relativePath), "utf8"));
const federalManifest = await readJson("research/legal/fixtures/us-federal-govinfo-cfr-v1.json");
const massachusettsManifest = await readJson("research/legal/fixtures/us-ma-general-laws-v1.json");
const unchangedObservation = await readJson("research/legal/fixtures/observations/us-federal-govinfo-cfr-unchanged-v1.json");
const changedObservation = await readJson("research/legal/fixtures/observations/us-federal-govinfo-cfr-changed-v1.json");
const unavailableObservation = await readJson("research/legal/fixtures/observations/us-federal-govinfo-cfr-unavailable-v1.json");
const observationSchema = await readJson("research/legal/schemas/legal-source-observation-v1.schema.json");
const planSchema = await readJson("research/legal/schemas/legal-source-acquisition-plan-v1.schema.json");
const jurisdictionById = new Map([
  ["us-federal", { id: "us-federal" }],
  ["us-ma", { id: "us-ma" }],
]);

await validateLegalSourceSnapshotManifest(federalManifest, { jurisdictionById, root });
await validateLegalSourceSnapshotManifest(massachusettsManifest, { jurisdictionById, root });

test("publishes versioned observation and dry-run plan schemas", () => {
  assert.equal(observationSchema.$id, LEGAL_SOURCE_OBSERVATION_SCHEMA);
  assert.equal(planSchema.$id, LEGAL_SOURCE_ACQUISITION_PLAN_SCHEMA);
  assert.deepEqual(planSchema.$defs.decision.properties.action.enum, ["acquire", "blocked", "create-snapshot", "no-change", "record-unavailable"]);
  assert.equal(planSchema.$defs.request.properties.method.const, "GET");
  assert.deepEqual(planSchema.$defs.request.properties.mode.enum, ["api", "bulk", "manual", "synthetic-fixture"]);
  assert.equal(planSchema.$defs.sideEffects.properties.networkRequests.const, 0);
  assert.equal(planSchema.$defs.sideEffects.properties.fileWrites.const, 0);
  assert.equal(planSchema.$defs.sideEffects.properties.manifestMutations.const, 0);
});

test("creates a deterministic review plan without performing acquisition", () => {
  const plan = createLegalSourceAcquisitionPlan(federalManifest);
  assert.deepEqual(plan, createLegalSourceAcquisitionPlan(structuredClone(federalManifest)));
  assert.deepEqual(plan.request.parameters, [
    { name: "collection", value: "CFR" },
    { name: "title", value: "99" },
  ]);
  assert.deepEqual(plan.decision, {
    action: "acquire",
    reason: "observation-required",
    proposedSnapshotId: null,
    requiresManifestApply: false,
    requiresHumanReview: false,
  });
  assert.deepEqual(plan.comparison, []);
  assert.deepEqual(plan.sideEffects, { networkRequests: 0, fileWrites: 0, manifestMutations: 0 });

  const massachusettsPlan = createLegalSourceAcquisitionPlan(massachusettsManifest);
  assert.deepEqual(massachusettsPlan.request.parameters, [
    { name: "chapter", value: "999" },
    { name: "section", value: "1" },
  ]);
  assert.equal(massachusettsPlan.request.expectedMediaType, "text/html");
});

test("detects unchanged response bodies without proposing a write", () => {
  assert.deepEqual(validateLegalSourceObservation(unchangedObservation, federalManifest), {
    manifestId: federalManifest.manifestId,
    observationId: unchangedObservation.observationId,
    result: "available",
  });
  const plan = createLegalSourceAcquisitionPlan(federalManifest, unchangedObservation);
  assert.equal(plan.decision.action, "no-change");
  assert.equal(plan.decision.reason, "body-unchanged");
  assert.equal(plan.decision.requiresManifestApply, false);
  assert.equal(plan.decision.proposedSnapshotId, null);
  assert.equal(plan.comparison.find((entry) => entry.field === "response.bodySha256").changed, false);
  assert.equal(plan.comparison.find((entry) => entry.field === "rawArtifact.bytes").changed, false);
  assert.equal(plan.comparison.find((entry) => entry.field === "response.retrievedAt").changed, true);
});

test("proposes a stable immutable snapshot when the body changes", () => {
  const plan = createLegalSourceAcquisitionPlan(federalManifest, changedObservation);
  assert.equal(plan.decision.action, "create-snapshot");
  assert.equal(plan.decision.reason, "body-changed");
  assert.equal(plan.decision.requiresManifestApply, true);
  assert.equal(plan.decision.requiresHumanReview, true);
  assert.equal(plan.decision.proposedSnapshotId, "us-federal-govinfo-cfr-synthetic-v1-snapshot-2026-09-05-fd3b11efc006");
  assert.equal(plan.comparison.find((entry) => entry.field === "response.bodySha256").after, "fd3b11efc0060df235425298e6046eec2ddd1d21c4911fd1e0c1f123c546c805");
});

test("distinguishes first capture, source restoration, and unexpected live media", () => {
  const firstManifest = structuredClone(federalManifest);
  firstManifest.snapshots[0].state = "historical";
  const firstPlan = createLegalSourceAcquisitionPlan(firstManifest, changedObservation);
  assert.equal(firstPlan.decision.action, "create-snapshot");
  assert.equal(firstPlan.decision.reason, "no-current-snapshot");
  assert.deepEqual(firstPlan.base, {
    currentSnapshotId: null,
    retrievedAt: null,
    responseStatus: null,
    httpStatus: null,
    mediaType: null,
    headersSha256: null,
    rawArtifactBytes: null,
    bodySha256: null,
  });

  const restoredManifest = structuredClone(federalManifest);
  const restoredSnapshot = restoredManifest.snapshots[0];
  restoredSnapshot.availability = "unavailable";
  restoredSnapshot.response.status = "unavailable";
  restoredSnapshot.response.mediaType = null;
  restoredSnapshot.response.bodySha256 = null;
  restoredSnapshot.rawArtifact = null;
  const restoredPlan = createLegalSourceAcquisitionPlan(restoredManifest, changedObservation);
  assert.equal(restoredPlan.decision.reason, "source-restored");

  const liveManifest = structuredClone(federalManifest);
  liveManifest.fixture = false;
  liveManifest.acquisition.mode = "bulk";
  liveManifest.snapshots[0].response.status = "captured";
  const unexpectedObservation = structuredClone(changedObservation);
  unexpectedObservation.fixture = false;
  unexpectedObservation.mediaType = "text/html";
  const blockedPlan = createLegalSourceAcquisitionPlan(liveManifest, unexpectedObservation);
  assert.equal(blockedPlan.decision.action, "blocked");
  assert.equal(blockedPlan.decision.reason, "unexpected-media-type");
});

test("records unavailable evidence and blocks unknown observations", () => {
  const unavailablePlan = createLegalSourceAcquisitionPlan(federalManifest, unavailableObservation);
  assert.equal(unavailablePlan.decision.action, "record-unavailable");
  assert.equal(unavailablePlan.decision.reason, "source-unavailable");
  assert.match(unavailablePlan.decision.proposedSnapshotId, /-snapshot-2026-09-05-[a-f0-9]{12}$/);
  assert.equal(unavailablePlan.comparison.find((entry) => entry.field === "response.bodySha256").after, null);

  const unknownObservation = structuredClone(unavailableObservation);
  unknownObservation.observationId = "us-federal-govinfo-cfr-unknown-v1";
  unknownObservation.observedAt = "2026-09-05T15:00:00Z";
  unknownObservation.result = "unknown";
  unknownObservation.httpStatus = null;
  unknownObservation.bodyBytes = null;
  unknownObservation.failureCode = "unknown";
  const blockedPlan = createLegalSourceAcquisitionPlan(federalManifest, unknownObservation);
  assert.deepEqual(blockedPlan.decision, {
    action: "blocked",
    reason: "observation-unknown",
    proposedSnapshotId: null,
    requiresManifestApply: false,
    requiresHumanReview: true,
  });
});

test("fails closed on private, stale, mismatched, or invented observations", () => {
  const privateObservation = structuredClone(changedObservation);
  privateObservation.privacy.containsPrivateData = true;
  assert.throws(() => validateLegalSourceObservation(privateObservation, federalManifest), /public-only, evidence-not-instructions/);

  const staleObservation = structuredClone(changedObservation);
  staleObservation.observedAt = federalManifest.snapshots[0].response.retrievedAt;
  assert.throws(() => validateLegalSourceObservation(staleObservation, federalManifest), /must be newer/);

  const mismatchedObservation = structuredClone(changedObservation);
  mismatchedObservation.manifestId = massachusettsManifest.manifestId;
  assert.throws(() => validateLegalSourceObservation(mismatchedObservation, federalManifest), /identify its manifest/);

  const inventedBody = structuredClone(unavailableObservation);
  inventedBody.bodySha256 = "2".repeat(64);
  assert.throws(() => validateLegalSourceObservation(inventedBody, federalManifest), /fail closed without body claims/);

  const falseUnavailable = structuredClone(unavailableObservation);
  falseUnavailable.httpStatus = 200;
  assert.throws(() => validateLegalSourceObservation(falseUnavailable, federalManifest), /cannot claim a successful HTTP status/);

  const missingLength = structuredClone(changedObservation);
  missingLength.bodyBytes = null;
  assert.throws(() => validateLegalSourceObservation(missingLength, federalManifest), /require media and body evidence/);
});

test("rejects plans that claim side effects or alter bound request content", () => {
  const sideEffecting = createLegalSourceAcquisitionPlan(federalManifest, changedObservation);
  sideEffecting.sideEffects.fileWrites = 1;
  assert.throws(() => validateLegalSourceAcquisitionPlan(sideEffecting), /must declare zero side effects/);

  const alteredRequest = createLegalSourceAcquisitionPlan(federalManifest, changedObservation);
  alteredRequest.request.parameters[0].value = "changed-after-planning";
  assert.throws(() => validateLegalSourceAcquisitionPlan(alteredRequest), /request digest does not match/);

  const mislabeledEvidence = createLegalSourceAcquisitionPlan(federalManifest, unavailableObservation);
  mislabeledEvidence.decision.action = "create-snapshot";
  mislabeledEvidence.decision.reason = "body-changed";
  assert.throws(() => validateLegalSourceAcquisitionPlan(mislabeledEvidence), /decision does not match its evidence/);

  const alteredComparison = createLegalSourceAcquisitionPlan(federalManifest, changedObservation);
  alteredComparison.comparison[0].after = "2".repeat(64);
  alteredComparison.comparison[0].changed = true;
  assert.throws(() => validateLegalSourceAcquisitionPlan(alteredComparison), /comparison does not match its evidence/);
});

test("formats deterministic human-readable plans with explicit zero effects", () => {
  const output = formatLegalSourceAcquisitionPlan(createLegalSourceAcquisitionPlan(federalManifest, changedObservation));
  assert.match(output, /^Legal source acquisition dry run\n/);
  assert.match(output, /Decision: create-snapshot \(body-changed\)/);
  assert.match(output, /Side effects: 0 network requests, 0 file writes, 0 manifest mutations/);
  assert.match(output, /~ response\.bodySha256:/);
  assert.ok(output.endsWith("\n"));
});

test("CLI emits repeatable JSON without diagnostics on standard error", () => {
  const argumentsList = [
    "scripts/plan-legal-source-acquisition.mjs",
    "--manifest",
    "research/legal/fixtures/us-federal-govinfo-cfr-v1.json",
    "--observation",
    "research/legal/fixtures/observations/us-federal-govinfo-cfr-changed-v1.json",
    "--format",
    "json",
  ];
  const first = spawnSync(process.execPath, argumentsList, { cwd: root, encoding: "utf8" });
  const second = spawnSync(process.execPath, argumentsList, { cwd: root, encoding: "utf8" });
  assert.equal(first.status, 0, first.stderr);
  assert.equal(second.status, 0, second.stderr);
  assert.equal(first.stderr, "");
  assert.equal(first.stdout, second.stdout);
  assert.equal(JSON.parse(first.stdout).decision.action, "create-snapshot");
});
