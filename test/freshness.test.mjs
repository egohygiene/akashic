import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { loadRepositoryResourceIndex, repositoryIndexDigest } from "../scripts/lib/bookmark-intake.mjs";
import { createFreshnessReviewReport, emptyFreshnessState, humanReviewPolicy, reduceFreshnessObservations, validateFreshnessExceptions, validateFreshnessObservationBundle, validateFreshnessState } from "../scripts/lib/freshness.mjs";

const resources = [
  {
    id: "stable-service",
    title: "Stable Service",
    url: "https://example.org/service",
    aliases: [],
    description: "A stable reference.",
    metadata: { reviewed: "2026-08-15", reviewTier: "annual" },
    source: "lists/research/README.md",
    kind: "catalog",
  },
  {
    id: "benefits-service",
    title: "Benefits Service",
    url: "https://benefits.example.org/",
    aliases: [],
    description: "Check benefits eligibility and application costs.",
    metadata: { reviewed: "2026-05-01", reviewTier: "annual" },
    source: "lists/public-services-and-support/README.md",
    kind: "catalog",
  },
  {
    id: "crisis-service",
    title: "Crisis Service",
    url: "https://crisis.example.org/",
    aliases: [],
    description: "Emergency hotline directory.",
    metadata: { reviewed: "2026-08-01", sensitive: ["crisis"] },
    source: "lists/health-and-well-being/README.md",
    kind: "catalog",
  },
  {
    id: "github-project",
    title: "GitHub Project",
    url: "https://github.com/old-owner/project",
    aliases: [],
    description: "Project repository.",
    metadata: { reviewed: "2026-09-01" },
    source: "lists/open-source/README.md",
    kind: "catalog",
  },
  {
    id: "travel-guide",
    title: "Travel Guide",
    url: "https://travel.example.org/",
    aliases: [],
    description: "Destination guide.",
    metadata: { reviewed: "2026-03-01" },
    source: "lists/travel-and-mobility/README.md",
    kind: "catalog",
  },
];
const index = { resources };
const catalogSha256 = repositoryIndexDigest(index);
const emptyExceptions = {
  schemaVersion: 1,
  notice: "Exceptions are human-reviewed and do not prove that a resource remains valid.",
  exceptions: [],
};

function observation(resourceId, { attempts, finalUrl, github = null } = {}) {
  const resource = resources.find((candidate) => candidate.id === resourceId);
  return {
    resourceId,
    source: resource.source,
    url: resource.url,
    attempts: attempts || [{ method: "HEAD", outcome: "response", statusCode: 200, durationMs: 20 }],
    finalUrl: finalUrl === undefined ? resource.url : finalUrl,
    github,
  };
}

function bundle(observations, observedAt = "2026-09-06T12:00:00Z") {
  return { schemaVersion: 1, catalogSha256, observedAt, observations };
}

test("reduces successes, failures, rate limits, and HEAD-to-GET fallback deterministically", () => {
  const first = reduceFreshnessObservations({
    index,
    previousState: emptyFreshnessState(index),
    bundle: bundle([
      observation("stable-service", {
        attempts: [
          { method: "HEAD", outcome: "response", statusCode: 405, durationMs: 10 },
          { method: "GET", outcome: "response", statusCode: 200, durationMs: 25 },
        ],
      }),
      observation("benefits-service", { attempts: [{ method: "GET", outcome: "response", statusCode: 503, durationMs: 40 }] }),
      observation("crisis-service", { attempts: [{ method: "HEAD", outcome: "timeout", statusCode: null, durationMs: 5_000 }], finalUrl: null }),
      observation("travel-guide", { attempts: [{ method: "HEAD", outcome: "response", statusCode: 429, durationMs: 15 }] }),
    ]),
  });
  const byId = new Map(first.records.map((record) => [record.resourceId, record]));
  assert.equal(byId.get("stable-service").responseClass, "success");
  assert.equal(byId.get("stable-service").lastSuccessfulAt, "2026-09-06T12:00:00Z");
  assert.equal(byId.get("benefits-service").consecutiveFailures, 1);
  assert.equal(byId.get("crisis-service").responseClass, "network-error");
  assert.equal(byId.get("travel-guide").responseClass, "rate-limited");
  assert.equal(byId.get("travel-guide").consecutiveFailures, 0);

  const second = reduceFreshnessObservations({
    index,
    previousState: first,
    bundle: bundle([
      observation("benefits-service", { attempts: [{ method: "GET", outcome: "response", statusCode: 500, durationMs: 35 }] }),
      observation("stable-service", { attempts: [{ method: "GET", outcome: "connection-error", statusCode: null, durationMs: 100 }], finalUrl: null }),
    ], "2026-09-07T12:00:00Z"),
  });
  const secondById = new Map(second.records.map((record) => [record.resourceId, record]));
  assert.equal(secondById.get("benefits-service").consecutiveFailures, 2);
  assert.equal(secondById.get("stable-service").lastSuccessfulAt, "2026-09-06T12:00:00Z");
  assert.equal(secondById.get("stable-service").consecutiveFailures, 1);
});

