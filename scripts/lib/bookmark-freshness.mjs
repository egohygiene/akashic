import { createHash } from "node:crypto";
import { repositoryIndexDigest } from "./bookmark-intake.mjs";
import { humanReviewPolicy, validateFreshnessExceptions, validateFreshnessState } from "./freshness.mjs";
import { urlIdentity } from "./url-identity.mjs";

function referenceDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error("Freshness evidence requires a real --as-of YYYY-MM-DD date.");
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== value) throw new Error("Freshness evidence requires a real --as-of YYYY-MM-DD date.");
  return date.valueOf();
}

function ageDays(timestamp, clock) {
  return (clock - new Date(`${timestamp.slice(0, 10)}T00:00:00Z`).valueOf()) / 86_400_000;
}

function canonicalTimestamp(timestamp) {
  const normalized = timestamp.includes(".") ? timestamp : timestamp.replace("Z", ".000Z");
  if (new Date(timestamp).toISOString() !== normalized) throw new Error("Freshness evidence timestamps must be canonical UTC instants without calendar rollover.");
}

/** Pure, opt-in projection. The supplied reducer bytes are evidence, not approval. */
export function enrichBookmarkIntakeWithFreshness({ report, index, evidenceContent, exceptions, asOf, maxAgeDays = 30 }) {
  const clock = referenceDate(asOf);
  if (!Number.isInteger(maxAgeDays) || maxAgeDays < 0 || maxAgeDays > 3650) throw new Error("Freshness evidence maximum age must be an integer between 0 and 3650 days.");
  const catalogDigest = repositoryIndexDigest(index);
  if (report.catalog.sha256 !== catalogDigest) throw new Error("Freshness evidence catalog mismatch; regenerate the bookmark batch against the current resource index.");
  let artifact;
  try {
    artifact = JSON.parse(evidenceContent);
  } catch {
    throw new Error("Freshness evidence is invalid JSON; provide an explicit reducer report.");
  }
  if (artifact?.schemaVersion !== 1 || !artifact.proposedState || !artifact.reviewReport) throw new Error("Freshness evidence has an incompatible schema; provide the version 1 reducer report.");
  if (artifact.proposedState.catalogSha256 !== catalogDigest || artifact.reviewReport.catalog?.sha256 !== catalogDigest) throw new Error("Freshness evidence catalog mismatch; rerun the reducer against the same current resource index.");
  try {
    validateFreshnessState(artifact.proposedState, index);
    validateFreshnessExceptions(exceptions, index);
  } catch {
    // Owner validators may quote untrusted IDs/URLs. Public CLI errors never do.
    throw new Error("Freshness evidence or exception ledger failed owner validation; regenerate compatible reducer evidence.");
  }
  const state = artifact.proposedState;
  for (const timestamp of [state.updatedAt, ...state.records.flatMap((record) => [record.lastObservedAt, record.lastSuccessfulAt])].filter(Boolean)) canonicalTimestamp(timestamp);
  if (state.updatedAt && ageDays(state.updatedAt, clock) < 0) throw new Error("Freshness evidence follows --as-of; select a compatible reference date.");
  const artifactSha256 = createHash("sha256").update(evidenceContent).digest("hex");
  const records = new Map(state.records.map((record) => [record.resourceId, record]));
  const resources = new Map();
  for (const resource of index.resources) {
    const identity = urlIdentity(resource.url);
    resources.set(identity, [...(resources.get(identity) || []), resource]);
  }
  const counts = { current: 0, stale: 0, partial: 0, unknown: 0 };
  const candidates = report.candidates.map((candidate) => {
    const matched = resources.get(urlIdentity(candidate.url)) || [];
    const evidence = matched.map((resource) => {
      const record = records.get(resource.id) || null;
      const temporalState = !record ? "unknown" : ageDays(record.lastObservedAt, clock) > maxAgeDays ? "stale" : "current";
      const policy = humanReviewPolicy(resource);
      const lastReviewed = resource.metadata?.reviewed || null;
      return {
        resourceId: resource.id,
        source: resource.source,
        temporalState,
        observation: record ? {
          lastObservedAt: record.lastObservedAt,
          lastSuccessfulAt: record.lastSuccessfulAt,
          responseClass: record.responseClass,
          statusCode: record.statusCode,
          redirectDestination: record.redirectDestination,
          consecutiveFailures: record.consecutiveFailures,
          github: record.github,
        } : null,
        evidenceRef: record ? { artifactSha256, resourceId: resource.id, lastObservedAt: record.lastObservedAt } : null,
        exceptions: exceptions.exceptions.filter((item) => item.resourceId === resource.id).map((item) => ({
          id: item.id, scope: item.scope, reviewedAt: item.reviewedAt, expiresAt: item.expiresAt,
          state: item.reviewedAt > asOf ? "not-yet-effective" : item.expiresAt <= asOf ? "expired" : "active",
        })),
        humanReview: {
          lastReviewed,
          state: !lastReviewed ? "unrecorded" : lastReviewed > asOf ? "future" : ageDays(lastReviewed, clock) >= policy.cadenceDays ? "overdue" : "recorded",
          cadenceDays: policy.cadenceDays,
          approval: "not-inferred",
        },
      };
    });
    const states = new Set(evidence.map((item) => item.temporalState));
    const status = !evidence.length || states.size === 1 && states.has("unknown") ? "unknown"
      : states.has("unknown") ? "partial" : states.has("stale") ? "stale" : "current";
    counts[status] += 1;
    return { ...candidate, freshness: { status, reason: !matched.length ? "original-url-not-in-catalog" : "catalog-url-identity", records: evidence } };
  });
  return {
    ...report,
    candidates,
    freshness: {
      schemaVersion: 1, artifactSha256, exceptionsSha256: createHash("sha256").update(JSON.stringify(exceptions)).digest("hex"), catalogSha256: catalogDigest, asOf, maxAgeDays,
      stateUpdatedAt: state.updatedAt,
      coverage: { observedResources: records.size, catalogResources: index.resources.length, state: records.size < index.resources.length ? "partial" : "complete" },
      batchCounts: counts,
    },
    notices: [...report.notices.filter((notice) => !notice.startsWith("Inaccessible and live redirect")),
      "Freshness is machine availability evidence only, not human usefulness, safety, approval or publication eligibility.",
      "Redirect destinations remain evidence; original sanitized URLs and classifications are unchanged.",
      "Missing observations and stale or partial coverage are not evidence that a bookmark is dead or deletion-ready."],
  };
}
