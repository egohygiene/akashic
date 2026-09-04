import { createHash } from "node:crypto";

const ACTIONS = new Set(["acquire", "blocked", "create-snapshot", "no-change", "record-unavailable"]);
const ACQUISITION_MODES = new Set(["api", "bulk", "manual", "synthetic-fixture"]);
const FAILURE_CODES = new Set(["access-denied", "network-error", "not-found", "rate-limited", "server-error", "unknown"]);
const OBSERVATION_RESULTS = new Set(["available", "unavailable", "unknown"]);
const REASONS = new Set(["body-changed", "body-unchanged", "no-current-snapshot", "observation-required", "observation-unknown", "source-restored", "source-unavailable", "unexpected-media-type"]);
const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SHA256_PATTERN = /^[a-f0-9]{64}$/;

export const LEGAL_SOURCE_OBSERVATION_SCHEMA = "https://akashic.egohygiene.io/schemas/legal-source-observation-v1.schema.json";
export const LEGAL_SOURCE_OBSERVATION_SCHEMA_VERSION = 1;
export const LEGAL_SOURCE_ACQUISITION_PLAN_SCHEMA = "https://akashic.egohygiene.io/schemas/legal-source-acquisition-plan-v1.schema.json";
export const LEGAL_SOURCE_ACQUISITION_PLAN_SCHEMA_VERSION = 1;

function assertObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} must be an object.`);
}

function rejectUnknownFields(value, allowedFields, label) {
  const unknownFields = Object.keys(value).filter((field) => !allowedFields.includes(field));
  if (unknownFields.length) throw new Error(`${label} has unsupported fields: ${unknownFields.join(", ")}.`);
}

function assertId(value, label) {
  if (!ID_PATTERN.test(value || "")) throw new Error(`${label} must be a stable lowercase ID.`);
}

function assertString(value, label) {
  if (typeof value !== "string" || !value.trim() || value !== value.trim()) throw new Error(`${label} must be a trimmed non-empty string.`);
}

function assertTimestamp(value, label) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(value) || Number.isNaN(Date.parse(value))) throw new Error(`${label} must be a UTC timestamp without fractional seconds.`);
}

function assertSha256(value, label, { allowNull = false } = {}) {
  if (allowNull && value === null) return;
  if (!SHA256_PATTERN.test(value || "")) throw new Error(`${label} must be ${allowNull ? "null or " : ""}a lowercase SHA-256 digest.`);
}

function assertNullableString(value, label) {
  if (value !== null) assertString(value, label);
}

function assertHttpsUrl(value, label) {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "https:" || parsed.username || parsed.password) throw new Error();
  } catch {
    throw new Error(`${label} must be a credential-free HTTPS URL.`);
  }
}

function compareStrings(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort(compareStrings).map((key) => [key, canonicalize(value[key])]));
  }
  return value;
}

export function canonicalSha256(value) {
  return createHash("sha256").update(JSON.stringify(canonicalize(value))).digest("hex");
}

function validatePrivacy(privacy) {
  assertObject(privacy, "Legal source observation privacy");
  rejectUnknownFields(privacy, ["containsPrivateData", "containsUserQueries", "maximumSensitivity", "publicInputsOnly", "sourceContentIsInstructions"], "Legal source observation privacy");
  if (privacy.publicInputsOnly !== true || privacy.containsPrivateData !== false || privacy.containsUserQueries !== false || privacy.maximumSensitivity !== "public" || privacy.sourceContentIsInstructions !== false) throw new Error("Legal source observations must preserve the public-only, evidence-not-instructions privacy boundary.");
}

export function validateLegalSourceObservation(observation, manifest) {
  assertObject(observation, "Legal source observation");
  rejectUnknownFields(observation, ["$schema", "bodyBytes", "bodySha256", "failureCode", "fixture", "headersSha256", "httpStatus", "manifestId", "mediaType", "observationId", "observedAt", "privacy", "result", "schemaVersion"], "Legal source observation");
  if (observation.$schema !== LEGAL_SOURCE_OBSERVATION_SCHEMA || observation.schemaVersion !== LEGAL_SOURCE_OBSERVATION_SCHEMA_VERSION) throw new Error("Unsupported legal source observation schema.");
  assertId(observation.observationId, "Legal source observationId");
  if (typeof observation.fixture !== "boolean" || observation.fixture !== manifest.fixture) throw new Error("Legal source observation fixture status must match its manifest.");
  if (observation.manifestId !== manifest.manifestId) throw new Error("Legal source observation must identify its manifest.");
  assertTimestamp(observation.observedAt, "Legal source observedAt");
  if (!OBSERVATION_RESULTS.has(observation.result)) throw new Error("Legal source observation result must use a controlled value.");
  if (observation.httpStatus !== null && (!Number.isInteger(observation.httpStatus) || observation.httpStatus < 100 || observation.httpStatus > 599)) throw new Error("Legal source observation httpStatus must be null or a valid HTTP status.");
  assertNullableString(observation.mediaType, "Legal source observation mediaType");
  if (observation.bodyBytes !== null && (!Number.isInteger(observation.bodyBytes) || observation.bodyBytes < 1)) throw new Error("Legal source observation bodyBytes must be null or a positive integer.");
  assertSha256(observation.headersSha256, "Legal source observation headersSha256", { allowNull: true });
  assertSha256(observation.bodySha256, "Legal source observation bodySha256", { allowNull: true });
  if (observation.failureCode !== null && !FAILURE_CODES.has(observation.failureCode)) throw new Error("Legal source observation failureCode must use a controlled value.");
  validatePrivacy(observation.privacy);

  if (observation.result === "available") {
    if (observation.httpStatus === null || observation.httpStatus < 200 || observation.httpStatus > 299) throw new Error("Available legal source observations require a successful HTTP status.");
    if (observation.mediaType === null || observation.bodyBytes === null || observation.bodySha256 === null || observation.failureCode !== null) throw new Error("Available legal source observations require media and body evidence without a failure code.");
  } else {
    if (observation.mediaType !== null || observation.bodyBytes !== null || observation.bodySha256 !== null || observation.failureCode === null) throw new Error("Unavailable or unknown legal source observations must fail closed without body claims.");
    if (observation.result === "unavailable" && observation.httpStatus !== null && observation.httpStatus < 400) throw new Error("Unavailable legal source observations cannot claim a successful HTTP status.");
  }

  const currentSnapshot = manifest.snapshots.find((snapshot) => snapshot.state === "current");
  if (currentSnapshot && observation.observedAt <= currentSnapshot.response.retrievedAt) throw new Error("Legal source observations must be newer than the current snapshot response.");
  return { manifestId: observation.manifestId, observationId: observation.observationId, result: observation.result };
}

function requestFor(manifest) {
  const request = {
    endpoint: manifest.source.acquisitionEndpoint,
    expectedMediaType: manifest.acquisition.responseMediaType,
    method: manifest.acquisition.method,
    mode: manifest.acquisition.mode,
    parameters: Object.entries(manifest.acquisition.requestParameters)
      .sort(([left], [right]) => compareStrings(left, right))
      .map(([name, value]) => ({ name, value })),
    tool: structuredClone(manifest.acquisition.tool),
  };
  return { ...request, canonicalSha256: canonicalSha256(request) };
}

function observationSummary(observation) {
  if (!observation) return null;
  return {
    id: observation.observationId,
    canonicalSha256: canonicalSha256(observation),
    result: observation.result,
    observedAt: observation.observedAt,
    httpStatus: observation.httpStatus,
    mediaType: observation.mediaType,
    bodyBytes: observation.bodyBytes,
    headersSha256: observation.headersSha256,
    bodySha256: observation.bodySha256,
    failureCode: observation.failureCode,
  };
}

function responseStatus(manifest, observation) {
  if (observation.result === "available") return manifest.fixture ? "synthetic" : "captured";
  return observation.result;
}

function comparisonFor(manifest, currentSnapshot, observation) {
  if (!observation) return [];
  const before = currentSnapshot?.response || {};
  const comparison = [
    { field: "rawArtifact.bytes", before: currentSnapshot?.rawArtifact?.bytes ?? null, after: observation.bodyBytes },
    { field: "response.bodySha256", before: before.bodySha256 ?? null, after: observation.bodySha256 },
    { field: "response.headersSha256", before: before.headersSha256 ?? null, after: observation.headersSha256 },
    { field: "response.httpStatus", before: before.httpStatus ?? null, after: observation.httpStatus },
    { field: "response.mediaType", before: before.mediaType ?? null, after: observation.mediaType },
    { field: "response.retrievedAt", before: before.retrievedAt ?? null, after: observation.observedAt },
    { field: "response.status", before: before.status ?? null, after: responseStatus(manifest, observation) },
  ];
  return comparison.map((entry) => ({ ...entry, changed: entry.before !== entry.after }));
}

function proposedSnapshotId(manifest, observation) {
  const date = observation.observedAt.slice(0, 10);
  const fingerprint = observation.bodySha256 || canonicalSha256(observation);
  return `${manifest.manifestId}-snapshot-${date}-${fingerprint.slice(0, 12)}`;
}

function decisionFor(manifest, currentSnapshot, observation) {
  if (!observation) return { action: "acquire", reason: "observation-required", proposedSnapshotId: null, requiresManifestApply: false, requiresHumanReview: false };
  if (observation.result === "unknown") return { action: "blocked", reason: "observation-unknown", proposedSnapshotId: null, requiresManifestApply: false, requiresHumanReview: true };
  if (!manifest.fixture && observation.result === "available" && observation.mediaType !== manifest.acquisition.responseMediaType) return { action: "blocked", reason: "unexpected-media-type", proposedSnapshotId: null, requiresManifestApply: false, requiresHumanReview: true };
  if (observation.result === "unavailable") return { action: "record-unavailable", reason: "source-unavailable", proposedSnapshotId: proposedSnapshotId(manifest, observation), requiresManifestApply: true, requiresHumanReview: true };
  if (currentSnapshot?.availability === "available" && currentSnapshot.rawArtifact.sha256 === observation.bodySha256) return { action: "no-change", reason: "body-unchanged", proposedSnapshotId: null, requiresManifestApply: false, requiresHumanReview: false };
  const reason = !currentSnapshot ? "no-current-snapshot" : currentSnapshot.availability === "unavailable" ? "source-restored" : "body-changed";
  return { action: "create-snapshot", reason, proposedSnapshotId: proposedSnapshotId(manifest, observation), requiresManifestApply: true, requiresHumanReview: true };
}

export function createLegalSourceAcquisitionPlan(manifest, observation = null) {
  if (observation) validateLegalSourceObservation(observation, manifest);
  const currentSnapshot = manifest.snapshots.find((snapshot) => snapshot.state === "current") || null;
  const observationRecord = observationSummary(observation);
  const plan = {
    $schema: LEGAL_SOURCE_ACQUISITION_PLAN_SCHEMA,
    schemaVersion: LEGAL_SOURCE_ACQUISITION_PLAN_SCHEMA_VERSION,
    planId: observation ? `${observation.observationId}-plan-v1` : `${manifest.manifestId}-acquisition-plan-v1`,
    mode: "dry-run",
    manifest: {
      id: manifest.manifestId,
      canonicalSha256: canonicalSha256(manifest),
      jurisdictionId: manifest.jurisdictionId,
      authorityType: manifest.authorityType,
    },
    request: requestFor(manifest),
    base: {
      currentSnapshotId: currentSnapshot?.id || null,
      retrievedAt: currentSnapshot?.response.retrievedAt || null,
      responseStatus: currentSnapshot?.response.status || null,
      httpStatus: currentSnapshot?.response.httpStatus ?? null,
      mediaType: currentSnapshot?.response.mediaType ?? null,
      headersSha256: currentSnapshot?.response.headersSha256 ?? null,
      rawArtifactBytes: currentSnapshot?.rawArtifact?.bytes ?? null,
      bodySha256: currentSnapshot?.response.bodySha256 || null,
    },
    observation: observationRecord,
    decision: decisionFor(manifest, currentSnapshot, observation),
    comparison: comparisonFor(manifest, currentSnapshot, observation),
    sideEffects: {
      networkRequests: 0,
      fileWrites: 0,
      manifestMutations: 0,
    },
  };
  validateLegalSourceAcquisitionPlan(plan);
  return plan;
}

function validateRequest(request) {
  assertObject(request, "Legal source acquisition plan request");
  rejectUnknownFields(request, ["canonicalSha256", "endpoint", "expectedMediaType", "method", "mode", "parameters", "tool"], "Legal source acquisition plan request");
  assertHttpsUrl(request.endpoint, "Legal source acquisition plan endpoint");
  assertString(request.expectedMediaType, "Legal source acquisition plan expectedMediaType");
  if (request.method !== "GET") throw new Error("Legal source acquisition plan method must be GET.");
  if (!ACQUISITION_MODES.has(request.mode)) throw new Error("Legal source acquisition plan mode must use a controlled value.");
  if (!Array.isArray(request.parameters)) throw new Error("Legal source acquisition plan parameters must be an array.");
  const parameterNames = [];
  for (const parameter of request.parameters) {
    assertObject(parameter, "Legal source acquisition plan parameter");
    rejectUnknownFields(parameter, ["name", "value"], "Legal source acquisition plan parameter");
    assertString(parameter.name, "Legal source acquisition plan parameter name");
    if (typeof parameter.value !== "string") throw new Error("Legal source acquisition plan parameter value must be a string.");
    if (/(authorization|credential|key|secret|token)/i.test(parameter.name)) throw new Error("Legal source acquisition plans must not contain credential-bearing parameters.");
    parameterNames.push(parameter.name);
  }
  if (new Set(parameterNames).size !== parameterNames.length || JSON.stringify(parameterNames) !== JSON.stringify([...parameterNames].sort(compareStrings))) throw new Error("Legal source acquisition plan parameters must be unique and sorted.");
  assertObject(request.tool, "Legal source acquisition plan tool");
  rejectUnknownFields(request.tool, ["name", "version"], "Legal source acquisition plan tool");
  assertString(request.tool.name, "Legal source acquisition plan tool name");
  assertString(request.tool.version, "Legal source acquisition plan tool version");
  assertSha256(request.canonicalSha256, "Legal source acquisition plan request canonicalSha256");
  const { canonicalSha256: recordedDigest, ...requestContent } = request;
  if (canonicalSha256(requestContent) !== recordedDigest) throw new Error("Legal source acquisition plan request digest does not match its content.");
}

function expectedDecisionForPlan(plan) {
  const observation = plan.observation;
  if (!observation) return { action: "acquire", reason: "observation-required", proposedSnapshotId: null, requiresManifestApply: false, requiresHumanReview: false };
  if (observation.result === "unknown") return { action: "blocked", reason: "observation-unknown", proposedSnapshotId: null, requiresManifestApply: false, requiresHumanReview: true };
  if (observation.result === "available" && plan.request.mode !== "synthetic-fixture" && observation.mediaType !== plan.request.expectedMediaType) return { action: "blocked", reason: "unexpected-media-type", proposedSnapshotId: null, requiresManifestApply: false, requiresHumanReview: true };
  const proposal = `${plan.manifest.id}-snapshot-${observation.observedAt.slice(0, 10)}-${(observation.bodySha256 || observation.canonicalSha256).slice(0, 12)}`;
  if (observation.result === "unavailable") return { action: "record-unavailable", reason: "source-unavailable", proposedSnapshotId: proposal, requiresManifestApply: true, requiresHumanReview: true };
  if (plan.base.bodySha256 !== null && plan.base.bodySha256 === observation.bodySha256) return { action: "no-change", reason: "body-unchanged", proposedSnapshotId: null, requiresManifestApply: false, requiresHumanReview: false };
  const reason = plan.base.currentSnapshotId === null ? "no-current-snapshot" : plan.base.responseStatus === "unavailable" ? "source-restored" : "body-changed";
  return { action: "create-snapshot", reason, proposedSnapshotId: proposal, requiresManifestApply: true, requiresHumanReview: true };
}

function expectedComparisonForPlan(plan) {
  if (!plan.observation) return [];
  const expected = [
    { field: "rawArtifact.bytes", before: plan.base.rawArtifactBytes, after: plan.observation.bodyBytes },
    { field: "response.bodySha256", before: plan.base.bodySha256, after: plan.observation.bodySha256 },
    { field: "response.headersSha256", before: plan.base.headersSha256, after: plan.observation.headersSha256 },
    { field: "response.httpStatus", before: plan.base.httpStatus, after: plan.observation.httpStatus },
    { field: "response.mediaType", before: plan.base.mediaType, after: plan.observation.mediaType },
    { field: "response.retrievedAt", before: plan.base.retrievedAt, after: plan.observation.observedAt },
    { field: "response.status", before: plan.base.responseStatus, after: plan.observation.result === "available" ? plan.request.mode === "synthetic-fixture" ? "synthetic" : "captured" : plan.observation.result },
  ];
  return expected.map((entry) => ({ ...entry, changed: entry.before !== entry.after }));
}

export function validateLegalSourceAcquisitionPlan(plan) {
  assertObject(plan, "Legal source acquisition plan");
  rejectUnknownFields(plan, ["$schema", "base", "comparison", "decision", "manifest", "mode", "observation", "planId", "request", "schemaVersion", "sideEffects"], "Legal source acquisition plan");
  if (plan.$schema !== LEGAL_SOURCE_ACQUISITION_PLAN_SCHEMA || plan.schemaVersion !== LEGAL_SOURCE_ACQUISITION_PLAN_SCHEMA_VERSION || plan.mode !== "dry-run") throw new Error("Unsupported legal source acquisition plan schema or mode.");
  assertId(plan.planId, "Legal source acquisition planId");
  assertObject(plan.manifest, "Legal source acquisition plan manifest");
  rejectUnknownFields(plan.manifest, ["authorityType", "canonicalSha256", "id", "jurisdictionId"], "Legal source acquisition plan manifest");
  for (const field of ["id", "jurisdictionId", "authorityType"]) assertId(plan.manifest[field], `Legal source acquisition plan manifest ${field}`);
  assertSha256(plan.manifest.canonicalSha256, "Legal source acquisition plan manifest canonicalSha256");
  validateRequest(plan.request);

  assertObject(plan.base, "Legal source acquisition plan base");
  rejectUnknownFields(plan.base, ["bodySha256", "currentSnapshotId", "headersSha256", "httpStatus", "mediaType", "rawArtifactBytes", "responseStatus", "retrievedAt"], "Legal source acquisition plan base");
  if (plan.base.currentSnapshotId !== null) assertId(plan.base.currentSnapshotId, "Legal source acquisition plan currentSnapshotId");
  if (plan.base.retrievedAt !== null) assertTimestamp(plan.base.retrievedAt, "Legal source acquisition plan base retrievedAt");
  assertNullableString(plan.base.responseStatus, "Legal source acquisition plan base responseStatus");
  if (plan.base.httpStatus !== null && (!Number.isInteger(plan.base.httpStatus) || plan.base.httpStatus < 100 || plan.base.httpStatus > 599)) throw new Error("Legal source acquisition plan base httpStatus must be null or a valid HTTP status.");
  assertNullableString(plan.base.mediaType, "Legal source acquisition plan base mediaType");
  assertSha256(plan.base.headersSha256, "Legal source acquisition plan base headersSha256", { allowNull: true });
  if (plan.base.rawArtifactBytes !== null && (!Number.isInteger(plan.base.rawArtifactBytes) || plan.base.rawArtifactBytes < 1)) throw new Error("Legal source acquisition plan base rawArtifactBytes must be null or a positive integer.");
  assertSha256(plan.base.bodySha256, "Legal source acquisition plan base bodySha256", { allowNull: true });
  if (plan.base.currentSnapshotId === null && Object.entries(plan.base).some(([field, value]) => field !== "currentSnapshotId" && value !== null)) throw new Error("Legal source acquisition plan without a current snapshot cannot claim base response evidence.");
  if (plan.base.currentSnapshotId !== null && (plan.base.retrievedAt === null || plan.base.responseStatus === null)) throw new Error("Legal source acquisition plan current snapshot requires base response evidence.");

  if (plan.observation !== null) {
    assertObject(plan.observation, "Legal source acquisition plan observation");
    rejectUnknownFields(plan.observation, ["bodyBytes", "bodySha256", "canonicalSha256", "failureCode", "headersSha256", "httpStatus", "id", "mediaType", "observedAt", "result"], "Legal source acquisition plan observation");
    assertId(plan.observation.id, "Legal source acquisition plan observation id");
    assertSha256(plan.observation.canonicalSha256, "Legal source acquisition plan observation canonicalSha256");
    if (!OBSERVATION_RESULTS.has(plan.observation.result)) throw new Error("Legal source acquisition plan observation result must use a controlled value.");
    assertTimestamp(plan.observation.observedAt, "Legal source acquisition plan observation observedAt");
    if (plan.observation.httpStatus !== null && (!Number.isInteger(plan.observation.httpStatus) || plan.observation.httpStatus < 100 || plan.observation.httpStatus > 599)) throw new Error("Legal source acquisition plan observation httpStatus must be null or a valid HTTP status.");
    assertNullableString(plan.observation.mediaType, "Legal source acquisition plan observation mediaType");
    if (plan.observation.bodyBytes !== null && (!Number.isInteger(plan.observation.bodyBytes) || plan.observation.bodyBytes < 1)) throw new Error("Legal source acquisition plan observation bodyBytes must be null or a positive integer.");
    assertSha256(plan.observation.headersSha256, "Legal source acquisition plan observation headersSha256", { allowNull: true });
    assertSha256(plan.observation.bodySha256, "Legal source acquisition plan observation bodySha256", { allowNull: true });
    if (plan.observation.failureCode !== null && !FAILURE_CODES.has(plan.observation.failureCode)) throw new Error("Legal source acquisition plan observation failureCode must use a controlled value.");
    if (plan.observation.result === "available" && (plan.observation.httpStatus === null || plan.observation.httpStatus < 200 || plan.observation.httpStatus > 299 || plan.observation.mediaType === null || plan.observation.bodyBytes === null || plan.observation.bodySha256 === null || plan.observation.failureCode !== null)) throw new Error("Available legal source acquisition plan observations require successful body evidence.");
    if (plan.observation.result !== "available" && (plan.observation.mediaType !== null || plan.observation.bodyBytes !== null || plan.observation.bodySha256 !== null || plan.observation.failureCode === null)) throw new Error("Unavailable or unknown legal source acquisition plan observations must fail closed.");
    if (plan.observation.result === "unavailable" && plan.observation.httpStatus !== null && plan.observation.httpStatus < 400) throw new Error("Unavailable legal source acquisition plan observations cannot claim a successful HTTP status.");
  }

  assertObject(plan.decision, "Legal source acquisition plan decision");
  rejectUnknownFields(plan.decision, ["action", "proposedSnapshotId", "reason", "requiresHumanReview", "requiresManifestApply"], "Legal source acquisition plan decision");
  if (!ACTIONS.has(plan.decision.action) || !REASONS.has(plan.decision.reason)) throw new Error("Legal source acquisition plan decision must use controlled values.");
  if (typeof plan.decision.requiresManifestApply !== "boolean" || typeof plan.decision.requiresHumanReview !== "boolean") throw new Error("Legal source acquisition plan decision flags must be boolean.");
  if (plan.decision.proposedSnapshotId !== null) assertId(plan.decision.proposedSnapshotId, "Legal source acquisition plan proposedSnapshotId");
  const decisionShapes = {
    acquire: { reasons: ["observation-required"], apply: false, review: false, proposal: false },
    blocked: { reasons: ["observation-unknown", "unexpected-media-type"], apply: false, review: true, proposal: false },
    "create-snapshot": { reasons: ["body-changed", "no-current-snapshot", "source-restored"], apply: true, review: true, proposal: true },
    "no-change": { reasons: ["body-unchanged"], apply: false, review: false, proposal: false },
    "record-unavailable": { reasons: ["source-unavailable"], apply: true, review: true, proposal: true },
  };
  const expected = decisionShapes[plan.decision.action];
  if (!expected.reasons.includes(plan.decision.reason) || plan.decision.requiresManifestApply !== expected.apply || plan.decision.requiresHumanReview !== expected.review || (plan.decision.proposedSnapshotId !== null) !== expected.proposal) throw new Error("Legal source acquisition plan decision fields are inconsistent.");
  if ((plan.observation === null) !== (plan.decision.action === "acquire")) throw new Error("Legal source acquisition plans require an observation for dry-run decisions.");
  if (plan.planId !== (plan.observation ? `${plan.observation.id}-plan-v1` : `${plan.manifest.id}-acquisition-plan-v1`)) throw new Error("Legal source acquisition planId does not match its inputs.");
  if (JSON.stringify(canonicalize(plan.decision)) !== JSON.stringify(canonicalize(expectedDecisionForPlan(plan)))) throw new Error("Legal source acquisition plan decision does not match its evidence.");

  if (!Array.isArray(plan.comparison)) throw new Error("Legal source acquisition plan comparison must be an array.");
  const comparisonFields = [];
  for (const entry of plan.comparison) {
    assertObject(entry, "Legal source acquisition comparison");
    rejectUnknownFields(entry, ["after", "before", "changed", "field"], "Legal source acquisition comparison");
    assertString(entry.field, "Legal source acquisition comparison field");
    if (!["string", "number"].includes(typeof entry.before) && entry.before !== null) throw new Error("Legal source acquisition comparison before value is invalid.");
    if (!["string", "number"].includes(typeof entry.after) && entry.after !== null) throw new Error("Legal source acquisition comparison after value is invalid.");
    if (entry.changed !== (entry.before !== entry.after)) throw new Error("Legal source acquisition comparison changed flag is inconsistent.");
    comparisonFields.push(entry.field);
  }
  if (new Set(comparisonFields).size !== comparisonFields.length || JSON.stringify(comparisonFields) !== JSON.stringify([...comparisonFields].sort(compareStrings))) throw new Error("Legal source acquisition comparisons must be unique and sorted.");
  if (plan.observation === null ? plan.comparison.length : plan.comparison.length !== 7) throw new Error("Legal source acquisition comparison does not match observation availability.");
  if (JSON.stringify(canonicalize(plan.comparison)) !== JSON.stringify(canonicalize(expectedComparisonForPlan(plan)))) throw new Error("Legal source acquisition comparison does not match its evidence.");

  assertObject(plan.sideEffects, "Legal source acquisition plan sideEffects");
  rejectUnknownFields(plan.sideEffects, ["fileWrites", "manifestMutations", "networkRequests"], "Legal source acquisition plan sideEffects");
  if (plan.sideEffects.networkRequests !== 0 || plan.sideEffects.fileWrites !== 0 || plan.sideEffects.manifestMutations !== 0) throw new Error("Legal source acquisition dry runs must declare zero side effects.");
  return { action: plan.decision.action, planId: plan.planId };
}

function displayValue(value) {
  return value === null ? "null" : String(value);
}

export function formatLegalSourceAcquisitionPlan(plan) {
  validateLegalSourceAcquisitionPlan(plan);
  const lines = [
    "Legal source acquisition dry run",
    `Plan: ${plan.planId}`,
    `Manifest: ${plan.manifest.id} (${plan.manifest.canonicalSha256})`,
    `Request: ${plan.request.method} ${plan.request.endpoint}`,
  ];
  for (const parameter of plan.request.parameters) lines.push(`  parameter ${parameter.name}=${parameter.value}`);
  lines.push(`Request digest: ${plan.request.canonicalSha256}`);
  lines.push(plan.observation ? `Observation: ${plan.observation.id} (${plan.observation.canonicalSha256})` : "Observation: required");
  lines.push(`Decision: ${plan.decision.action} (${plan.decision.reason})`);
  lines.push(`Proposed snapshot: ${plan.decision.proposedSnapshotId || "none"}`);
  lines.push("Side effects: 0 network requests, 0 file writes, 0 manifest mutations");
  lines.push("Comparison:");
  if (!plan.comparison.length) lines.push("  none until an observation is supplied");
  for (const entry of plan.comparison) lines.push(`  ${entry.changed ? "~" : "="} ${entry.field}: ${displayValue(entry.before)} -> ${displayValue(entry.after)}`);
  return `${lines.join("\n")}\n`;
}
