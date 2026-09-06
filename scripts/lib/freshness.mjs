import { repositoryIndexDigest } from "./bookmark-intake.mjs";
import { inspectBookmarkUrl, urlIdentity } from "./url-identity.mjs";

export const FRESHNESS_SCHEMA_VERSION = 1;

const ATTEMPT_OUTCOMES = new Set(["response", "connection-error", "dns-error", "timeout", "tls-error"]);
const EXCEPTION_SCOPES = new Set(["github-archived", "github-renamed", "link-failure", "redirect"]);
const FAILURE_CLASSES = new Set(["client-error", "network-error", "server-error"]);
const RESPONSE_CLASSES = new Set(["client-error", "network-error", "rate-limited", "redirected", "server-error", "success"]);
const REVIEW_TIER_DAYS = Object.freeze({ annual: 365, semiannual: 183, quarterly: 92, monthly: 31 });
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;
const REPOSITORY_PATTERN = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;

function fail(context, message) {
  throw new Error(`${context}: ${message}`);
}

function assertObject(value, context) {
  if (!value || Array.isArray(value) || typeof value !== "object") fail(context, "must be an object.");
}

function rejectUnknownFields(value, allowed, context) {
  for (const field of Object.keys(value)) {
    if (!allowed.includes(field)) fail(context, `unknown field ${field}.`);
  }
}

function validateDate(value, context) {
  if (typeof value !== "string" || !DATE_PATTERN.test(value)) fail(context, "must be a YYYY-MM-DD date.");
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== value) fail(context, "must be a real date.");
  return value;
}

function validateTimestamp(value, context) {
  if (typeof value !== "string" || !TIMESTAMP_PATTERN.test(value) || Number.isNaN(new Date(value).valueOf())) fail(context, "must be an ISO 8601 UTC timestamp.");
  return value;
}

function validateSha256(value, context) {
  if (typeof value !== "string" || !/^[a-f0-9]{64}$/.test(value)) fail(context, "must be a lowercase SHA-256 digest.");
  return value;
}

function resourceById(index) {
  const resources = new Map();
  for (const resource of index.resources) {
    if (resources.has(resource.id)) fail("Freshness catalog", `duplicate resource ID ${resource.id}.`);
    resources.set(resource.id, resource);
  }
  return resources;
}

function validateBoundResource(value, resource, context) {
  if (value.source !== resource.source) fail(context, `source does not match ${resource.id}.`);
  if (urlIdentity(value.url) !== urlIdentity(resource.url)) fail(context, `URL does not match ${resource.id}.`);
}

function validateGithubState(value, resource, context) {
  if (value === null) return null;
  assertObject(value, context);
  rejectUnknownFields(value, ["repository", "canonicalRepository", "archived"], context);
  if (new URL(resource.url).hostname.toLocaleLowerCase("en-US").replace(/^www\./, "") !== "github.com") fail(context, "is only allowed for github.com resources.");
  if (!REPOSITORY_PATTERN.test(value.repository || "") || !REPOSITORY_PATTERN.test(value.canonicalRepository || "")) fail(context, "repository names must use owner/name.");
  if (typeof value.archived !== "boolean") fail(context, "archived must be boolean.");
  const pathParts = new URL(resource.url).pathname.split("/").filter(Boolean).slice(0, 2);
  const requestedRepository = pathParts.length === 2 ? `${pathParts[0]}/${pathParts[1].replace(/\.git$/i, "")}` : null;
  if (!requestedRepository || requestedRepository.toLocaleLowerCase("en-US") !== value.repository.toLocaleLowerCase("en-US")) fail(context, "repository does not match the catalog URL.");
  return value;
}

