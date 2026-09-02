import assert from "node:assert/strict";
import test from "node:test";
import {
  applyResourceIdentity,
  deriveResourceId,
  extractResourceMetadata,
  validateResourceIdentities,
  validateResourceMetadata,
} from "../scripts/lib/resource-metadata.mjs";

test("derives a deterministic transitional ID from the title, not the URL", () => {
  assert.equal(deriveResourceId("Example Resource"), deriveResourceId("Example Resource"));
  assert.match(deriveResourceId("Example Resource"), /^example-resource-[a-f0-9]{10}$/);
  const first = applyResourceIdentity({ title: "Example Resource", url: "https://old.example/", metadata: null });
  const moved = applyResourceIdentity({ title: "Example Resource", url: "https://new.example/", metadata: null });
  assert.equal(first.id, moved.id);
  assert.equal(first.idOrigin, "derived");
});

test("extracts explicit identity and structured metadata from a trailing comment", () => {
  const parsed = extractResourceMetadata('Description. <!-- akashic-meta: {"id":"example-resource","aliases":["https://old.example/"],"authority":"official","access":["free"],"geography":["us-ma"],"language":["en-US"],"reviewed":"2026-09-02","linkStatus":"ok","linkChecked":"2026-09-02"} -->');
  assert.equal(parsed.description, "Description.");
  const resource = applyResourceIdentity({ title: "Example", url: "https://example.com/", metadata: parsed.metadata });
  assert.equal(resource.id, "example-resource");
  assert.equal(resource.idOrigin, "explicit");
  assert.deepEqual(resource.aliases, ["https://old.example/"]);
  assert.equal(resource.metadata.authority, "official");
  assert.equal(resource.metadata.linkStatus, "ok");
});

test("rejects unknown values, incomplete link checks, and malformed dates", () => {
  assert.throws(() => validateResourceMetadata({ authority: "government" }), /authority must use/);
  assert.throws(() => validateResourceMetadata({ authorization: ["permission-implied"] }), /authorization must use/);
  assert.throws(() => validateResourceMetadata({ operationalRisk: "extreme" }), /operationalRisk must use/);
  assert.throws(() => validateResourceMetadata({ skillLevel: "expert" }), /skillLevel must use/);
  assert.throws(() => validateResourceMetadata({ artifactDomain: ["device"] }), /artifactDomain must use/);
  assert.throws(() => validateResourceMetadata({ forensicRole: ["certification"] }), /forensicRole must use/);
  assert.throws(() => validateResourceMetadata({ surprise: true }), /unknown metadata field/);
  assert.throws(() => validateResourceMetadata({ linkStatus: "ok" }), /requires linkChecked/);
  assert.throws(() => validateResourceMetadata({ reviewed: "2026-02-31" }), /real YYYY-MM-DD/);
});

test("accepts controlled permission, risk, skill, artifact, and forensic-role classifications", () => {
  assert.doesNotThrow(() => validateResourceMetadata({
    authorization: ["isolated-lab", "explicit-scope"],
    operationalRisk: "high",
    skillLevel: "intermediate",
    artifactDomain: ["disk", "memory"],
    forensicRole: ["acquisition", "preservation", "analysis"],
  }));
});

test("rejects duplicate IDs, stale aliases, and alias collisions", () => {
  const base = { source: "first.md", id: "first", title: "First", url: "https://example.com/current", aliases: [] };
  assert.throws(() => validateResourceIdentities([base, { ...base, source: "second.md" }]), /duplicate resource id/);
  assert.throws(() => validateResourceIdentities([{ ...base, aliases: ["https://www.example.com/current/"] }]), /stale alias/);
  assert.throws(() => validateResourceIdentities([
    base,
    { source: "second.md", id: "second", title: "Second", url: "https://second.example/", aliases: ["https://example.com/current/"] },
  ]), /alias collides/);
});

test("accepts an HTTP alias when it records a former address", () => {
  assert.doesNotThrow(() => validateResourceMetadata({ aliases: ["http://legacy.example/path"] }));
});
