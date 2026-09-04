const ACCESSIBILITY_STATUSES = new Set(["documented", "partial", "unknown"]);
const ARCHIVAL_STATUSES = new Set(["archival", "current", "mixed", "unknown"]);
const AUTHORITY_STATUSES = new Set(["official", "official-informational", "unofficial", "unknown"]);
const COVERAGE_STATUSES = new Set(["covered", "deferred", "known-gap", "not-applicable"]);
const CURRENTNESS_STATUSES = new Set(["current", "historical", "mixed", "unknown"]);
const REVIEW_STATUSES = new Set(["human-reviewed", "pending-human"]);
const STABLE_ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const REVIEWER_RE = /^[a-z0-9](?:[a-z0-9-]{0,37}[a-z0-9])?$/i;

export const ATLAS_JURISDICTION_SOURCE_SCHEMA_VERSION = 1;
export const LEGAL_SOURCE_COVERAGE_ROLES = Object.freeze([
  "foundational-law",
  "legislature",
  "bills",
  "session-laws",
  "codified-statutes",
  "administrative-code",
  "administrative-register",
  "court-hierarchy",
  "court-opinions",
  "court-rules",
  "court-self-help",
  "court-forms",
  "language-access",
  "disability-access",
  "attorney-licensing",
  "attorney-discipline",
  "lawyer-lookup",
  "civil-legal-aid",
  "public-defense",
  "attorney-general",
  "consumer-protection",
  "civil-rights-enforcement",
  "public-records",
  "law-library",
  "authenticated-source",
  "archival-source",
]);

function rejectUnknownFields(value, allowedFields, context) {
  const unknownFields = Object.keys(value).filter((field) => !allowedFields.includes(field));
  if (unknownFields.length) throw new Error(`${context} contains unsupported fields: ${unknownFields.join(", ")}`);
}

function validateDate(value, context) {
  const parsed = new Date(`${value}T00:00:00Z`);
  if (!DATE_RE.test(value || "") || Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== value) throw new Error(`Invalid jurisdiction-source date for ${context}.`);
}

function validateCoverageEntry(entry, index, catalogResourceById) {
  const context = `Jurisdiction-source coverage entry ${index + 1}`;
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) throw new Error(`${context} must be an object.`);
  rejectUnknownFields(entry, ["note", "resourceIds", "role", "status"], context);
  if (!LEGAL_SOURCE_COVERAGE_ROLES.includes(entry.role)) throw new Error(`${context} has an unsupported role: ${entry.role || "missing"}`);
  if (!COVERAGE_STATUSES.has(entry.status)) throw new Error(`${context} has an unsupported status: ${entry.status || "missing"}`);
  const resourceIds = entry.resourceIds || [];
  if (!Array.isArray(resourceIds) || new Set(resourceIds).size !== resourceIds.length || JSON.stringify(resourceIds) !== JSON.stringify([...resourceIds].sort())) throw new Error(`${context} must have unique, sorted resource IDs.`);
  if (entry.status === "covered" && !resourceIds.length) throw new Error(`${context} marked covered must reference a resource.`);
  if (["deferred", "not-applicable"].includes(entry.status) && resourceIds.length) throw new Error(`${context} marked ${entry.status} must not reference resources.`);
  if (entry.status !== "covered" && (typeof entry.note !== "string" || !entry.note.trim() || entry.note !== entry.note.trim())) throw new Error(`${context} marked ${entry.status} needs an explanatory note.`);
  for (const resourceId of resourceIds) {
    if (!STABLE_ID_RE.test(resourceId || "")) throw new Error(`${context} has an invalid resource ID: ${resourceId || "missing"}`);
    const resource = catalogResourceById.get(resourceId);
    if (!resource) throw new Error(`${context} references a resource outside the main catalog: ${resourceId}`);
    if (resource.idOrigin !== "explicit") throw new Error(`${context} must use an explicit resource ID: ${resourceId}`);
  }
  return resourceIds;
}