function validateAttempt(attempt, context) {
  assertObject(attempt, context);
  rejectUnknownFields(attempt, ["method", "outcome", "statusCode", "durationMs"], context);
  if (!["HEAD", "GET"].includes(attempt.method)) fail(context, "method must be HEAD or GET.");
  if (!ATTEMPT_OUTCOMES.has(attempt.outcome)) fail(context, `unsupported outcome ${attempt.outcome}.`);
  if (!Number.isInteger(attempt.durationMs) || attempt.durationMs < 0) fail(context, "durationMs must be a non-negative integer.");
  if (attempt.outcome === "response") {
    if (!Number.isInteger(attempt.statusCode) || attempt.statusCode < 200 || attempt.statusCode > 599) fail(context, "response statusCode must be between 200 and 599.");
  } else if (attempt.statusCode !== null) {
    fail(context, "non-response attempts must use a null statusCode.");
  }
  return attempt;
}

export function validateFreshnessObservationBundle(bundle, index) {
  const context = "Freshness observation bundle";
  assertObject(bundle, context);
  rejectUnknownFields(bundle, ["schemaVersion", "catalogSha256", "observedAt", "observations"], context);
  if (bundle.schemaVersion !== FRESHNESS_SCHEMA_VERSION) fail(context, `schemaVersion must be ${FRESHNESS_SCHEMA_VERSION}.`);
  const expectedCatalogDigest = repositoryIndexDigest(index);
  validateSha256(bundle.catalogSha256, `${context} catalogSha256`);
  if (bundle.catalogSha256 !== expectedCatalogDigest) fail(context, "catalog digest does not match the current repository resource index.");
  validateTimestamp(bundle.observedAt, `${context} observedAt`);
  if (!Array.isArray(bundle.observations) || !bundle.observations.length) fail(context, "observations must be a non-empty array.");

  const resources = resourceById(index);
  const observedIds = new Set();
  for (const [entryIndex, observation] of bundle.observations.entries()) {
    const entryContext = `Freshness observation ${entryIndex + 1}`;
    assertObject(observation, entryContext);
    rejectUnknownFields(observation, ["resourceId", "source", "url", "attempts", "finalUrl", "github"], entryContext);
    const resource = resources.get(observation.resourceId);
    if (!resource) fail(entryContext, `unknown resource ID ${observation.resourceId}.`);
    if (observedIds.has(observation.resourceId)) fail(entryContext, `duplicate resource ID ${observation.resourceId}.`);
    observedIds.add(observation.resourceId);
    validateBoundResource(observation, resource, entryContext);
    if (!Array.isArray(observation.attempts) || !observation.attempts.length || observation.attempts.length > 5) fail(entryContext, "attempts must contain between one and five entries.");
    let getStarted = false;
    for (const [attemptIndex, attempt] of observation.attempts.entries()) {
      validateAttempt(attempt, `${entryContext} attempt ${attemptIndex + 1}`);
      if (getStarted && attempt.method === "HEAD") fail(entryContext, "HEAD cannot follow GET fallback.");
      if (attempt.method === "GET") getStarted = true;
    }
    const finalAttempt = observation.attempts.at(-1);
    if (finalAttempt.outcome === "response") {
      const inspected = inspectBookmarkUrl(observation.finalUrl);
      if (!inspected.accepted) fail(entryContext, `finalUrl is unsafe: ${inspected.reason}.`);
    } else if (observation.finalUrl !== null) {
      fail(entryContext, "network-error observations must use a null finalUrl.");
    }
    validateGithubState(observation.github, resource, `${entryContext} github`);
  }
  return bundle;
}

function deriveObservation(observation) {
  const finalAttempt = observation.attempts.at(-1);
  if (finalAttempt.outcome !== "response") {
    return { responseClass: "network-error", statusCode: null, redirectDestination: null };
  }
  const statusCode = finalAttempt.statusCode;
  const moved = urlIdentity(observation.finalUrl) !== urlIdentity(observation.url);
  if (statusCode === 429) return { responseClass: "rate-limited", statusCode, redirectDestination: moved ? observation.finalUrl : null };
  if (statusCode >= 500) return { responseClass: "server-error", statusCode, redirectDestination: moved ? observation.finalUrl : null };
  if (statusCode >= 400) return { responseClass: "client-error", statusCode, redirectDestination: moved ? observation.finalUrl : null };
  return { responseClass: moved || statusCode >= 300 ? "redirected" : "success", statusCode, redirectDestination: moved ? observation.finalUrl : null };
}

