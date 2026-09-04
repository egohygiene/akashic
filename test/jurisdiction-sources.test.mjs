import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { ATLAS_JURISDICTION_SOURCE_SCHEMA_VERSION, LEGAL_SOURCE_COVERAGE_ROLES, validateJurisdictionSourceCoverage } from "../scripts/lib/jurisdiction-sources.mjs";

const manifestFixture = JSON.parse(await readFile(new URL("../atlas/jurisdiction-sources.json", import.meta.url), "utf8"));
const catalogResourceById = new Map(manifestFixture.profiles[0].resources.map(({ resourceId }) => [resourceId, { id: resourceId, idOrigin: "explicit" }]));
const jurisdictionById = new Map([
  ["us-federal", { id: "us-federal", kind: "federal" }],
]);

function validate(manifest = manifestFixture) {
  return validateJurisdictionSourceCoverage(manifest, { catalogResourceById, jurisdictionById });
}

test("validates a complete federal jurisdiction-source proof profile", () => {
  const result = validate();
  assert.equal(result.schemaVersion, ATLAS_JURISDICTION_SOURCE_SCHEMA_VERSION);
  assert.equal(result.profiles[0].coverage.length, LEGAL_SOURCE_COVERAGE_ROLES.length);
  assert.deepEqual(new Set(result.profiles[0].coverage.map((entry) => entry.status)), new Set(["covered", "deferred", "known-gap"]));
  assert.equal(result.profiles[0].reviewStatus, "pending-human");
});

test("rejects incomplete coverage templates and unsupported status claims", () => {
  const incomplete = structuredClone(manifestFixture);
  incomplete.profiles[0].coverage.pop();
  assert.throws(() => validate(incomplete), /complete ordered legal-source role template/);

  const unsupported = structuredClone(manifestFixture);
  unsupported.profiles[0].coverage[0].status = "probably-covered";
  assert.throws(() => validate(unsupported), /unsupported status/);
});

test("requires explicit catalog identity and matching source assessments", () => {
  const derivedCatalog = new Map(catalogResourceById);
  const resourceId = manifestFixture.profiles[0].coverage.find((entry) => entry.status === "covered").resourceIds[0];
  derivedCatalog.set(resourceId, { ...derivedCatalog.get(resourceId), idOrigin: "derived" });
  assert.throws(() => validateJurisdictionSourceCoverage(manifestFixture, { catalogResourceById: derivedCatalog, jurisdictionById }), /must use an explicit resource ID/);

  const missingAssessment = structuredClone(manifestFixture);
  missingAssessment.profiles[0].resources.pop();
  assert.throws(() => validate(missingAssessment), /resource assessments do not match/);
});

test("keeps machine observations distinct from human review", () => {
  const falseReviewer = structuredClone(manifestFixture);
  falseReviewer.profiles[0].reviewedBy = "reviewer";
  assert.throws(() => validate(falseReviewer), /must not claim a reviewer/);

  const reviewed = structuredClone(manifestFixture);
  reviewed.profiles[0].reviewStatus = "human-reviewed";
  reviewed.profiles[0].reviewedBy = "reviewer";
  assert.equal(validate(reviewed).profiles[0].reviewedBy, "reviewer");
});

test("allows explicit known gaps and not-applicable roles without inventing resources", () => {
  const manifest = structuredClone(manifestFixture);
  const deferred = manifest.profiles[0].coverage.find((entry) => entry.status === "deferred");
  deferred.status = "not-applicable";
  deferred.note = "A reviewed jurisdiction may record that this role does not apply to its legal system.";
  assert.equal(validate(manifest).profiles[0].coverage.find((entry) => entry.role === deferred.role).status, "not-applicable");
});
