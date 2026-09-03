import assert from "node:assert/strict";
import test from "node:test";
import { validateAtlasApplicability, validateAtlasHierarchy } from "../scripts/lib/atlas.mjs";

function location(id, parentId = null) {
  return {
    id,
    name: id,
    kind: parentId ? "region" : "world",
    parentId,
    geometry: { dataset: parentId ? "regions" : "world", id },
    camera: { center: [0, 0], zoom: 1 },
  };
}

function catalogResource(id, idOrigin = "explicit") {
  return { id, idOrigin, url: `https://example.com/${id}` };
}

function applicability(associations, provenance = [{ id: "seed-migration", kind: "migration", source: "atlas/locations.json" }]) {
  return { schemaVersion: 1, provenance, associations };
}

function association(overrides = {}) {
  return {
    resourceId: "federal-resource",
    locationId: "world",
    relationship: "specific",
    section: "Start here",
    provenanceId: "seed-migration",
    ...overrides,
  };
}

test("validates Atlas hierarchy and derives child identifiers", () => {
  const hierarchy = { schemaVersion: 2, rootId: "world", locations: [location("world"), location("state", "world")] };
  const locations = validateAtlasHierarchy(hierarchy);
  assert.deepEqual(locations.get("world").children, ["state"]);
  assert.deepEqual(locations.get("state").children, []);
});

test("rejects unknown Atlas parents and hierarchy cycles", () => {
  assert.throws(
    () => validateAtlasHierarchy({ schemaVersion: 2, rootId: "world", locations: [location("world"), location("state", "missing")] }),
    /Unknown atlas parent/,
  );
  const world = location("world", "state");
  const state = location("state", "world");
  assert.throws(
    () => validateAtlasHierarchy({ schemaVersion: 2, rootId: "world", locations: [world, state] }),
    /cycle detected/,
  );
});

test("rejects invalid point geometry", () => {
  const point = location("town", "world");
  point.geometry = { dataset: "point", coordinates: [-71, 42], mapPosition: [1.2, 0.4] };
  assert.throws(
    () => validateAtlasHierarchy({ schemaVersion: 2, rootId: "world", locations: [location("world"), point] }),
    /Invalid atlas point geometry/,
  );
});

test("keeps the location registry separate from catalog applicability", () => {
  const world = location("world");
  world.catalogResources = [{ resourceId: "federal-resource", section: "Start here" }];
  assert.throws(
    () => validateAtlasHierarchy({ schemaVersion: 2, rootId: "world", locations: [world] }),
    /belongs in atlas\/applicability\.json/,
  );
});

test("allows one stable catalog resource to have explicit associations with multiple places", () => {
  const locations = validateAtlasHierarchy({ schemaVersion: 2, rootId: "world", locations: [location("world"), location("state", "world")] });
  const resources = new Map([["federal-resource", catalogResource("federal-resource")]]);
  const associations = validateAtlasApplicability(applicability([
    association(),
    association({ locationId: "state", relationship: "cross-associated", role: "index", section: "State finders" }),
  ]), locations, resources);
  assert.equal(associations.length, 2);
  assert.equal(associations[0].role, "resource");
  assert.equal(associations[1].role, "index");
  assert.equal(associations[1].relationship, "cross-associated");
  assert.deepEqual(associations[0].provenance, { id: "seed-migration", kind: "migration", source: "atlas/locations.json" });
});

test("accepts complete human-review provenance", () => {
  const locations = validateAtlasHierarchy({ schemaVersion: 2, rootId: "world", locations: [location("world")] });
  const resources = new Map([["federal-resource", catalogResource("federal-resource")]]);
  const manifest = applicability(
    [association({ provenanceId: "scope-review" })],
    [{ id: "scope-review", kind: "human-review", sourceUrl: "https://example.gov/scope", reviewed: "2026-09-03", reviewedBy: "reviewer-name" }],
  );
  assert.equal(validateAtlasApplicability(manifest, locations, resources)[0].provenance.kind, "human-review");
});

test("rejects invalid applicability provenance", () => {
  const locations = validateAtlasHierarchy({ schemaVersion: 2, rootId: "world", locations: [location("world")] });
  const resources = new Map([["federal-resource", catalogResource("federal-resource")]]);
  assert.throws(
    () => validateAtlasApplicability(applicability([association()], [{ id: "seed-migration", kind: "migration", source: "../locations.json" }]), locations, resources),
    /Invalid Atlas migration source/,
  );
  assert.throws(
    () => validateAtlasApplicability(applicability([association({ provenanceId: "scope-review" })], [{ id: "scope-review", kind: "human-review", sourceUrl: "http://example.gov/scope", reviewed: "2026-02-31", reviewedBy: "reviewer" }]), locations, resources),
    /must use an HTTPS source/,
  );
  assert.throws(
    () => validateAtlasApplicability(applicability([association({ provenanceId: "scope-review" })], [{ id: "scope-review", kind: "human-review", sourceUrl: "https://example.gov/scope", reviewed: "2026-02-31", reviewedBy: "reviewer" }]), locations, resources),
    /Invalid Atlas review date/,
  );
});

test("rejects unknown, derived, and duplicate applicability targets", () => {
  const locations = validateAtlasHierarchy({ schemaVersion: 2, rootId: "world", locations: [location("world")] });
  const explicitResources = new Map([["federal-resource", catalogResource("federal-resource")]]);
  assert.throws(
    () => validateAtlasApplicability(applicability([association({ locationId: "missing" })]), locations, explicitResources),
    /unknown Atlas location/,
  );
  assert.throws(
    () => validateAtlasApplicability(applicability([association({ resourceId: "missing-resource" })]), locations, explicitResources),
    /outside the main catalog/,
  );
  assert.throws(
    () => validateAtlasApplicability(applicability([association()]), locations, new Map([["federal-resource", catalogResource("federal-resource", "derived")]])),
    /must use an explicit resource ID/,
  );
  assert.throws(
    () => validateAtlasApplicability(applicability([association(), association()]), locations, explicitResources),
    /Duplicate Atlas applicability association/,
  );
});

test("rejects incomplete or unsupported applicability fields", () => {
  const locations = validateAtlasHierarchy({ schemaVersion: 2, rootId: "world", locations: [location("world")] });
  const resources = new Map([["federal-resource", catalogResource("federal-resource")]]);
  assert.throws(
    () => validateAtlasApplicability(applicability([association({ relationship: "inherited" })]), locations, resources),
    /unsupported relationship/,
  );
  assert.throws(
    () => validateAtlasApplicability(applicability([association({ role: "primary" })]), locations, resources),
    /unsupported role/,
  );
  assert.throws(
    () => validateAtlasApplicability(applicability([association({ section: " Start here" })]), locations, resources),
    /invalid section/,
  );
  assert.throws(
    () => validateAtlasApplicability({ ...applicability([association()]), extra: true }, locations, resources),
    /unsupported fields/,
  );
});