test("records redirects and GitHub rename/archive observations as priority review work", () => {
  const state = reduceFreshnessObservations({
    index,
    previousState: emptyFreshnessState(index),
    bundle: bundle([observation("github-project", {
      finalUrl: "https://github.com/new-owner/project",
      github: { repository: "old-owner/project", canonicalRepository: "new-owner/project", archived: true },
    })]),
  });
  const record = state.records[0];
  assert.equal(record.responseClass, "redirected");
  assert.equal(record.redirectDestination, "https://github.com/new-owner/project");
  const report = createFreshnessReviewReport({ state, exceptions: emptyExceptions, index, asOf: "2026-09-06" });
  const item = report.items.find((candidate) => candidate.resourceId === "github-project");
  assert.equal(item.priority, 1);
  assert.deepEqual(item.reasons, ["github-archived", "github-renamed", "redirect"]);
});

test("exceptions suppress only their active scope and return before expiry", () => {
  const first = reduceFreshnessObservations({
    index,
    previousState: emptyFreshnessState(index),
    bundle: bundle([observation("stable-service", { attempts: [{ method: "GET", outcome: "response", statusCode: 503, durationMs: 10 }] })]),
  });
  const state = reduceFreshnessObservations({
    index,
    previousState: first,
    bundle: bundle([observation("stable-service", { attempts: [{ method: "GET", outcome: "response", statusCode: 503, durationMs: 10 }] })], "2026-09-07T12:00:00Z"),
  });
  const exceptions = {
    schemaVersion: 1,
    notice: emptyExceptions.notice,
    exceptions: [{
      id: "stable-service-bot-block",
      resourceId: "stable-service",
      source: "lists/research/README.md",
      url: "https://example.org/service",
      scope: "link-failure",
      reason: "The owner documents that automated requests are blocked while browsers remain supported.",
      reviewedBy: "maintainer",
      reviewedAt: "2026-08-01",
      expiresAt: "2026-09-20",
    }],
  };
  const active = createFreshnessReviewReport({ state, exceptions, index, asOf: "2026-09-07" });
  const activeItem = active.items.find((candidate) => candidate.resourceId === "stable-service");
  assert.deepEqual(activeItem.reasons, ["exception-expiring"]);
  assert.deepEqual(activeItem.suppressedReasons, ["link-failure"]);

  const expired = createFreshnessReviewReport({ state, exceptions, index, asOf: "2026-09-20" });
  const expiredItem = expired.items.find((candidate) => candidate.resourceId === "stable-service");
  assert.ok(expiredItem.reasons.includes("link-failure"));
  assert.ok(expiredItem.reasons.includes("exception-expired"));

  const resolvedState = reduceFreshnessObservations({
    index,
    previousState: state,
    bundle: bundle([observation("stable-service")], "2026-09-08T12:00:00Z"),
  });
  const resolved = createFreshnessReviewReport({ state: resolvedState, exceptions, index, asOf: "2026-09-20" });
  assert.deepEqual(resolved.items.find((candidate) => candidate.resourceId === "stable-service").reasons, ["exception-expired"]);
});

test("human review policy shortens crisis, benefits, pricing, and travel cadences", () => {
  assert.deepEqual(humanReviewPolicy(resources[0]), { cadenceDays: 365, signals: ["declared-annual"] });
  assert.deepEqual(humanReviewPolicy(resources[1]), { cadenceDays: 92, signals: ["benefits", "pricing"] });
  assert.deepEqual(humanReviewPolicy(resources[2]), { cadenceDays: 31, signals: ["crisis-or-emergency"] });
  assert.deepEqual(humanReviewPolicy(resources[4]), { cadenceDays: 183, signals: ["travel"] });
  const report = createFreshnessReviewReport({ state: emptyFreshnessState(index), exceptions: emptyExceptions, index, asOf: "2026-09-06" });
  assert.ok(report.items.find((item) => item.resourceId === "benefits-service").reasons.includes("human-review-overdue"));
  assert.ok(report.items.find((item) => item.resourceId === "crisis-service").reasons.includes("human-review-overdue"));
  assert.ok(report.items.find((item) => item.resourceId === "travel-guide").reasons.includes("human-review-overdue"));
  assert.equal(report.items.some((item) => item.resourceId === "stable-service"), false);
});