function validateStateRecord(record, resource, context) {
  assertObject(record, context);
  rejectUnknownFields(record, ["resourceId", "source", "url", "lastObservedAt", "lastSuccessfulAt", "responseClass", "statusCode", "redirectDestination", "consecutiveFailures", "github"], context);
  validateBoundResource(record, resource, context);
  validateTimestamp(record.lastObservedAt, `${context} lastObservedAt`);
  if (record.lastSuccessfulAt !== null) {
    validateTimestamp(record.lastSuccessfulAt, `${context} lastSuccessfulAt`);
    if (new Date(record.lastSuccessfulAt) > new Date(record.lastObservedAt)) fail(context, "lastSuccessfulAt cannot follow lastObservedAt.");
  }
  if (!RESPONSE_CLASSES.has(record.responseClass)) fail(context, `unsupported responseClass ${record.responseClass}.`);
  if (record.responseClass === "network-error") {
    if (record.statusCode !== null) fail(context, "network-error statusCode must be null.");
  } else if (!Number.isInteger(record.statusCode) || record.statusCode < 200 || record.statusCode > 599) {
    fail(context, "response statusCode must be between 200 and 599.");
  }
  if (record.responseClass === "success" && record.statusCode >= 300) fail(context, "success statusCode must be below 300.");
  if (record.responseClass === "redirected" && record.statusCode >= 400) fail(context, "redirected statusCode must be below 400.");
  if (record.responseClass === "client-error" && (record.statusCode < 400 || record.statusCode >= 500 || record.statusCode === 429)) fail(context, "client-error statusCode must be 4xx other than 429.");
  if (record.responseClass === "rate-limited" && record.statusCode !== 429) fail(context, "rate-limited statusCode must be 429.");
  if (record.responseClass === "server-error" && record.statusCode < 500) fail(context, "server-error statusCode must be 5xx.");
  if (record.redirectDestination !== null && !inspectBookmarkUrl(record.redirectDestination).accepted) fail(context, "redirectDestination must be a safe public HTTP(S) URL.");
  if (!Number.isInteger(record.consecutiveFailures) || record.consecutiveFailures < 0) fail(context, "consecutiveFailures must be a non-negative integer.");
  if (["success", "redirected"].includes(record.responseClass) && record.consecutiveFailures !== 0) fail(context, "successful observations must reset consecutiveFailures.");
  if (["success", "redirected"].includes(record.responseClass) && record.lastSuccessfulAt === null) fail(context, "successful observations must record lastSuccessfulAt.");
  if (FAILURE_CLASSES.has(record.responseClass) && record.consecutiveFailures < 1) fail(context, "failed observations must increment consecutiveFailures.");
  validateGithubState(record.github, resource, `${context} github`);
  return record;
}

export function validateFreshnessState(state, index) {
  const context = "Freshness state";
  assertObject(state, context);
  rejectUnknownFields(state, ["schemaVersion", "catalogSha256", "updatedAt", "records"], context);
  if (state.schemaVersion !== FRESHNESS_SCHEMA_VERSION) fail(context, `schemaVersion must be ${FRESHNESS_SCHEMA_VERSION}.`);
  validateSha256(state.catalogSha256, `${context} catalogSha256`);
  if (state.updatedAt !== null) validateTimestamp(state.updatedAt, `${context} updatedAt`);
  if (!Array.isArray(state.records)) fail(context, "records must be an array.");
  const resources = resourceById(index);
  const ids = new Set();
  for (const [recordIndex, record] of state.records.entries()) {
    const resource = resources.get(record.resourceId);
    if (!resource) fail(`${context} record ${recordIndex + 1}`, `unknown resource ID ${record.resourceId}.`);
    if (ids.has(record.resourceId)) fail(`${context} record ${recordIndex + 1}`, `duplicate resource ID ${record.resourceId}.`);
    ids.add(record.resourceId);
    validateStateRecord(record, resource, `${context} record ${recordIndex + 1}`);
    if (state.updatedAt === null || new Date(record.lastObservedAt) > new Date(state.updatedAt)) fail(`${context} record ${recordIndex + 1}`, "lastObservedAt must not follow state updatedAt.");
  }
  return state;
}

