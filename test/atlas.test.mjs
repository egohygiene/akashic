import assert from "node:assert/strict";
import test from "node:test";
import { deriveAtlasLocationResources, validateAtlasApplicability, validateAtlasHierarchy } from "../scripts/lib/atlas.mjs";

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

function applicability(associations, provenance = [{ id: "seed-migration", kind: "migration", source: "atlas/locations.json" }], inheritance = []) {
  return { schemaVersion: 2, provenance, inheritance, associations };
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
  const { associations } = validateAtlasApplicability(applicability([
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
  assert.equal(validateAtlasApplicability(manifest, locations, resources).associations[0].provenance.kind, "human-review");
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

test("validates explicit provenance-bearing inheritance edges", () => {
  const locations = validateAtlasHierarchy({ schemaVersion: 2, rootId: "world", locations: [location("world"), location("country", "world"), location("state", "country")] });
  const resources = new Map([["federal-resource", catalogResource("federal-resource")]]);
  const inheritance = [
    { locationId: "state", inheritsFromLocationId: "country", provenanceId: "seed-migration" },
    { locationId: "country", inheritsFromLocationId: "world", provenanceId: "seed-migration" },
  ];
  const validated = validateAtlasApplicability(applicability([association()], undefined, inheritance), locations, resources);
  assert.equal(validated.inheritance.length, 2);
  assert.equal(validated.inheritance[0].id, "state:country");
  assert.deepEqual(validated.inheritance[0].provenance, { id: "seed-migration", kind: "migration", source: "atlas/locations.json" });
});

test("rejects invalid and cyclic inheritance edges", () => {
  const locations = validateAtlasHierarchy({ schemaVersion: 2, rootId: "world", locations: [location("world"), location("state", "world")] });
  const resources = new Map([["federal-resource", catalogResource("federal-resource")]]);
  const validate = (inheritance) => validateAtlasApplicability(applicability([association()], undefined, inheritance), locations, resources);
  assert.throws(
    () => validate([{ locationId: "missing", inheritsFromLocationId: "world", provenanceId: "seed-migration" }]),
    /unknown Atlas location/,
  );
  assert.throws(
    () => validate([{ locationId: "state", inheritsFromLocationId: "missing", provenanceId: "seed-migration" }]),
    /unknown inherited Atlas location/,
  );
  assert.throws(
    () => validate([{ locationId: "state", inheritsFromLocationId: "state", provenanceId: "seed-migration" }]),
    /cannot inherit from itself/,
  );
  assert.throws(
    () => validate([
      { locationId: "state", inheritsFromLocationId: "world", provenanceId: "seed-migration" },
      { locationId: "world", inheritsFromLocationId: "state", provenanceId: "seed-migration" },
    ]),
    /inheritance cycle/,
  );
  assert.throws(
    () => validate([
      { locationId: "state", inheritsFromLocationId: "world", provenanceId: "seed-migration" },
      { locationId: "state", inheritsFromLocationId: "world", provenanceId: "seed-migration" },
    ]),
    /Duplicate Atlas inheritance edge/,
  );
});

test("derives local-to-broader resources without duplicate identities or inherited cross-associations", () => {
  const locations = [location("world"), location("country", "world"), location("state", "country"), location("town", "state")];
  const locationById = validateAtlasHierarchy({ schemaVersion: 2, rootId: "world", locations });
  const resources = [
    { id: "town-resource", associationId: "town:town-resource", locationId: "town", relationship: "specific" },
    { id: "shared-resource", associationId: "town:shared-resource", locationId: "town", relationship: "cross-associated" },
    { id: "state-resource", associationId: "state:state-resource", locationId: "state", relationship: "specific" },
    { id: "state-cross", associationId: "state:state-cross", locationId: "state", relationship: "cross-associated" },
    { id: "shared-resource", associationId: "country:shared-resource", locationId: "country", relationship: "specific" },
    { id: "national-resource", associationId: "country:national-resource", locationId: "country", relationship: "specific" },
  ];
  const provenance = { id: "seed-migration", kind: "migration", source: "atlas/locations.json" };
  const inheritance = [
    { id: "town:state", locationId: "town", inheritsFromLocationId: "state", provenanceId: provenance.id, provenance },
    { id: "state:country", locationId: "state", inheritsFromLocationId: "country", provenanceId: provenance.id, provenance },
  ];
  const derived = deriveAtlasLocationResources([...locationById.values()], resources, inheritance);
  assert.deepEqual(derived.town.map((placement) => placement.associationId), [
    "town:town-resource",
    "town:shared-resource",
    "state:state-resource",
    "country:national-resource",
  ]);
  assert.deepEqual(derived.town.map((placement) => placement.relationship), ["specific", "cross-associated", "inherited", "inherited"]);
  assert.equal(derived.town[2].inheritancePath.length, 1);
  assert.equal(derived.town[3].inheritancePath.length, 2);
  assert.deepEqual(derived.town[3].inheritancePath, ["town:state", "state:country"]);
  assert.equal(derived.town.some((placement) => placement.associationId === "state:state-cross"), false);
  assert.equal(derived.town.filter((placement) => placement.associationId.includes("shared-resource")).length, 1);
});
