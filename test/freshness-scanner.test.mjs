import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { loadRepositoryResourceIndex } from "../scripts/lib/bookmark-intake.mjs";
import { changedResourceKeysFromDiff, createDomainThrottle, createFreshnessTransport, freshnessShardForUrl, lookupGitHubRepository, resolvePublicAddresses, scanFreshnessResource, scanFreshnessTargets, selectFreshnessTargets } from "../scripts/lib/freshness-scanner.mjs";
import { validateFreshnessObservationBundle } from "../scripts/lib/freshness.mjs";

const resources = [
  {
    id: "alpha",
    title: "Alpha",
    url: "https://example.org/alpha",
    aliases: [],
    description: "Alpha reference.",
    metadata: {},
    source: "lists/example/README.md",
    kind: "catalog",
  },
  {
    id: "beta",
    title: "Beta",
    url: "https://example.org/beta",
    aliases: [],
    description: "Beta reference.",
    metadata: {},
    source: "lists/example/README.md",
    kind: "catalog",
  },
  {
    id: "github-project",
    title: "GitHub Project",
    url: "https://github.com/old-owner/project",
    aliases: [],
    description: "Project repository.",
    metadata: {},
    source: "atlas/places/example.md",
    kind: "atlas",
  },
];
const index = { resources };

test("selects added resource entries and keeps each domain on one stable shard", () => {
  const diff = [
    "diff --git a/lists/example/README.md b/lists/example/README.md",
    "+++ b/lists/example/README.md",
    "+- [Alpha](https://example.org/alpha) - Alpha reference.",
    "+Unrelated prose with https://example.org/beta",
    "diff --git a/atlas/places/example.md b/atlas/places/example.md",
    "+++ b/atlas/places/example.md",
    "+- [GitHub Project](https://github.com/old-owner/project) - Project repository.",
  ].join("\n");
  const keys = changedResourceKeysFromDiff(diff);
  assert.equal(keys.size, 2);
  assert.deepEqual(selectFreshnessTargets({ index, changedDiff: diff }).map((resource) => resource.id), ["github-project", "alpha"]);
  assert.equal(freshnessShardForUrl(resources[0].url, 16), freshnessShardForUrl(resources[1].url, 16));
  const allShards = Array.from({ length: 16 }, (_, shardIndex) => selectFreshnessTargets({ index, shardIndex, shardCount: 16 })).flat();
  assert.deepEqual(allShards.map((resource) => resource.id).sort(), resources.map((resource) => resource.id).sort());
});

test("domain throttle serializes one host without delaying unrelated hosts", async () => {
  let time = 0;
  const sleeps = [];
  const throttle = createDomainThrottle({
    delayMs: 1_000,
    now: () => time,
    sleep: async (milliseconds) => {
      sleeps.push(milliseconds);
      time += milliseconds;
    },
  });
  await Promise.all([
    throttle.wait("example.org"),
    throttle.wait("example.org"),
    throttle.wait("other.example"),
  ]);
  assert.deepEqual(sleeps, [1_000]);
});

test("transport follows safe redirects and rejects private DNS destinations", async () => {
  const requested = [];
  const transport = createFreshnessTransport({
    throttle: { wait: async () => {} },
    lookup: async () => [{ address: "93.184.216.34", family: 4 }],
    request: async (url, options) => {
      requested.push({ url, method: options.method, addresses: options.addresses });
      return requested.length === 1 ? { statusCode: 301, location: "https://www.example.org/final" } : { statusCode: 200, location: null };
    },
  });
  const result = await transport.request({ url: "https://example.org/start", method: "HEAD", timeoutMs: 100 });
  assert.equal(result.statusCode, 200);
  assert.equal(result.finalUrl, "https://www.example.org/final");
  assert.equal(requested.length, 2);
  assert.deepEqual(requested[0].addresses, [{ address: "93.184.216.34", family: 4 }]);
  await assert.rejects(() => resolvePublicAddresses("example.org", async () => [{ address: "127.0.0.1", family: 4 }]), /non-public address/);
  assert.deepEqual(await resolvePublicAddresses("[2606:4700:4700::1111]"), [{ address: "2606:4700:4700::1111", family: 6 }]);
});