export function emptyFreshnessState(index) {
  return { schemaVersion: FRESHNESS_SCHEMA_VERSION, catalogSha256: repositoryIndexDigest(index), updatedAt: null, records: [] };
}

export function reduceFreshnessObservations({ bundle, previousState, index }) {
  validateFreshnessObservationBundle(bundle, index);
  validateFreshnessState(previousState, index);
  if (previousState.updatedAt && new Date(bundle.observedAt) <= new Date(previousState.updatedAt)) fail("Freshness reducer", "observedAt must follow the previous state update.");
  const records = new Map(previousState.records.map((record) => [record.resourceId, record]));
  for (const observation of bundle.observations) {
    const previous = records.get(observation.resourceId);
    const derived = deriveObservation(observation);
    const succeeded = ["success", "redirected"].includes(derived.responseClass);
    const rateLimited = derived.responseClass === "rate-limited";
    records.set(observation.resourceId, {
      resourceId: observation.resourceId,
      source: observation.source,
      url: observation.url,
      lastObservedAt: bundle.observedAt,
      lastSuccessfulAt: succeeded ? bundle.observedAt : previous?.lastSuccessfulAt || null,
      responseClass: derived.responseClass,
      statusCode: derived.statusCode,
      redirectDestination: derived.redirectDestination,
      consecutiveFailures: succeeded ? 0 : rateLimited ? previous?.consecutiveFailures || 0 : (previous?.consecutiveFailures || 0) + 1,
      github: observation.github ?? previous?.github ?? null,
    });
  }
  return {
    schemaVersion: FRESHNESS_SCHEMA_VERSION,
    catalogSha256: repositoryIndexDigest(index),
    updatedAt: bundle.observedAt,
    records: [...records.values()].sort((left, right) => left.source.localeCompare(right.source) || left.resourceId.localeCompare(right.resourceId)),
  };
}

export function validateFreshnessExceptions(ledger, index) {
  const context = "Freshness exception ledger";
  assertObject(ledger, context);
  rejectUnknownFields(ledger, ["schemaVersion", "notice", "exceptions"], context);
  if (ledger.schemaVersion !== FRESHNESS_SCHEMA_VERSION) fail(context, `schemaVersion must be ${FRESHNESS_SCHEMA_VERSION}.`);
  if (typeof ledger.notice !== "string" || !ledger.notice.includes("human-reviewed") || !/do(?:es)? not prove/.test(ledger.notice)) fail(context, "notice must preserve the human-review and non-proof boundary.");
  if (!Array.isArray(ledger.exceptions)) fail(context, "exceptions must be an array.");
  const resources = resourceById(index);
  const ids = new Set();
  const targets = new Set();
  for (const [entryIndex, exception] of ledger.exceptions.entries()) {
    const entryContext = `${context} entry ${entryIndex + 1}`;
    assertObject(exception, entryContext);
    rejectUnknownFields(exception, ["id", "resourceId", "source", "url", "scope", "reason", "reviewedBy", "reviewedAt", "expiresAt"], entryContext);
    if (typeof exception.id !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(exception.id)) fail(entryContext, "id must be a lowercase slug.");
    if (ids.has(exception.id)) fail(entryContext, `duplicate ID ${exception.id}.`);
    ids.add(exception.id);
    const resource = resources.get(exception.resourceId);
    if (!resource) fail(entryContext, `unknown resource ID ${exception.resourceId}.`);
    validateBoundResource(exception, resource, entryContext);
    if (!EXCEPTION_SCOPES.has(exception.scope)) fail(entryContext, `unsupported scope ${exception.scope}.`);
    const target = `${exception.resourceId}\u0000${exception.scope}`;
    if (targets.has(target)) fail(entryContext, "duplicates a resource and scope.");
    targets.add(target);
    if (typeof exception.reason !== "string" || exception.reason.trim().length < 20 || exception.reason.length > 500) fail(entryContext, "reason must contain 20 to 500 characters.");
    if (typeof exception.reviewedBy !== "string" || !/^[A-Za-z0-9-]+$/.test(exception.reviewedBy)) fail(entryContext, "reviewedBy must be a GitHub login.");
    validateDate(exception.reviewedAt, `${entryContext} reviewedAt`);
    validateDate(exception.expiresAt, `${entryContext} expiresAt`);
    if (exception.expiresAt <= exception.reviewedAt) fail(entryContext, "expiresAt must follow reviewedAt.");
  }
  return ledger;
}

