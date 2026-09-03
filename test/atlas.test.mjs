import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { atlasTopologyGeometryIds, deriveAtlasLocationResources, mergeAtlasLocationSources, validateAtlasApplicability, validateAtlasCountryRegistry, validateAtlasHierarchy, validateAtlasSubdivisionRegistry } from "../scripts/lib/atlas.mjs";

const locationManifestFixture = JSON.parse(await readFile(new URL("../atlas/locations.json", import.meta.url), "utf8"));
const usLocationsFixture = JSON.parse(await readFile(new URL("../atlas/locations/us.json", import.meta.url), "utf8"));
const countryRegistryFixture = JSON.parse(await readFile(new URL("../atlas/identifiers/countries.json", import.meta.url), "utf8"));
const subdivisionRegistryFixture = JSON.parse(await readFile(new URL("../atlas/identifiers/us-subdivisions.json", import.meta.url), "utf8"));
const worldTopologyFixture = JSON.parse(await readFile(new URL("../site/data/geometry/countries-110m.json", import.meta.url), "utf8"));
const statesTopologyFixture = JSON.parse(await readFile(new URL("../site/data/geometry/states-albers-10m.json", import.meta.url), "utf8"));
const geometryIdsByDataset = new Map([
  ["world", atlasTopologyGeometryIds(worldTopologyFixture, "countries", { allowMissing: true })],
  ["us-states", atlasTopologyGeometryIds(statesTopologyFixture, "states")],
]);

function location(id, parentId = null) {
  if (parentId === null) {
    return {
      id,
      name: id,
      shortName: id,
      kind: "world",
      parentId,
      geometry: { dataset: "world", id: null },
      camera: { center: [0, 0], zoom: 1 },
    };
  }
  return {
    id,
    name: id,
    shortName: id,
    kind: "locality",
    parentId,
    geometry: { dataset: "point", coordinates: [0, 0], mapPosition: [0.5, 0.5] },
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
  const state = location("state", "town");
  const town = location("town", "state");
  assert.throws(
    () => validateAtlasHierarchy({ schemaVersion: 2, rootId: "world", locations: [location("world"), state, town] }),
    /cycle detected/,
  );
});

test("merges sorted Atlas location sources and retains source provenance", () => {
  const hierarchy = mergeAtlasLocationSources(locationManifestFixture, new Map([["locations/us.json", usLocationsFixture]]));
  assert.equal(hierarchy.locations.length, 5);
  assert.equal(hierarchy.locations[0].source, "atlas/locations.json");
  assert.equal(hierarchy.locations[1].source, "atlas/locations/us.json");
  assert.throws(
    () => mergeAtlasLocationSources({ ...locationManifestFixture, includes: ["../private.json"] }, new Map()),
    /Invalid Atlas location include path/,
  );
  assert.throws(
    () => mergeAtlasLocationSources({ ...locationManifestFixture, includes: ["locations/us.json", "locations/us.json"] }, new Map([["locations/us.json", usLocationsFixture]])),
    /duplicate includes/,
  );
  assert.throws(
    () => mergeAtlasLocationSources({ ...locationManifestFixture, includes: ["locations/z.json", "locations/us.json"] }, new Map()),
    /must be sorted/,
  );
  assert.throws(
    () => mergeAtlasLocationSources({ ...locationManifestFixture, includes: ["locations/ca.json"] }, new Map([["locations/ca.json", usLocationsFixture]])),
    /exactly one matching country/,
  );
});

test("extracts only unambiguous topology geometry identifiers", () => {
  const topology = { type: "Topology", arcs: [], objects: { places: { type: "GeometryCollection", geometries: [{ id: "01" }, {}] } } };
  assert.throws(() => atlasTopologyGeometryIds(topology, "places"), /missing or duplicate geometry IDs/);
  assert.deepEqual([...atlasTopologyGeometryIds(topology, "places", { allowMissing: true })], ["01"]);
  topology.objects.places.geometries[1].id = "01";
  assert.throws(() => atlasTopologyGeometryIds(topology, "places", { allowMissing: true }), /missing or duplicate geometry IDs/);
});

test("validates the country identifier crosswalk against world geometry", () => {
  const registry = validateAtlasCountryRegistry(countryRegistryFixture, geometryIdsByDataset);
  assert.deepEqual(registry.countryByLocationId.get("us"), {
    locationId: "us",
    isoAlpha2: "US",
    isoNumeric: "840",
    geometry: { dataset: "world", id: "840" },
  });
  const mismatchedGeometry = structuredClone(countryRegistryFixture);
  mismatchedGeometry.countries[0].geometry.id = "124";
  assert.throws(() => validateAtlasCountryRegistry(mismatchedGeometry, geometryIdsByDataset), /Unknown or mismatched Atlas country geometry/);
  assert.throws(() => validateAtlasCountryRegistry({ ...countryRegistryFixture, sourceUrl: "http://example.com/codes" }, geometryIdsByDataset), /must use an HTTPS source/);
});

test("validates the complete Census subdivision registry against checked-in geometry", () => {
  const registry = validateAtlasSubdivisionRegistry(subdivisionRegistryFixture, geometryIdsByDataset);
  assert.equal(registry.subdivisions.length, 57);
  assert.equal(registry.subdivisions.filter((subdivision) => subdivision.type === "state").length, 50);
  assert.equal(registry.subdivisions.filter((subdivision) => subdivision.type === "district").length, 1);
  assert.equal(registry.subdivisions.filter((subdivision) => subdivision.type === "territory").length, 5);
  assert.equal(registry.subdivisions.filter((subdivision) => subdivision.type === "territory-group").length, 1);
  assert.equal(registry.subdivisions.filter((subdivision) => subdivision.geometry !== null).length, 51);
  assert.deepEqual(registry.subdivisionByLocationId.get("us-ca").geometry, { dataset: "us-states", id: "06" });
  assert.equal(registry.subdivisionByLocationId.get("us-pr").censusFips, "72");
  assert.equal(registry.subdivisionByLocationId.get("us-pr").geometry, null);
});

