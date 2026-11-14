import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { bookmarkIntakeSummary, createBookmarkIntakeReport, loadRepositoryResourceIndex, repositoryIndexDigest } from "../scripts/lib/bookmark-intake.mjs";
import { enrichBookmarkIntakeWithFreshness } from "../scripts/lib/bookmark-freshness.mjs";
import { createFreshnessReviewReport, emptyFreshnessState, reduceFreshnessObservations } from "../scripts/lib/freshness.mjs";

const resource = (id) => ({ id, title: id, url: `https://example.org/${id}`, aliases: [], description: "Synthetic reference.", metadata: { reviewed: "2026-09-01" }, source: "lists/research/README.md", kind: "catalog" });
const resources = [resource("first"), resource("second")];
const index = { resources, currentByIdentity: new Map(resources.map((r) => [`example.org/${r.id}`, [r]])), aliasByIdentity: new Map(), nearByIdentity: new Map(), byTitle: new Map() };
const exceptions = { schemaVersion: 1, notice: "Exceptions are human-reviewed and do not prove that a resource remains valid.", exceptions: [] };
const bookmarks = resources.map((r) => ({ title: "Synthetic private title", url: r.url, folders: ["Synthetic private folder"], labels: ["Synthetic private label"] }));
const report = createBookmarkIntakeReport({ content: "synthetic", format: "browser-json", bookmarks, index });

function observation(id = "first", statusCode = 200, finalUrl = `https://example.org/${id}`) {
  return { resourceId: id, source: resources.find((r) => r.id === id).source, url: `https://example.org/${id}`, finalUrl, github: null, attempts: [{ method: "GET", outcome: "response", statusCode, durationMs: 1 }] };
}

function stateFor(observations = [observation()], prior = emptyFreshnessState(index), observedAt = "2026-09-06T12:00:00Z") {
  return reduceFreshnessObservations({ index, previousState: prior, bundle: { schemaVersion: 1, catalogSha256: repositoryIndexDigest(index), observedAt, observations } });
}

function artifact(state = stateFor(), ledger = exceptions) {
  return JSON.stringify({ schemaVersion: 1, proposedState: state, reviewReport: createFreshnessReviewReport({ state, exceptions: ledger, index, asOf: "2026-09-07" }) });
}

function join(overrides = {}) {
  return enrichBookmarkIntakeWithFreshness({ report, index, evidenceContent: artifact(), exceptions, asOf: "2026-09-07", ...overrides });
}

test("joins exact source-bound observations while preserving original identity and report", () => {
  const before = JSON.stringify(report);
  const evidenceContent = artifact(stateFor([observation("first", 200, "https://example.org/new-location")]));
  const result = join({ evidenceContent });
  assert.equal(result.candidates[0].url, report.candidates[0].url);
  assert.equal(result.candidates[0].candidateId, report.candidates[0].candidateId);
  assert.equal(result.candidates[0].classification, report.candidates[0].classification);
  const evidence = result.candidates[0].freshness.records[0];
  assert.equal(evidence.observation.responseClass, "redirected");
  assert.equal(evidence.observation.redirectDestination, "https://example.org/new-location");
  assert.equal(evidence.evidenceRef.artifactSha256, createHash("sha256").update(evidenceContent).digest("hex"));
  assert.equal(evidence.humanReview.approval, "not-inferred");
  assert.equal(JSON.stringify(report), before);
});

test("partial shard coverage and a missing observation remain explicit", () => {
  const result = join();
  assert.equal(result.freshness.coverage.state, "partial");
  assert.equal(result.candidates[0].freshness.status, "current");
  assert.equal(result.candidates[1].freshness.status, "unknown");
  assert.equal(result.candidates[1].freshness.records[0].observation, null);
  assert.deepEqual(result.freshness.batchCounts, { current: 1, stale: 0, partial: 0, unknown: 1 });
});

test("age boundary, stale evidence and explicit clock validation are deterministic", () => {
  assert.equal(join({ asOf: "2026-10-06", maxAgeDays: 30 }).candidates[0].freshness.status, "current");
  assert.equal(join({ asOf: "2026-10-07", maxAgeDays: 30 }).candidates[0].freshness.status, "stale");
  for (const asOf of [undefined, "2026-02-30", "2026-09-05", "not-a-date"]) assert.throws(() => join({ asOf }), /Freshness evidence/);
  for (const maxAgeDays of [-1, 1.5, 3651]) assert.throws(() => join({ maxAgeDays }), /maximum age/);
});