function daysBetween(start, end) {
  return Math.floor((new Date(`${end}T00:00:00Z`) - new Date(`${start}T00:00:00Z`)) / 86_400_000);
}

export function humanReviewPolicy(resource) {
  const metadata = resource.metadata || {};
  const signals = [];
  const candidates = [{ days: REVIEW_TIER_DAYS[metadata.reviewTier] || 365, signal: metadata.reviewTier ? `declared-${metadata.reviewTier}` : "default-annual" }];
  const sensitive = new Set(metadata.sensitive || []);
  const text = `${resource.title} ${resource.description || ""}`.toLocaleLowerCase("en-US");
  if (sensitive.has("crisis") || sensitive.has("emergency") || /\b(?:crisis|emergency hotline)\b/.test(text)) candidates.push({ days: 31, signal: "crisis-or-emergency" });
  if (sensitive.has("legal") || resource.source.startsWith("lists/legal-help-and-law/")) candidates.push({ days: 92, signal: "legal" });
  if (/\bbenefits?|eligibility|public assistance\b/.test(text)) candidates.push({ days: 92, signal: "benefits" });
  if (resource.source.startsWith("lists/travel-and-mobility/")) candidates.push({ days: 183, signal: "travel" });
  if (/\bpricing|prices?|costs?|fees?|subscription\b/.test(text)) candidates.push({ days: 92, signal: "pricing" });
  if (/\bfree tier|free plan|freemium|no-cost|at no cost\b/.test(text)) candidates.push({ days: 92, signal: "free-tier" });
  if (metadata.volatility === "high") candidates.push({ days: 92, signal: "high-volatility" });
  const cadenceDays = Math.min(...candidates.map((candidate) => candidate.days));
  for (const candidate of candidates) if (candidate.days === cadenceDays) signals.push(candidate.signal);
  return { cadenceDays, signals: [...new Set(signals)].sort() };
}

function operationalReasons(record) {
  const reasons = [];
  if (!record) return reasons;
  if (FAILURE_CLASSES.has(record.responseClass)) reasons.push("link-failure");
  if (record.responseClass === "rate-limited") reasons.push("rate-limited");
  if (record.responseClass === "redirected" || record.redirectDestination) reasons.push("redirect");
  if (record.github?.repository.toLocaleLowerCase("en-US") !== record.github?.canonicalRepository.toLocaleLowerCase("en-US")) reasons.push("github-renamed");
  if (record.github?.archived) reasons.push("github-archived");
  return reasons;
}

function queuePriority(resource, record, reasons) {
  const sensitive = new Set(resource.metadata?.sensitive || []);
  if (reasons.includes("github-archived") || reasons.includes("github-renamed") || reasons.includes("redirect")) return 1;
  if (reasons.includes("link-failure") && ((record?.consecutiveFailures || 0) >= 2 || sensitive.has("crisis") || sensitive.has("emergency"))) return 1;
  if (reasons.includes("link-failure") || reasons.includes("exception-expired")) return 2;
  return 3;
}

