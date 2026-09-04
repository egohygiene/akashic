const JURISDICTION_KINDS = new Set(["district", "federal", "state", "territory", "tribal"]);
const RELATIONSHIP_CONTRACTS = new Map([
  ["federalism", { subjectKind: "state", counterpartKind: "federal" }],
  ["government-to-government", { subjectKind: "tribal", counterpartKind: "federal" }],
  ["seat-of-government", { subjectKind: "district", counterpartKind: "federal" }],
  ["territorial", { subjectKind: "territory", counterpartKind: "federal" }],
]);
const STABLE_ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const REVIEW_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const ATLAS_JURISDICTION_SCHEMA_VERSION = 1;

function rejectUnknownFields(value, allowedFields, context) {
  const unknownFields = Object.keys(value).filter((field) => !allowedFields.includes(field));
  if (unknownFields.length) throw new Error(`${context} contains unsupported fields: ${unknownFields.join(", ")}`);
}

function validateDate(value, context) {
  const parsed = new Date(`${value}T00:00:00Z`);
  if (!REVIEW_DATE_RE.test(value || "") || Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== value) throw new Error(`Invalid jurisdiction source date for ${context}.`);
}

function validateHttpsUrl(value, context) {
  let url;
  try { url = new URL(value); } catch {}
  if (url?.protocol !== "https:") throw new Error(`${context} must use an HTTPS source.`);
}

function validateSourceIds(sourceIds, sourceById, context) {
  if (!Array.isArray(sourceIds) || !sourceIds.length || new Set(sourceIds).size !== sourceIds.length || JSON.stringify(sourceIds) !== JSON.stringify([...sourceIds].sort())) throw new Error(`${context} must have unique, sorted source IDs.`);
  for (const sourceId of sourceIds) {
    if (!sourceById.has(sourceId)) throw new Error(`${context} references unknown source: ${sourceId}`);
  }
}

function resolveIdentifierReference(reference, countryRegistry, subdivisionRegistryById, context) {
  if (!reference || typeof reference !== "object" || Array.isArray(reference)) throw new Error(`${context} needs an identifier reference.`);
  rejectUnknownFields(reference, ["locationId", "registryId"], `${context} identifier reference`);
  if (!STABLE_ID_RE.test(reference.registryId || "") || !STABLE_ID_RE.test(reference.locationId || "")) throw new Error(`${context} has an invalid identifier reference.`);
  if (reference.registryId === countryRegistry?.id) return countryRegistry.countryByLocationId.get(reference.locationId) || null;
  return subdivisionRegistryById.get(reference.registryId)?.subdivisionByLocationId.get(reference.locationId) || null;
}

