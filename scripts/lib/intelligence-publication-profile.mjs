// Consumer-owned admission profiles for the current publisher and frozen recovery.
// A route profile is selected only by its reviewed immutable generator revision.
export const CURRENT_RELAY_REVISION = "49046d88ef6fe2e31e9a9f443a61157b598efb78";
export const CURRENT_RELAY_VERSION = "1.6.0";
export const ROLLBACK_RELAY_REVISION = "55587de4ff322931d401e964f5af0716633dd675";
export const ROLLBACK_CONSUMER_REVISION = "cfa0cb3a948cf57eac9503604c5d19fa42178b2b";

export const LEGACY_ROUTES = Object.freeze([
  "/intelligence/",
  "/intelligence/compare/",
  "/intelligence/dashboard/",
  "/intelligence/decisions/",
  "/intelligence/dependencies/",
  "/intelligence/health/",
  "/intelligence/journey/",
  "/intelligence/now/",
  "/intelligence/releases/",
  "/intelligence/roadmap/",
  "/intelligence/search/",
  "/intelligence/work/"
]);

export const CURRENT_ROUTES = Object.freeze([
  ...LEGACY_ROUTES,
  "/intelligence/audits/",
  "/intelligence/diagnostics/",
  "/intelligence/distribution/",
  "/intelligence/hygiene/",
  "/intelligence/identity/",
  "/intelligence/sanity/"
].sort());

export const CURRENT_ENTRIES = Object.freeze([
  "audits", "build-manifest.json", "compare", "dashboard", "decisions",
  "dependencies", "diagnostics", "distribution", "egohygiene.png", "explorer.js",
  "github.svg", "graph.css", "graph.js", "health", "hygiene", "identity",
  "index.html", "journey", "now", "provenance.json", "releases", "roadmap",
  "routes.json", "sanity", "search", "site.css", "site.js", "styles.css",
  "summary.json", "work"
]);

export const ROUTE_REGISTRY = Object.freeze({
  owner: "egohygiene/hygiene",
  source_commit: "63d313b1ddf8669808e897853b74928505494da0",
  path: "catalog/public-site-surface-registry.json",
  sha256: "95c9db34dc0b66bb090bd92f89ce16cb7f850a0bbf9a47bd3d64f7ac3d0ad7f3",
  contract_version: "1.0.0-alpha.1"
});

export function publicationProfile(relayRevision, representedRevision) {
  if (!/^[0-9a-f]{40}$/.test(representedRevision || "")) {
    throw new Error("The represented publication source must be an immutable full SHA.");
  }
  if (relayRevision === CURRENT_RELAY_REVISION) {
    return Object.freeze({
      id: "registered-repository-v1",
      relayRevision,
      relayVersion: CURRENT_RELAY_VERSION,
      routes: CURRENT_ROUTES,
      manifest: true
    });
  }
  if (relayRevision === ROLLBACK_RELAY_REVISION && representedRevision === ROLLBACK_CONSUMER_REVISION) {
    return Object.freeze({
      id: "frozen-rollback-v1.3",
      relayRevision,
      relayVersion: "1.3.0",
      routes: LEGACY_ROUTES,
      manifest: false
    });
  }
  throw new Error("The expected publisher revision and represented source have no reviewed publication profile.");
}
