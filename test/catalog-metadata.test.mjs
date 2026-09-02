import assert from "node:assert/strict";
import test from "node:test";
import {
  activeMetadataFacetCount,
  emptyMetadataFacets,
  formatMetadataValue,
  matchesMetadataFacets,
  metadataFacetValues,
} from "../site/catalog-metadata.js";

const official = { metadata: { authority: "official", access: ["free", "eligibility-based"], geography: ["us-ma"], authorization: ["reference-only", "explicit-scope"], operationalRisk: "low", skillLevel: "mixed" } };
const nonprofit = { metadata: { authority: "nonprofit", access: ["free"], geography: ["us-ma"] } };
const legacy = { metadata: {} };

test("matches scalar and multi-value structured facets", () => {
  assert.equal(matchesMetadataFacets(official, { ...emptyMetadataFacets(), authority: "official", access: "eligibility-based" }), true);
  assert.equal(matchesMetadataFacets(official, { ...emptyMetadataFacets(), authorization: "explicit-scope", operationalRisk: "low", skillLevel: "mixed" }), true);
  assert.equal(matchesMetadataFacets(nonprofit, { ...emptyMetadataFacets(), authority: "official" }), false);
  assert.equal(matchesMetadataFacets(legacy, { ...emptyMetadataFacets(), access: "free" }), false);
});

test("keeps legacy entries visible when no structured facet is selected", () => {
  assert.equal(matchesMetadataFacets(legacy, emptyMetadataFacets()), true);
});

test("derives sorted filter options and an active-filter count", () => {
  assert.deepEqual(metadataFacetValues([official, nonprofit, legacy], "authority"), ["nonprofit", "official"]);
  assert.equal(activeMetadataFacetCount({ ...emptyMetadataFacets(), authority: "official", access: "free" }), 2);
  assert.equal(formatMetadataValue("access", "eligibility-based"), "Eligibility Based");
  assert.equal(formatMetadataValue("authorization", "explicit-scope"), "Explicit Scope");
  assert.equal(formatMetadataValue("geography", "us-ma"), "us-ma");
  assert.equal(formatMetadataValue("language", "en-US"), "en-US");
});