test("midnight rollover cannot bypass the explicit future calendar boundary", () => {
  const value = JSON.parse(artifact());
  value.proposedState.updatedAt = "2026-09-06T24:00:00Z";
  value.proposedState.records[0].lastObservedAt = value.proposedState.updatedAt;
  value.proposedState.records[0].lastSuccessfulAt = value.proposedState.updatedAt;
  assert.throws(() => join({ evidenceContent: JSON.stringify(value), asOf: "2026-09-06", maxAgeDays: 0 }), /canonical UTC/);
});

test("intermittent failures retain success; consecutive failure and rate limit stay distinct", () => {
  const success = stateFor();
  const failed = stateFor([observation("first", 503)], success, "2026-09-07T12:00:00Z");
  const twice = stateFor([observation("first", 503)], failed, "2026-09-08T12:00:00Z");
  const limited = stateFor([observation("first", 429)], twice, "2026-09-09T12:00:00Z");
  for (const [state, responseClass, failures] of [[failed, "server-error", 1], [twice, "server-error", 2], [limited, "rate-limited", 2]]) {
    const evidenceContent = JSON.stringify({ schemaVersion: 1, proposedState: state, reviewReport: { catalog: { sha256: state.catalogSha256 } } });
    const result = join({ evidenceContent, asOf: "2026-09-10" });
    const record = result.candidates[0].freshness.records[0];
    assert.equal(record.observation.responseClass, responseClass);
    assert.equal(record.observation.consecutiveFailures, failures);
    assert.equal(record.observation.lastSuccessfulAt, "2026-09-06T12:00:00Z");
    assert.equal(result.candidates[0].classification, report.candidates[0].classification);
    assert.equal(record.humanReview.approval, "not-inferred");
  }
});

test("exceptions and human review remain separate from machine failures", () => {
  const ledger = { ...exceptions, exceptions: [{ id: "synthetic-exception", resourceId: "first", source: resources[0].source, url: resources[0].url, scope: "link-failure", reason: "A synthetic scoped exception requiring human review.", reviewedBy: "synthetic-reviewer", reviewedAt: "2026-09-01", expiresAt: "2026-09-10" }] };
  const evidenceContent = artifact(stateFor([observation("first", 404)]), ledger);
  const active = join({ evidenceContent, exceptions: ledger }).candidates[0].freshness.records[0];
  const expired = join({ evidenceContent, exceptions: ledger, asOf: "2026-09-10" }).candidates[0].freshness.records[0];
  assert.equal(active.observation.responseClass, "client-error");
  assert.equal(active.observation.consecutiveFailures, 1);
  assert.equal(active.exceptions[0].state, "active");
  assert.equal(expired.exceptions[0].state, "expired");
  assert.equal(active.humanReview.state, "recorded");
  assert.equal(active.humanReview.approval, "not-inferred");
});

test("schema and each catalog binding fail closed without echoing input", () => {
  for (const mutate of [
    (a) => { a.schemaVersion = 2; },
    (a) => { a.proposedState.schemaVersion = 2; },
    (a) => { a.proposedState.catalogSha256 = "0".repeat(64); },
    (a) => { a.reviewReport.catalog.sha256 = "0".repeat(64); },
    (a) => { a.proposedState.records[0].resourceId = "private-input-canary"; },
    (a) => { a.proposedState.records[0].lastObservedAt = "2026-02-30T12:00:00Z"; a.proposedState.records[0].lastSuccessfulAt = null; a.proposedState.records[0].responseClass = "server-error"; a.proposedState.records[0].statusCode = 503; a.proposedState.records[0].consecutiveFailures = 1; },
  ]) {
    const value = JSON.parse(artifact()); mutate(value);
    assert.throws(() => join({ evidenceContent: JSON.stringify(value) }), (e) => /Freshness evidence/.test(e.message) && !e.message.includes("private-input-canary"));
  }
  assert.throws(() => join({ evidenceContent: "private-input-canary" }), /invalid JSON/);
  assert.throws(() => join({ report: { ...report, catalog: { sha256: "0".repeat(64) } } }), /catalog mismatch/);
});

test("new URLs and old aliases do not inherit observations of another original URL", () => {
  const candidate = { ...report.candidates[0], url: "https://old.example.org/first" };
  const result = join({ report: { ...report, candidates: [candidate] } });
  assert.equal(result.candidates[0].freshness.status, "unknown");
  assert.deepEqual(result.candidates[0].freshness.records, []);
});