test("rejects malformed or incomplete Atlas subdivision registries", () => {
  const duplicatePostal = structuredClone(subdivisionRegistryFixture);
  duplicatePostal.subdivisions[1].postalCode = duplicatePostal.subdivisions[0].postalCode;
  duplicatePostal.subdivisions[1].locationId = duplicatePostal.subdivisions[0].locationId;
  assert.throws(() => validateAtlasSubdivisionRegistry(duplicatePostal, geometryIdsByDataset), /postal code/);

  const mismatchedGeometry = structuredClone(subdivisionRegistryFixture);
  mismatchedGeometry.subdivisions.find((subdivision) => subdivision.locationId === "us-ca").geometry.id = "99";
  assert.throws(() => validateAtlasSubdivisionRegistry(mismatchedGeometry, geometryIdsByDataset), /does not match the Census FIPS code/);

  const incompleteGeometry = structuredClone(subdivisionRegistryFixture);
  incompleteGeometry.subdivisions.find((subdivision) => subdivision.locationId === "us-ca").geometry = null;
  assert.throws(() => validateAtlasSubdivisionRegistry(incompleteGeometry, geometryIdsByDataset), /does not completely cover geometry dataset/);

  const unknownGeometryDataset = structuredClone(subdivisionRegistryFixture);
  unknownGeometryDataset.subdivisions.find((subdivision) => subdivision.locationId === "us-pr").geometry = { dataset: "missing-boundaries", id: "72" };
  assert.throws(() => validateAtlasSubdivisionRegistry(unknownGeometryDataset, geometryIdsByDataset), /Unknown Atlas geometry/);

  const insecureSource = { ...subdivisionRegistryFixture, sourceUrl: "http://example.com/codes" };
  assert.throws(() => validateAtlasSubdivisionRegistry(insecureSource, geometryIdsByDataset), /must use an HTTPS source/);
});

test("validates Atlas country and subdivision identifiers independently of map coverage", () => {
  const hierarchy = mergeAtlasLocationSources(locationManifestFixture, new Map([["locations/us.json", usLocationsFixture]]));
  const countryRegistry = validateAtlasCountryRegistry(countryRegistryFixture, geometryIdsByDataset);
  const registry = validateAtlasSubdivisionRegistry(subdivisionRegistryFixture, geometryIdsByDataset);
  const registries = new Map([[registry.id, registry]]);
  const locations = validateAtlasHierarchy(hierarchy, { countryRegistry, geometryIdsByDataset, subdivisionRegistryById: registries });
  assert.equal(locations.get("us").identifiers.isoNumeric, "840");
  assert.equal(locations.get("us-ma").identifiers.censusFips, "25");

  const badCountry = structuredClone(mergeAtlasLocationSources(locationManifestFixture, new Map([["locations/us.json", usLocationsFixture]])));
  const country = badCountry.locations.find((candidate) => candidate.id === "us");
  country.identifiers.isoNumeric = "124";
  country.geometry.id = "124";
  assert.throws(() => validateAtlasHierarchy(badCountry, { countryRegistry, geometryIdsByDataset, subdivisionRegistryById: registries }), /do not match the country registry/);

  const badRegion = structuredClone(mergeAtlasLocationSources(locationManifestFixture, new Map([["locations/us.json", usLocationsFixture]])));
  badRegion.locations.find((candidate) => candidate.id === "us-ma").identifiers.censusFips = "26";
  assert.throws(() => validateAtlasHierarchy(badRegion, { countryRegistry, geometryIdsByDataset, subdivisionRegistryById: registries }), /do not match a registered subdivision/);

  const territoryGeometry = mergeAtlasLocationSources(locationManifestFixture, new Map([["locations/us.json", usLocationsFixture]]));
  territoryGeometry.locations.push({
    id: "us-pr",
    name: "Puerto Rico",
    shortName: "Puerto Rico",
    kind: "region",
    parentId: "us",
    identifiers: { registry: "us-subdivisions", subdivisionType: "territory", postalCode: "PR", censusFips: "72" },
    geometry: { dataset: "us-states", id: "72" },
    camera: { center: [-66.5, 18.2], zoom: 6 },
  });
  assert.throws(() => validateAtlasHierarchy(territoryGeometry, { countryRegistry, geometryIdsByDataset, subdivisionRegistryById: registries }), /has no registered map geometry/);
});

test("rejects unsupported location kinds, camera fields, and identifiers", () => {
  const secondWorld = { ...location("other"), parentId: "world" };
  assert.throws(
    () => validateAtlasHierarchy({ schemaVersion: 2, rootId: "world", locations: [location("world"), secondWorld] }),
    /Only the atlas root may use the world location kind/,
  );
  const badCamera = location("town", "world");
  badCamera.camera = { center: [0, 0], zoom: 1, bearing: 20 };
  assert.throws(
    () => validateAtlasHierarchy({ schemaVersion: 2, rootId: "world", locations: [location("world"), badCamera] }),
    /Atlas camera town contains unsupported fields/,
  );
  const identifiedLocality = location("town", "world");
  identifiedLocality.identifiers = { postalCode: "XX" };
  assert.throws(
    () => validateAtlasHierarchy({ schemaVersion: 2, rootId: "world", locations: [location("world"), identifiedLocality] }),
    /must not declare unsupported identifiers/,
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
