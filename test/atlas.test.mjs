import assert from "node:assert/strict";
import test from "node:test";
import { validateAtlasHierarchy } from "../scripts/lib/atlas.mjs";

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

test("validates Atlas hierarchy and derives child identifiers", () => {
  const hierarchy = { schemaVersion: 1, rootId: "world", locations: [location("world"), location("state", "world")] };
  const locations = validateAtlasHierarchy(hierarchy);
  assert.deepEqual(locations.get("world").children, ["state"]);
  assert.deepEqual(locations.get("state").children, []);
});

test("rejects unknown Atlas parents and hierarchy cycles", () => {
  assert.throws(
    () => validateAtlasHierarchy({ schemaVersion: 1, rootId: "world", locations: [location("world"), location("state", "missing")] }),
    /Unknown atlas parent/,
  );
  const world = location("world", "state");
  const state = location("state", "world");
  assert.throws(
    () => validateAtlasHierarchy({ schemaVersion: 1, rootId: "world", locations: [world, state] }),
    /cycle detected/,
  );
});

test("rejects invalid point geometry", () => {
  const point = location("town", "world");
  point.geometry = { dataset: "point", coordinates: [-71, 42], mapPosition: [1.2, 0.4] };
  assert.throws(
    () => validateAtlasHierarchy({ schemaVersion: 1, rootId: "world", locations: [location("world"), point] }),
    /Invalid atlas point geometry/,
  );
});