test("scanner retries transient HEAD results, falls back to GET, and records GitHub state", async () => {
  const replies = [
    { outcome: "response", statusCode: 503, durationMs: 4, finalUrl: "https://github.com/old-owner/project" },
    { outcome: "response", statusCode: 405, durationMs: 5, finalUrl: "https://github.com/old-owner/project" },
    { outcome: "response", statusCode: 200, durationMs: 6, finalUrl: "https://github.com/new-owner/project" },
  ];
  const methods = [];
  const observation = await scanFreshnessResource(resources[2], {
    transport: { request: async ({ method }) => { methods.push(method); return replies.shift(); } },
    wait: async () => {},
    githubLookup: async (repository) => ({ repository, canonicalRepository: "new-owner/project", archived: true }),
  });
  assert.deepEqual(methods, ["HEAD", "HEAD", "GET"]);
  assert.deepEqual(observation.attempts.map(({ method, outcome, statusCode }) => ({ method, outcome, statusCode })), [
    { method: "HEAD", outcome: "response", statusCode: 503 },
    { method: "HEAD", outcome: "response", statusCode: 405 },
    { method: "GET", outcome: "response", statusCode: 200 },
  ]);
  assert.equal(observation.finalUrl, "https://github.com/new-owner/project");
  assert.deepEqual(observation.github, { repository: "old-owner/project", canonicalRepository: "new-owner/project", archived: true });
});

test("scanner stops immediately when a domain reports rate limiting", async () => {
  const methods = [];
  const observation = await scanFreshnessResource(resources[0], {
    transport: { request: async ({ method }) => { methods.push(method); return { outcome: "response", statusCode: 429, durationMs: 1, finalUrl: resources[0].url }; } },
    wait: async () => {},
  });
  assert.deepEqual(methods, ["HEAD"]);
  assert.equal(observation.attempts[0].statusCode, 429);
});

test("GitHub lookup accepts bounded same-origin metadata and refuses external redirects", async () => {
  const calls = [];
  const throttle = { wait: async (hostname) => calls.push({ throttled: hostname }) };
  const state = await lookupGitHubRepository("old-owner/project", {
    token: "test-token",
    throttle,
    fetchImplementation: async (url, options) => {
      calls.push({ url, options });
      return new Response(JSON.stringify({ full_name: "new-owner/project", archived: true }), { status: 200 });
    },
  });
  assert.deepEqual(state, { repository: "old-owner/project", canonicalRepository: "new-owner/project", archived: true });
  assert.equal(calls[0].throttled, "api.github.com");
  assert.equal(calls[1].url, "https://api.github.com/repos/old-owner/project");
  assert.equal(calls[1].options.headers.Authorization, "Bearer test-token");

  let externalRequests = 0;
  const refused = await lookupGitHubRepository("old-owner/project", {
    token: "test-token",
    fetchImplementation: async () => {
      externalRequests += 1;
      return new Response(null, { status: 301, headers: { Location: "https://example.org/capture" } });
    },
  });
  assert.equal(refused, null);
  assert.equal(externalRequests, 1);
});

test("scanner emits a deterministic, catalog-bound bundle and handles empty selections", async () => {
  const transport = { request: async ({ url }) => ({ outcome: "response", statusCode: 200, durationMs: 1, finalUrl: url }) };
  const bundle = await scanFreshnessTargets({
    index,
    targets: resources.slice(0, 2),
    observedAt: "2026-09-06T14:00:00Z",
    concurrency: 2,
    transport,
    githubLookup: async () => null,
  });
  assert.doesNotThrow(() => validateFreshnessObservationBundle(bundle, index));
  assert.deepEqual(bundle.observations.map((observation) => observation.resourceId), ["alpha", "beta"]);
  assert.equal(await scanFreshnessTargets({ index, targets: [], transport }), null);
});

test("scanner CLI dry run plans without performing network requests", async () => {
  const root = new URL("..", import.meta.url).pathname;
  const repositoryIndex = await loadRepositoryResourceIndex(root);
  const result = spawnSync(process.execPath, ["scripts/scan-freshness.mjs", "--dry-run", "--shard-index", "0", "--shard-count", "256"], { cwd: root, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(report.mode, "plan-only");
  assert.equal(report.selection.shardCount, 256);
  assert.ok(report.selection.resourceCount > 0 && report.selection.resourceCount < repositoryIndex.resources.length);
  assert.equal(report.observedAt, null);
  assert.equal(report.policy.responseBodiesPersisted, false);
});