test("observation validation fails closed on catalog drift, unsafe redirects, and invalid fallback order", () => {
  const valid = bundle([observation("stable-service")]);
  assert.doesNotThrow(() => validateFreshnessObservationBundle(valid, index));
  assert.throws(() => validateFreshnessObservationBundle({ ...valid, catalogSha256: "0".repeat(64) }, index), /catalog digest/);
  assert.throws(() => validateFreshnessObservationBundle(bundle([observation("stable-service", { finalUrl: "http://127.0.0.1/admin" })]), index), /finalUrl is unsafe/);
  assert.throws(() => validateFreshnessObservationBundle(bundle([observation("stable-service", {
    attempts: [
      { method: "GET", outcome: "response", statusCode: 503, durationMs: 20 },
      { method: "HEAD", outcome: "response", statusCode: 200, durationMs: 10 },
    ],
  })]), index), /HEAD cannot follow GET/);
});

test("state and exception validation reject unbound or unreviewed claims", () => {
  const state = emptyFreshnessState(index);
  assert.doesNotThrow(() => validateFreshnessState(state, index));
  assert.throws(() => validateFreshnessState({ ...state, records: [{ resourceId: "unknown" }] }, index), /unknown resource ID/);
  const observed = reduceFreshnessObservations({ index, previousState: state, bundle: bundle([observation("stable-service")]) });
  assert.throws(() => validateFreshnessState({ ...observed, records: [{ ...observed.records[0], statusCode: 503 }] }, index), /success statusCode/);
  assert.throws(() => validateFreshnessExceptions({
    schemaVersion: 1,
    notice: emptyExceptions.notice,
    exceptions: [{
      id: "bad-exception",
      resourceId: "stable-service",
      source: "lists/research/README.md",
      url: "https://example.org/service",
      scope: "link-failure",
      reason: "Too short.",
      reviewedBy: "maintainer",
      reviewedAt: "2026-09-01",
      expiresAt: "2026-10-01",
    }],
  }, index), /reason must contain/);
});

test("review queues are deterministic and human-sized", () => {
  const state = emptyFreshnessState(index);
  const first = createFreshnessReviewReport({ state, exceptions: emptyExceptions, index, asOf: "2027-09-07", limit: 2 });
  const second = createFreshnessReviewReport({ state, exceptions: emptyExceptions, index, asOf: "2027-09-07", limit: 2 });
  assert.deepEqual(first, second);
  assert.equal(first.items.length, 2);
  assert.equal(first.batch.nextOffset, 2);
  const resumed = createFreshnessReviewReport({ state, exceptions: emptyExceptions, index, asOf: "2027-09-07", offset: 2, limit: 2 });
  assert.equal(resumed.items.length, 2);
  assert.notEqual(first.items[0].resourceId, resumed.items[0].resourceId);
});

test("checked-in exceptions validate and the CLI dry run emits summary-only output", async () => {
  const root = new URL("..", import.meta.url).pathname;
  const repositoryIndex = await loadRepositoryResourceIndex(root);
  const exceptions = JSON.parse(await readFile(new URL("../maintenance/freshness/exceptions.json", import.meta.url), "utf8"));
  assert.doesNotThrow(() => validateFreshnessExceptions(exceptions, repositoryIndex));
  const resource = repositoryIndex.resources.find((candidate) => candidate.kind === "catalog");
  const observations = {
    schemaVersion: 1,
    catalogSha256: repositoryIndexDigest(repositoryIndex),
    observedAt: "2026-09-06T12:00:00Z",
    observations: [{
      resourceId: resource.id,
      source: resource.source,
      url: resource.url,
      attempts: [{ method: "HEAD", outcome: "response", statusCode: 200, durationMs: 10 }],
      finalUrl: resource.url,
      github: null,
    }],
  };
  const temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), "akashic-freshness-"));
  try {
    const observationFile = path.join(temporaryDirectory, "observations.json");
    await writeFile(observationFile, JSON.stringify(observations));
    const result = spawnSync(process.execPath, [
      "scripts/reduce-freshness-observations.mjs",
      "--observations",
      observationFile,
      "--as-of",
      "2026-09-06",
      "--dry-run",
    ], { cwd: root, encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
    assert.doesNotMatch(result.stdout, new RegExp(resource.title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    const summary = JSON.parse(result.stdout);
    assert.equal(summary.proposedState.observedResourceCount, 1);
    assert.equal(summary.reviewReport.catalog.resourceCount, repositoryIndex.resources.length);
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
});