function validateResourceAssessment(assessment, profile, catalogResourceById) {
  const context = `Jurisdiction-source assessment ${assessment?.resourceId || "unknown"}`;
  if (!assessment || typeof assessment !== "object" || Array.isArray(assessment)) throw new Error(`${context} must be an object.`);
  rejectUnknownFields(assessment, ["accessibilityStatus", "archivalStatus", "authorityStatus", "currentnessStatus", "observed", "resourceId"], context);
  if (!catalogResourceById.has(assessment.resourceId)) throw new Error(`${context} references a resource outside the main catalog.`);
  if (!AUTHORITY_STATUSES.has(assessment.authorityStatus)) throw new Error(`${context} has an unsupported authority status.`);
  if (!CURRENTNESS_STATUSES.has(assessment.currentnessStatus)) throw new Error(`${context} has an unsupported currentness status.`);
  if (!ACCESSIBILITY_STATUSES.has(assessment.accessibilityStatus)) throw new Error(`${context} has an unsupported accessibility status.`);
  if (!ARCHIVAL_STATUSES.has(assessment.archivalStatus)) throw new Error(`${context} has an unsupported archival status.`);
  validateDate(assessment.observed, assessment.resourceId);
  if (assessment.observed !== profile.observationDate) throw new Error(`${context} does not match the profile observation date.`);
}

export function validateJurisdictionSourceCoverage(manifest, { catalogResourceById = new Map(), jurisdictionById = new Map() } = {}) {
  if (manifest?.schemaVersion !== ATLAS_JURISDICTION_SOURCE_SCHEMA_VERSION || !Array.isArray(manifest.profiles)) throw new Error("Unsupported Atlas jurisdiction-source schema.");
  rejectUnknownFields(manifest, ["notice", "profiles", "schemaVersion"], "Atlas jurisdiction-source manifest");
  if (typeof manifest.notice !== "string" || !manifest.notice.includes("do not determine controlling law") || !manifest.notice.includes("legal applicability")) throw new Error("The jurisdiction-source manifest needs an explicit non-applicability notice.");

  const jurisdictionIds = new Set();
  for (const profile of manifest.profiles) {
    const context = `Jurisdiction-source profile ${profile?.jurisdictionId || "unknown"}`;
    if (!profile || typeof profile !== "object" || Array.isArray(profile)) throw new Error(`${context} must be an object.`);
    rejectUnknownFields(profile, ["coverage", "jurisdictionId", "observationDate", "resources", "reviewStatus", "reviewedBy"], context);
    if (!jurisdictionById.has(profile.jurisdictionId)) throw new Error(`${context} references an unknown jurisdiction.`);
    if (jurisdictionIds.has(profile.jurisdictionId)) throw new Error(`Duplicate jurisdiction-source profile: ${profile.jurisdictionId}`);
    jurisdictionIds.add(profile.jurisdictionId);
    validateDate(profile.observationDate, profile.jurisdictionId);
    if (!REVIEW_STATUSES.has(profile.reviewStatus)) throw new Error(`${context} has an unsupported review status.`);
    if (profile.reviewStatus === "human-reviewed") {
      if (!REVIEWER_RE.test(profile.reviewedBy || "")) throw new Error(`${context} needs a GitHub reviewer for human-reviewed coverage.`);
    } else if (profile.reviewedBy !== undefined) throw new Error(`${context} must not claim a reviewer while human review is pending.`);

    if (!Array.isArray(profile.coverage) || JSON.stringify(profile.coverage.map((entry) => entry.role)) !== JSON.stringify(LEGAL_SOURCE_COVERAGE_ROLES)) throw new Error(`${context} must contain the complete ordered legal-source role template.`);
    const referencedResourceIds = new Set();
    profile.coverage.forEach((entry, index) => {
      for (const resourceId of validateCoverageEntry(entry, index, catalogResourceById)) referencedResourceIds.add(resourceId);
    });

    if (!Array.isArray(profile.resources) || profile.resources.some((assessment) => !assessment || typeof assessment !== "object" || Array.isArray(assessment))) throw new Error(`${context} must contain resource assessment objects.`);
    if (JSON.stringify(profile.resources.map((assessment) => assessment.resourceId)) !== JSON.stringify([...profile.resources.map((assessment) => assessment.resourceId)].sort())) throw new Error(`${context} must have sorted resource assessments.`);
    const assessedResourceIds = new Set();
    for (const assessment of profile.resources) {
      validateResourceAssessment(assessment, profile, catalogResourceById);
      if (assessedResourceIds.has(assessment.resourceId)) throw new Error(`${context} contains a duplicate resource assessment: ${assessment.resourceId}`);
      assessedResourceIds.add(assessment.resourceId);
    }
    if (referencedResourceIds.size !== assessedResourceIds.size || [...referencedResourceIds].some((resourceId) => !assessedResourceIds.has(resourceId))) throw new Error(`${context} resource assessments do not match its coverage references.`);
  }
  if (!jurisdictionIds.size) throw new Error("The jurisdiction-source manifest needs at least one profile.");
  return manifest;
}
