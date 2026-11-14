import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import {
  parseArguments,
  routeUrl,
  verifyPublicationOnce
} from "../scripts/verify-intelligence-publication.mjs";
import {
  CURRENT_RELAY_REVISION,
  CURRENT_RELAY_VERSION,
  CURRENT_ROUTES,
  CURRENT_SEARCH_OBSERVATORY_REVISION,
  ROUTE_REGISTRY
} from "../scripts/lib/intelligence-publication-profile.mjs";

const canonical = new URL("https://akashic.egohygiene.io/");
const fallback = new URL("https://egohygiene.github.io/akashic/");
const representedRevision = "1".repeat(40);
const observedAt = "2026-01-01T00:00:00Z";
const digest = (bytes) => `sha256:${createHash("sha256").update(bytes).digest("hex")}`;

// Synthetic public source evidence for the current reviewed publisher profile.
// Hash the actual served JSON bytes, rather than bypassing manifest admission.
function publicationFixture(mutate = () => {}) {
  const sourceReceipt = (kind) => ({
    schema: kind === "releases" ? "egohygiene.relay.source-release-build/v1" : "egohygiene.relay.source-capture-build/v1",
    kind, admission: "fresh-captured-input", repository: "egohygiene/akashic",
    source_commit: representedRevision, observed_at: observedAt,
    validation: { hygiene: "valid", coverage: "valid", observatory: "normalized" }
  });
  const provenance = {
    schema: "egohygiene.relay.repository-intelligence-provenance/v1", schema_version: 1,
    generated_at: observedAt,
    consumer: { repository: "egohygiene/akashic", source_commit: representedRevision, visibility: "public" },
    generator: { name: "egohygiene/relay/actions/repository-intelligence", repository: "egohygiene/relay",
      source_commit: CURRENT_RELAY_REVISION, source_ref: CURRENT_RELAY_REVISION, version: CURRENT_RELAY_VERSION, immutable: true },
    projection: { route: "/intelligence/", classification: "public-safe", deployment_authority: "consumer" },
    source_collection: {
      schema: "egohygiene.relay.source-build/v1", repository: "egohygiene/akashic",
      source_commit: representedRevision, observed_at: observedAt, input_plan_sha256: "a".repeat(64),
      coverage: { git: { collection: "observed" }, history: { collection: "partial" } },
      normalization_profile: { schema: "egohygiene.relay.search-normalization-profile/v1", profile: "search-attribution-v1",
        feature_kwargs: { search_attribution: true }, runtime: { pins: { sources: { observatory: {
          repository: "egohygiene/observatory", revision: CURRENT_SEARCH_OBSERVATORY_REVISION
        } } } } },
      domains: {
        journey: { schema: "egohygiene.relay.source-journey-build/v1", admission: "fresh-immutable-git",
          repository: "egohygiene/akashic", source_commit: representedRevision, observed_at: observedAt,
          inputs: { public_subjects: false }, scope: { provider_events: "uncollected", parent_topology: "unavailable",
            declared_reference_resolution: "unavailable" } },
        work: { ...sourceReceipt("work"), inputs: { scope: "provider-inventories" } },
        health: { ...sourceReceipt("health"), inputs: { scope: "partial", captures: [{ producer: "github-check-runs" }] } },
        releases: { ...sourceReceipt("releases"), inputs: { capture_sha256: "b".repeat(64), public_environments: [] },
          coverage: { deployments: { collection: "uncollected" } } },
        dependencies: {
          schema: "egohygiene.relay.source-dependency-build/v1", kind: "dependencies", admission: "fresh-owner-declarations",
          repository: "egohygiene/akashic", source_commit: representedRevision, observed_at: observedAt,
          validation: { hygiene: "valid", coverage: "valid", observatory: "normalized" },
          inputs: { scope: { kind: "declared_consumption", authority: "egohygiene/hygiene", bounded: true,
            runtime_adoption: "uncollected", package_dependencies: "uncollected", excluded_topology: "uncollected" },
            catalog_admission: { revision: "49639c1845cdfd08fbd5a768261a8b3cf515f80f",
              artifact_sha256: "af9c7186ded0bb57b18741eaa5905314b96d6adb03736946c868e0fc4aa50b26" } },
          coverage: Object.fromEntries(["checks", "decisions", "deployments", "git", "history", "issues", "pull_requests", "releases", "roadmap"]
            .map((kind) => [kind, { collection: "uncollected" }]))
        }
      }
    }
  };
  const routes = {
    schema: "egohygiene.relay.repository-intelligence-routes/v1", schema_version: 1,
    profile: "repository", repository: "egohygiene/akashic", represented_commit: representedRevision,
    registry: { ...ROUTE_REGISTRY }, routes: CURRENT_ROUTES.map((canonical_route) => ({ canonical_route }))
  };
  const manifest = {
    schema: "egohygiene.relay.repository-intelligence-build-manifest/v1", schema_version: 1,
    consumer: { repository: "egohygiene/akashic", revision: representedRevision },
    generator: { repository: "egohygiene/relay", revision: CURRENT_RELAY_REVISION, version: CURRENT_RELAY_VERSION },
    enabled_routes: [...CURRENT_ROUTES], bundle: { digest: `sha256:${"c".repeat(64)}`, files: [] }
  };
  mutate({ provenance, routes, manifest });
  const documents = new Map([
    ["provenance.json", JSON.stringify(provenance)], ["routes.json", JSON.stringify(routes)]
  ]);
  // Keep an explicit negative inventory mutation instead of repairing it here.
  if (manifest.bundle.files.length === 0) {
    manifest.bundle.files = [...documents].map(([path, bytes]) => ({ path, bytes: Buffer.byteLength(bytes), sha256: digest(bytes) }));
  }
  documents.set("build-manifest.json", JSON.stringify(manifest));
  const requests = [];
  const fetchImplementation = async (url, options) => {
    requests.push({ options, url });
    if (url.startsWith(canonical.toString())) {
      const bytes = documents.get(url.slice(new URL("intelligence/", canonical).toString().length));
      return { headers: new Headers(), ok: true, status: 200, url,
        ...(bytes === undefined ? {} : { body: new Response(bytes).body }) };
    }
    const route = url.slice(fallback.toString().length);
    return { headers: new Headers({ location: new URL(route, canonical).toString() }), ok: false, status: 301, url };
  };
  return {
    options: { fallbackOrigin: fallback, origin: canonical, representedRevision, expectedRelayRevision: CURRENT_RELAY_REVISION },
    documents, requests, fetchImplementation
  };
}