test("multiple matching resource identities retain partial evidence rather than choosing one", () => {
  const shared = { ...resources[1], url: resources[0].url };
  const sharedIndex = { ...index, resources: [resources[0], shared] };
  const digest = repositoryIndexDigest(sharedIndex);
  const state = { ...stateFor(), catalogSha256: digest };
  const evidenceContent = JSON.stringify({ schemaVersion: 1, proposedState: state, reviewReport: { catalog: { sha256: digest } } });
  const result = join({ index: sharedIndex, evidenceContent, report: { ...report, catalog: { ...report.catalog, sha256: digest }, candidates: [report.candidates[0]] } });
  assert.equal(result.candidates[0].freshness.status, "partial");
  assert.equal(result.candidates[0].freshness.records.length, 2);
});

test("same inputs and resumed pages retain identical evidence and private summaries omit content", () => {
  const full = join();
  const page = join({ report: { ...report, candidates: [report.candidates[1]], batch: { offset: 1, limit: 1, returned: 1, nextOffset: null } } });
  assert.deepEqual(page.candidates[0], full.candidates[1]);
  assert.deepEqual(join(), full);
  const summary = JSON.stringify(bookmarkIntakeSummary(full));
  assert.doesNotMatch(summary, /example\.org|Synthetic private|folders|labels/);
});

test("real offline CLI emits summaries, preserves no-overwrite, and never echoes private failures", async () => {
  const root = new URL("..", import.meta.url).pathname;
  const temporary = await mkdtemp(path.join(os.tmpdir(), "akashic-freshness-test-"));
  try {
    const input = path.join(temporary, "private-export.json");
    const evidencePath = path.join(temporary, "evidence.json");
    await writeFile(input, JSON.stringify({ children: [{ title: "CLI-private-canary", uri: "https://example.org/private-candidate" }] }));
    const actualIndex = await loadRepositoryResourceIndex(root);
    const state = emptyFreshnessState(actualIndex);
    await writeFile(evidencePath, JSON.stringify({ schemaVersion: 1, proposedState: state, reviewReport: { catalog: { sha256: state.catalogSha256 } } }));
    const args = ["scripts/import-bookmarks.mjs", "--input", input, "--freshness", evidencePath, "--as-of", "2026-09-07"];
    const dry = spawnSync(process.execPath, [...args, "--dry-run"], { cwd: root, encoding: "utf8" });
    assert.equal(dry.status, 0, dry.stderr);
    assert.equal(JSON.parse(dry.stdout).freshness.batchCounts.unknown, 1);
    assert.doesNotMatch(dry.stdout, /CLI-private-canary|example\.org|private-export/);
    const output = path.join(root, ".akashic-local/bookmark-intake", path.basename(temporary), "report.json");
    const written = spawnSync(process.execPath, [...args, "--output", output], { cwd: root, encoding: "utf8" });
    assert.equal(written.status, 0, written.stderr);
    const before = await readFile(output);
    const repeated = spawnSync(process.execPath, [...args, "--output", output], { cwd: root, encoding: "utf8" });
    assert.equal(repeated.status, 1);
    assert.deepEqual(await readFile(output), before);
    await rm(path.dirname(output), { recursive: true });
    await writeFile(input, '{"CLI-private-canary":');
    const bad = spawnSync(process.execPath, [...args, "--dry-run"], { cwd: root, encoding: "utf8" });
    assert.equal(bad.status, 1);
    assert.doesNotMatch(bad.stderr, /CLI-private-canary|private-export|example\.org/);
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
});

test("private output cannot escape through an existing symlink parent", async () => {
  const root = new URL("..", import.meta.url).pathname;
  const outside = await mkdtemp(path.join(os.tmpdir(), "akashic-symlink-test-"));
  const local = path.join(root, ".akashic-local/bookmark-intake", path.basename(outside));
  try {
    await mkdir(local, { recursive: true });
    await symlink(outside, path.join(local, "escape"), "dir");
    const input = path.join(outside, "input.json");
    await writeFile(input, JSON.stringify({ children: [] }));
    const result = spawnSync(process.execPath, ["scripts/import-bookmarks.mjs", "--input", input, "--output", path.join(local, "escape/report.json")], { cwd: root, encoding: "utf8" });
    assert.equal(result.status, 1);
    assert.doesNotMatch(result.stderr, new RegExp(path.basename(outside)));
    await assert.rejects(readFile(path.join(outside, "report.json")), { code: "ENOENT" });
  } finally {
    await rm(local, { recursive: true, force: true });
    await rm(outside, { recursive: true, force: true });
  }
});