export function createFreshnessReviewReport({ state, exceptions, index, asOf, offset = 0, limit = 50 }) {
  validateFreshnessState(state, index);
  validateFreshnessExceptions(exceptions, index);
  validateDate(asOf, "Freshness report asOf");
  if (state.updatedAt && state.updatedAt.slice(0, 10) > asOf) fail("Freshness report", "asOf cannot precede the state update.");
  if (!Number.isInteger(offset) || offset < 0) fail("Freshness report", "offset must be a non-negative integer.");
  if (!Number.isInteger(limit) || limit < 1 || limit > 200) fail("Freshness report", "limit must be between 1 and 200.");
  const records = new Map(state.records.map((record) => [record.resourceId, record]));
  const exceptionsByResource = new Map();
  for (const exception of exceptions.exceptions) exceptionsByResource.set(exception.resourceId, [...(exceptionsByResource.get(exception.resourceId) || []), exception]);
  const queue = [];
  let suppressedItemCount = 0;

  for (const resource of index.resources) {
    const record = records.get(resource.id) || null;
    const policy = humanReviewPolicy(resource);
    const reasons = operationalReasons(record);
    const suppressedReasons = [];
    const reviewDate = resource.metadata?.reviewed || null;
    if (!reviewDate) reasons.push("human-review-unrecorded");
    else if (daysBetween(reviewDate, asOf) >= policy.cadenceDays) reasons.push("human-review-overdue");

    for (const exception of exceptionsByResource.get(resource.id) || []) {
      if (exception.expiresAt <= asOf) {
        reasons.push("exception-expired");
        continue;
      }
      const reasonIndex = reasons.indexOf(exception.scope);
      if (reasonIndex !== -1) {
        reasons.splice(reasonIndex, 1);
        suppressedReasons.push(exception.scope);
      }
      if (daysBetween(asOf, exception.expiresAt) <= 30) reasons.push("exception-expiring");
    }
    if (suppressedReasons.length) suppressedItemCount += 1;
    const uniqueReasons = [...new Set(reasons)].sort();
    if (!uniqueReasons.length) continue;
    queue.push({
      resourceId: resource.id,
      title: resource.title,
      url: resource.url,
      source: resource.source,
      kind: resource.kind,
      priority: queuePriority(resource, record, uniqueReasons),
      reasons: uniqueReasons,
      suppressedReasons: suppressedReasons.sort(),
      review: { lastReviewed: reviewDate, cadenceDays: policy.cadenceDays, policySignals: policy.signals },
      observation: record ? {
        lastObservedAt: record.lastObservedAt,
        lastSuccessfulAt: record.lastSuccessfulAt,
        responseClass: record.responseClass,
        statusCode: record.statusCode,
        redirectDestination: record.redirectDestination,
        consecutiveFailures: record.consecutiveFailures,
        github: record.github,
      } : null,
    });
  }

  queue.sort((left, right) => left.priority - right.priority || left.source.localeCompare(right.source) || left.title.localeCompare(right.title));
  const items = queue.slice(offset, offset + limit);
  const nextOffset = offset + items.length < queue.length ? offset + items.length : null;
  return {
    schemaVersion: FRESHNESS_SCHEMA_VERSION,
    asOf,
    catalog: { sha256: repositoryIndexDigest(index), resourceCount: index.resources.length },
    state: { updatedAt: state.updatedAt, observedResourceCount: state.records.length },
    summary: {
      queueCount: queue.length,
      priorityCounts: Object.fromEntries([1, 2, 3].map((priority) => [priority, queue.filter((item) => item.priority === priority).length])),
      suppressedItemCount,
    },
    batch: { offset, limit, returned: items.length, nextOffset },
    items,
    notices: [
      "Machine observations describe availability only and do not prove that catalog descriptions remain accurate.",
      "Exceptions are scoped, human-reviewed, and temporary; they never mark a resource as valid.",
      "This report proposes review work only and does not delete, rewrite, publish, or fetch resources.",
    ],
  };
}