test("publication verifier accepts current routes, exact source evidence and redirect-only aliases", async () => {
  const fixture = publicationFixture();
  const result = await verifyPublicationOnce(fixture.options, fixture.fetchImplementation);
  const routeCount = CURRENT_ROUTES.length + 1;
  assert.equal(result.routes.length, routeCount);
  assert.equal(result.aliases.length, routeCount);
  assert.equal(result.profile.relayRevision, CURRENT_RELAY_REVISION);
  assert.equal(fixture.requests.length, routeCount * 2 + 3);
  assert.deepEqual(new Set(fixture.requests.map(({ options }) => options.redirect)), new Set(["follow", "manual", "error"]));
  assert.equal(result.sourceBinding.provenance_sha256, digest(fixture.documents.get("provenance.json")));
  assert.equal(result.sourceBinding.routes_sha256, digest(fixture.documents.get("routes.json")));
});

test("publication verifier rejects a fallback redirect that escapes the canonical route", async () => {
  const fixture = publicationFixture();
  const fetchImplementation = async (url, options) => url.startsWith(canonical.toString())
    ? fixture.fetchImplementation(url, options)
    : { headers: new Headers({ location: "https://example.com/" }), ok: false, status: 301, url };
  await assert.rejects(verifyPublicationOnce(fixture.options, fetchImplementation), /redirect-only alias/);
});