export function validateAtlasJurisdictions(manifest, { countryRegistry = null, locationById = new Map(), subdivisionRegistryById = new Map() } = {}) {
  if (manifest?.schemaVersion !== ATLAS_JURISDICTION_SCHEMA_VERSION || !Array.isArray(manifest.sources) || !Array.isArray(manifest.jurisdictions) || !Array.isArray(manifest.relationships)) throw new Error("Unsupported Atlas jurisdiction schema.");
  rejectUnknownFields(manifest, ["jurisdictions", "notice", "relationships", "schemaVersion", "sources"], "Atlas jurisdiction manifest");
  if (typeof manifest.notice !== "string" || !manifest.notice.includes("do not establish controlling law") || !manifest.notice.includes("resource applicability")) throw new Error("The Atlas jurisdiction manifest needs an explicit non-applicability notice.");

  const sourceById = new Map();
  for (const source of manifest.sources) {
    if (!source || typeof source !== "object" || Array.isArray(source)) throw new Error("Atlas jurisdiction sources must be objects.");
    rejectUnknownFields(source, ["id", "publisher", "retrieved", "sourceUrl"], `Atlas jurisdiction source ${source.id || "unknown"}`);
    if (!STABLE_ID_RE.test(source.id || "") || sourceById.has(source.id)) throw new Error(`Invalid or duplicate Atlas jurisdiction source ID: ${source.id || "missing"}`);
    if (typeof source.publisher !== "string" || !source.publisher.trim() || source.publisher !== source.publisher.trim()) throw new Error(`Invalid Atlas jurisdiction source publisher: ${source.id}`);
    validateHttpsUrl(source.sourceUrl, `Atlas jurisdiction source ${source.id}`);
    validateDate(source.retrieved, source.id);
    sourceById.set(source.id, source);
  }
  if (!sourceById.size) throw new Error("The Atlas jurisdiction manifest needs at least one source.");

  const jurisdictionById = new Map();
  const identifierKeys = new Set();
  for (const jurisdiction of manifest.jurisdictions) {
    if (!jurisdiction || typeof jurisdiction !== "object" || Array.isArray(jurisdiction)) throw new Error("Atlas jurisdictions must be objects.");
    const context = `Atlas jurisdiction ${jurisdiction.id || "unknown"}`;
    rejectUnknownFields(jurisdiction, ["atlasLocationId", "id", "identifierReference", "kind", "name", "sourceIds"], context);
    if (!STABLE_ID_RE.test(jurisdiction.id || "") || jurisdictionById.has(jurisdiction.id)) throw new Error(`Invalid or duplicate Atlas jurisdiction ID: ${jurisdiction.id || "missing"}`);
    if (typeof jurisdiction.name !== "string" || !jurisdiction.name.trim() || jurisdiction.name !== jurisdiction.name.trim()) throw new Error(`Invalid Atlas jurisdiction name: ${jurisdiction.id}`);
    if (!JURISDICTION_KINDS.has(jurisdiction.kind)) throw new Error(`Unsupported Atlas jurisdiction kind for ${jurisdiction.id}: ${jurisdiction.kind || "missing"}`);
    validateSourceIds(jurisdiction.sourceIds, sourceById, context);

    if (jurisdiction.kind === "tribal") {
      if (jurisdiction.identifierReference !== undefined || jurisdiction.atlasLocationId !== undefined) throw new Error(`Tribal jurisdiction ${jurisdiction.id} must not be inferred from an Atlas place or subdivision registry.`);
    } else {
      const registeredIdentifier = resolveIdentifierReference(jurisdiction.identifierReference, countryRegistry, subdivisionRegistryById, context);
      if (!registeredIdentifier) throw new Error(`${context} references an unknown authoritative identifier.`);
      const expectedIdentifierLocationId = jurisdiction.atlasLocationId || jurisdiction.id;
      if (jurisdiction.identifierReference.locationId !== expectedIdentifierLocationId) throw new Error(`${context} identity does not match its Atlas reference.`);
      const identifierKey = `${jurisdiction.identifierReference.registryId}\u0000${jurisdiction.identifierReference.locationId}`;
      if (identifierKeys.has(identifierKey)) throw new Error(`${context} duplicates an authoritative identifier reference.`);
      identifierKeys.add(identifierKey);
    }
    if (jurisdiction.atlasLocationId !== undefined && !locationById.has(jurisdiction.atlasLocationId)) throw new Error(`${context} references an Atlas location that is not materialized: ${jurisdiction.atlasLocationId}`);
    jurisdictionById.set(jurisdiction.id, jurisdiction);
  }
  if (!jurisdictionById.size) throw new Error("The Atlas jurisdiction manifest needs at least one jurisdiction.");

  const relationshipKeys = new Set();
  const relationships = manifest.relationships.map((relationship, index) => {
    const context = `Atlas jurisdiction relationship ${index + 1}`;
    if (!relationship || typeof relationship !== "object" || Array.isArray(relationship)) throw new Error(`${context} must be an object.`);
    rejectUnknownFields(relationship, ["counterpartJurisdictionId", "kind", "sourceIds", "subjectJurisdictionId"], context);
    const contract = RELATIONSHIP_CONTRACTS.get(relationship.kind);
    if (!contract) throw new Error(`${context} has an unsupported kind: ${relationship.kind || "missing"}`);
    const subject = jurisdictionById.get(relationship.subjectJurisdictionId);
    const counterpart = jurisdictionById.get(relationship.counterpartJurisdictionId);
    if (!subject || !counterpart || subject.id === counterpart.id) throw new Error(`${context} references missing or identical jurisdictions.`);
    if (subject.kind !== contract.subjectKind || counterpart.kind !== contract.counterpartKind) throw new Error(`${context} does not match the ${relationship.kind} kind contract.`);
    validateSourceIds(relationship.sourceIds, sourceById, context);
    const key = `${subject.id}\u0000${relationship.kind}\u0000${counterpart.id}`;
    if (relationshipKeys.has(key)) throw new Error(`Duplicate Atlas jurisdiction relationship: ${subject.id} / ${relationship.kind} / ${counterpart.id}`);
    relationshipKeys.add(key);
    return { id: `${subject.id}:${relationship.kind}:${counterpart.id}`, ...relationship };
  });

  return {
    schemaVersion: manifest.schemaVersion,
    notice: manifest.notice,
    sources: manifest.sources,
    jurisdictions: manifest.jurisdictions,
    relationships,
    jurisdictionById,
  };
}
