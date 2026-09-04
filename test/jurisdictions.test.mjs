import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { atlasTopologyGeometryIds, mergeAtlasLocationSources, validateAtlasCountryRegistry, validateAtlasHierarchy, validateAtlasSubdivisionRegistry } from "../scripts/lib/atlas.mjs";
import { ATLAS_JURISDICTION_SCHEMA_VERSION, validateAtlasJurisdictions } from "../scripts/lib/jurisdictions.mjs";

const manifestFixture = JSON.parse(await readFile(new URL("../atlas/jurisdictions.json", import.meta.url), "utf8"));
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
const countryRegistry = validateAtlasCountryRegistry(countryRegistryFixture, geometryIdsByDataset);
const subdivisionRegistry = validateAtlasSubdivisionRegistry(subdivisionRegistryFixture, geometryIdsByDataset);
const subdivisionRegistryById = new Map([[subdivisionRegistry.id, subdivisionRegistry]]);
const hierarchy = mergeAtlasLocationSources(locationManifestFixture, new Map([["locations/us.json", usLocationsFixture]]));
const locationById = validateAtlasHierarchy(hierarchy, { countryRegistry, geometryIdsByDataset, subdivisionRegistryById });

function validate(manifest = manifestFixture) {
  return validateAtlasJurisdictions(manifest, { countryRegistry, locationById, subdivisionRegistryById });
}

test("validates explicit federal, state, district, territorial, and tribal jurisdiction records", () => {
  const result = validate();
  assert.equal(result.schemaVersion, ATLAS_JURISDICTION_SCHEMA_VERSION);
  assert.deepEqual(result.jurisdictions.map((jurisdiction) => jurisdiction.kind).sort(), ["district", "federal", "state", "territory", "tribal"]);
  assert.equal(result.jurisdictionById.get("us-ma").atlasLocationId, "us-ma");
  assert.equal(result.jurisdictionById.get("us-dc").atlasLocationId, undefined);
  assert.equal(result.jurisdictionById.get("us-pr").atlasLocationId, undefined);
  assert.equal(result.jurisdictionById.get("mashpee-wampanoag-tribe").identifierReference, undefined);
});

test("keeps jurisdiction relationships distinct from Atlas inheritance and legal applicability", () => {
  const result = validate();
  assert.match(result.notice, /do not establish controlling law/);
  assert.match(result.notice, /resource applicability/);
  assert.deepEqual(result.relationships.map((relationship) => relationship.kind).sort(), ["federalism", "government-to-government", "seat-of-government", "territorial"]);
  assert.equal(result.relationships.every((relationship) => !Object.hasOwn(relationship, "inheritsFromLocationId")), true);
});

test("rejects inferred tribal placement and unmaterialized Atlas locations", () => {
  const tribalPlacement = structuredClone(manifestFixture);
  tribalPlacement.jurisdictions.find((jurisdiction) => jurisdiction.kind === "tribal").atlasLocationId = "us-ma";
  assert.throws(() => validate(tribalPlacement), /must not be inferred from an Atlas place/);

  const unmaterializedDistrict = structuredClone(manifestFixture);
  unmaterializedDistrict.jurisdictions.find((jurisdiction) => jurisdiction.id === "us-dc").atlasLocationId = "us-dc";
  assert.throws(() => validate(unmaterializedDistrict), /not materialized/);
});

test("rejects unknown identifiers, sources, and relationship kind pairings", () => {
  const unknownIdentifier = structuredClone(manifestFixture);
  unknownIdentifier.jurisdictions.find((jurisdiction) => jurisdiction.id === "us-pr").identifierReference.locationId = "us-zz";
  assert.throws(() => validate(unknownIdentifier), /unknown authoritative identifier/);

  const unknownSource = structuredClone(manifestFixture);
  unknownSource.jurisdictions[0].sourceIds = ["missing-source"];
  assert.throws(() => validate(unknownSource), /references unknown source/);

  const invalidPairing = structuredClone(manifestFixture);
  invalidPairing.relationships.find((relationship) => relationship.kind === "federalism").subjectJurisdictionId = "us-pr";
  assert.throws(() => validate(invalidPairing), /does not match the federalism kind contract/);
});

test("rejects duplicate relationships and incomplete source provenance", () => {
  const duplicate = structuredClone(manifestFixture);
  duplicate.relationships.push(structuredClone(duplicate.relationships[0]));
  assert.throws(() => validate(duplicate), /Duplicate Atlas jurisdiction relationship/);

  const insecureSource = structuredClone(manifestFixture);
  insecureSource.sources[0].sourceUrl = "http://example.gov/status";
  assert.throws(() => validate(insecureSource), /must use an HTTPS source/);

  const invalidDate = structuredClone(manifestFixture);
  invalidDate.sources[0].retrieved = "2026-02-31";
  assert.throws(() => validate(invalidDate), /Invalid jurisdiction source date/);
});