test("publication verifier rejects omitted, overclaimed and unbound source evidence", async () => {
  for (const [label, mutate, expected] of [
    ["wrong represented source", ({ provenance }) => { provenance.consumer.source_commit = "2".repeat(40); }, /served provenance/],
    ["missing capture", ({ provenance }) => { delete provenance.source_collection.domains.health; }, /Journey and Search/],
    ["overclaimed health", ({ provenance }) => { provenance.source_collection.domains.health.inputs.scope = "complete"; }, /reviewed Work/],
    ["wrong route registry", ({ routes }) => { routes.registry.source_commit = "3".repeat(40); }, /expected repository registry/],
    ["wrong byte inventory", ({ manifest }) => { manifest.bundle.files = [{ path: "provenance.json", bytes: 1, sha256: `sha256:${"0".repeat(64)}` }]; }, /manifest inventory/]
  ]) {
    const fixture = publicationFixture(mutate);
    await assert.rejects(verifyPublicationOnce(fixture.options, fixture.fetchImplementation), expected, label);
  }
});

test("publication verifier rejects mutable or unreviewed publisher selections before fetching", async () => {
  const fixture = publicationFixture();
  for (const replacement of [{ representedRevision: "main" }, { expectedRelayRevision: "main" }, { expectedRelayRevision: "4".repeat(40) }]) {
    await assert.rejects(verifyPublicationOnce({ ...fixture.options, ...replacement }, fixture.fetchImplementation), /full SHA|no reviewed publication profile/);
  }
  assert.equal(fixture.requests.length, 0);
});

test("publication verifier parses bounded public-safe workflow evidence arguments", () => {
  const options = parseArguments([
    "--origin", canonical.toString(), "--fallback-origin", fallback.toString(),
    "--represented-revision", representedRevision, "--expected-relay-revision", CURRENT_RELAY_REVISION,
    "--workflow-run-id", "123", "--workflow-run-attempt", "2", "--attempts", "12", "--delay-seconds", "10",
    "--output", ".akashic-local/repository-intelligence/live-verification.json"
  ]);
  assert.equal(options.attempts, 12);
  assert.equal(options.delayMilliseconds, 10_000);
  assert.equal(options.workflowRunId, 123);
  assert.equal(options.expectedRelayRevision, CURRENT_RELAY_REVISION);
  assert.equal(routeUrl(options.fallbackOrigin, "/intelligence/now/"), "https://egohygiene.github.io/akashic/intelligence/now/");
});

test("publication verifier rejects credentials, missing pins, mutable revisions, and unsafe paths", () => {
  const base = [
    "--origin", canonical.toString(), "--fallback-origin", fallback.toString(),
    "--represented-revision", representedRevision, "--expected-relay-revision", CURRENT_RELAY_REVISION,
    "--workflow-run-id", "123", "--workflow-run-attempt", "1", "--attempts", "1", "--delay-seconds", "1",
    "--output", "evidence/report.json"
  ];
  const withValue = (name, value) => base.map((item, index) => base[index - 1] === name ? value : item);
  assert.throws(() => parseArguments(withValue("--origin", "https://token@example.com/")), /credential-free HTTPS/);
  assert.throws(() => parseArguments(withValue("--represented-revision", "main")), /full SHA/);
  assert.throws(() => parseArguments(withValue("--expected-relay-revision", "main")), /no reviewed publication profile/);
  assert.throws(() => parseArguments(withValue("--output", "../report.json")), /canonical repository-relative path/);
  const missingPin = base.filter((_value, index) => base[index] !== "--expected-relay-revision" && base[index - 1] !== "--expected-relay-revision");
  assert.throws(() => parseArguments(missingPin), /missing --expected-relay-revision/);
});
