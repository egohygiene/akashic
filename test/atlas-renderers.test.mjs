import assert from "node:assert/strict";
import test from "node:test";
import { createAtlasRendererRegistry } from "../site/atlas-renderers.js";

test("resolves Atlas renderers by exact geometry dataset and location level", () => {
  const drawWorld = () => true;
  const drawRegion = () => true;
  const registry = createAtlasRendererRegistry([
    { dataset: "world", level: "world", render: drawWorld },
    { dataset: "us-states", level: "region", render: drawRegion },
  ]);

  assert.equal(registry.resolve({ kind: "world", geometry: { dataset: "world" } }), drawWorld);
  assert.equal(registry.resolve({ kind: "region", geometry: { dataset: "us-states" } }), drawRegion);
  assert.equal(registry.resolve({ kind: "country", geometry: { dataset: "world" } }), null);
  assert.equal(registry.resolve({ kind: "region", geometry: { dataset: "unknown-boundaries" } }), null);
  assert.equal(registry.resolve(null), null);
});

test("rejects incomplete and duplicate Atlas renderer registrations", () => {
  const render = () => true;
  assert.throws(() => createAtlasRendererRegistry({}), /must be an array/);
  assert.throws(() => createAtlasRendererRegistry([{ level: "world", render }]), /geometry dataset/);
  assert.throws(() => createAtlasRendererRegistry([{ dataset: "world", render }]), /location level/);
  assert.throws(() => createAtlasRendererRegistry([{ dataset: "world", level: "world" }]), /render function/);
  assert.throws(
    () => createAtlasRendererRegistry([
      { dataset: "world", level: "world", render },
      { dataset: "world", level: "world", render },
    ]),
    /Duplicate Atlas renderer/,
  );
});
