const ATLAS_ASSOCIATION_RELATIONSHIPS = new Set(["cross-associated", "specific"]);
const ATLAS_ROLES = new Set(["index", "resource"]);
const PROVENANCE_KINDS = new Set(["human-review", "migration"]);
const STABLE_ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const REVIEW_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const REVIEWER_RE = /^[a-z0-9](?:[a-z0-9-]{0,37}[a-z0-9])?$/i;

function rejectUnknownFields(value, allowedFields, context) {
  const unknownFields = Object.keys(value).filter((field) => !allowedFields.includes(field));
  if (unknownFields.length) throw new Error(`${context} contains unsupported fields: ${unknownFields.join(", ")}`);
}

function validateReviewDate(value, context) {
  const parsed = new Date(`${value}T00:00:00Z`);
  if (!REVIEW_DATE_RE.test(value || "") || Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== value) throw new Error(`Invalid Atlas review date for ${context}.`);
}

function validateProvenance(entry) {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) throw new Error("Atlas applicability provenance entries must be objects.");
  if (!STABLE_ID_RE.test(entry.id || "")) throw new Error(`Invalid Atlas provenance ID: ${entry.id || "missing"}`);
  if (!PROVENANCE_KINDS.has(entry.kind)) throw new Error(`Unsupported Atlas provenance kind for ${entry.id}: ${entry.kind || "missing"}`);
  if (entry.kind === "migration") {
    rejectUnknownFields(entry, ["id", "kind", "source"], `Atlas provenance ${entry.id}`);
    if (!/^atlas\/[a-z0-9./-]+$/i.test(entry.source || "") || entry.source.includes("..")) throw new Error(`Invalid Atlas migration source for ${entry.id}.`);
    return;
  }
  rejectUnknownFields(entry, ["id", "kind", "reviewed", "reviewedBy", "sourceUrl"], `Atlas provenance ${entry.id}`);
  let sourceUrl;
  try { sourceUrl = new URL(entry.sourceUrl); } catch {}
  if (sourceUrl?.protocol !== "https:") throw new Error(`Atlas human-review provenance must use an HTTPS source for ${entry.id}.`);
  validateReviewDate(entry.reviewed, entry.id);
  if (!REVIEWER_RE.test(entry.reviewedBy || "")) throw new Error(`Invalid Atlas reviewer for ${entry.id}.`);
}

export function validateAtlasHierarchy(hierarchy) {
  if (hierarchy.schemaVersion !== 2 || !Array.isArray(hierarchy.locations)) throw new Error("Unsupported atlas location schema.");
  const locationById = new Map(hierarchy.locations.map((location) => [location.id, location]));
  if (locationById.size !== hierarchy.locations.length) throw new Error("The atlas contains duplicate location IDs.");
  if (!locationById.has(hierarchy.rootId)) throw new Error("The atlas root location does not exist.");
  for (const location of hierarchy.locations) {
    if (location.catalogResources !== undefined) throw new Error(`Atlas catalog applicability belongs in atlas/applicability.json, not locations.json (${location.id || "unknown"}).`);
    if (!location.id || !location.name || !location.kind || !location.geometry || !location.camera) throw new Error(`Incomplete atlas location: ${location.id || "unknown"}`);
    if (location.geometry.dataset === "point") {
      const validCoordinates = Array.isArray(location.geometry.coordinates) && location.geometry.coordinates.length === 2 && location.geometry.coordinates.every(Number.isFinite);
      const validMapPosition = Array.isArray(location.geometry.mapPosition) && location.geometry.mapPosition.length === 2 && location.geometry.mapPosition.every((value) => Number.isFinite(value) && value >= 0 && value <= 1);
      if (!validCoordinates || !validMapPosition) throw new Error(`Invalid atlas point geometry for ${location.id}.`);
    }
    if (location.parentId && !locationById.has(location.parentId)) throw new Error(`Unknown atlas parent ${location.parentId} for ${location.id}.`);
    location.children = hierarchy.locations.filter((candidate) => candidate.parentId === location.id).map((candidate) => candidate.id);
    const visited = new Set([location.id]);
    let parentId = location.parentId;
    while (parentId) {
      if (visited.has(parentId)) throw new Error(`Atlas hierarchy cycle detected at ${location.id}.`);
      visited.add(parentId);
      parentId = locationById.get(parentId).parentId;
    }
  }
  return locationById;
}

export function validateAtlasApplicability(manifest, locationById, catalogResourceById) {
  if (manifest?.schemaVersion !== 1 || !Array.isArray(manifest.provenance) || !Array.isArray(manifest.associations)) throw new Error("Unsupported atlas applicability schema.");
  rejectUnknownFields(manifest, ["schemaVersion", "provenance", "associations"], "Atlas applicability manifest");
  if (!manifest.provenance.length) throw new Error("Atlas applicability needs at least one provenance entry.");

  const provenanceById = new Map();
  for (const entry of manifest.provenance) {
    validateProvenance(entry);
    if (provenanceById.has(entry.id)) throw new Error(`Duplicate Atlas provenance ID: ${entry.id}`);
    provenanceById.set(entry.id, entry);
  }

  const associationKeys = new Set();
  return manifest.associations.map((association, index) => {
    const context = `Atlas applicability association ${index + 1}`;
    if (!association || typeof association !== "object" || Array.isArray(association)) throw new Error(`${context} must be an object.`);
    rejectUnknownFields(association, ["locationId", "provenanceId", "relationship", "resourceId", "role", "section"], context);
    if (!STABLE_ID_RE.test(association.resourceId || "")) throw new Error(`${context} has an invalid resourceId.`);
    if (!STABLE_ID_RE.test(association.locationId || "") || !locationById.has(association.locationId)) throw new Error(`${context} references unknown Atlas location: ${association.locationId || "missing"}`);
    if (!ATLAS_ASSOCIATION_RELATIONSHIPS.has(association.relationship)) throw new Error(`${context} has an unsupported relationship: ${association.relationship || "missing"}`);
    if (typeof association.section !== "string" || !association.section.trim() || association.section !== association.section.trim()) throw new Error(`${context} has an invalid section.`);
    const role = association.role || "resource";
    if (!ATLAS_ROLES.has(role)) throw new Error(`${context} has an unsupported role: ${role}`);
    const provenance = provenanceById.get(association.provenanceId);
    if (!provenance) throw new Error(`${context} references unknown provenance: ${association.provenanceId || "missing"}`);
    const catalogResource = catalogResourceById.get(association.resourceId);
    if (!catalogResource) throw new Error(`${context} references a resource outside the main catalog: ${association.resourceId}`);
    if (catalogResource.idOrigin !== "explicit") throw new Error(`${context} must use an explicit resource ID: ${association.resourceId}`);
    const associationKey = `${association.locationId}\u0000${association.resourceId}`;
    if (associationKeys.has(associationKey)) throw new Error(`Duplicate Atlas applicability association: ${association.locationId} / ${association.resourceId}`);
    associationKeys.add(associationKey);
    return { ...association, role, provenance };
  });
}
