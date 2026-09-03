const ATLAS_ASSOCIATION_RELATIONSHIPS = new Set(["cross-associated", "specific"]);
const ATLAS_LOCATION_KINDS = new Set(["country", "locality", "region", "world"]);
const ATLAS_ROLES = new Set(["index", "resource"]);
const ATLAS_SUBDIVISION_TYPES = new Set(["district", "state", "territory", "territory-group"]);
const PROVENANCE_KINDS = new Set(["human-review", "migration"]);
const STABLE_ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ISO_ALPHA_2_RE = /^[A-Z]{2}$/;
const ISO_NUMERIC_RE = /^\d{3}$/;
const POSTAL_CODE_RE = /^[A-Z]{2}$/;
const CENSUS_FIPS_RE = /^\d{2}$/;
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

function validCoordinatePair(value) {
  return Array.isArray(value)
    && value.length === 2
    && Number.isFinite(value[0])
    && value[0] >= -180
    && value[0] <= 180
    && Number.isFinite(value[1])
    && value[1] >= -90
    && value[1] <= 90;
}

export function atlasTopologyGeometryIds(topology, objectName, { allowMissing = false } = {}) {
  if (topology?.type !== "Topology" || !topology.objects || !Array.isArray(topology.arcs)) throw new Error(`Invalid Atlas topology for ${objectName}.`);
  const object = topology.objects[objectName];
  if (!object) throw new Error(`Atlas topology is missing ${objectName}.`);
  const geometries = object.type === "GeometryCollection" ? object.geometries : [object];
  const missingIdCount = geometries.filter((geometry) => geometry.id === undefined || geometry.id === null || String(geometry.id) === "").length;
  const ids = geometries.filter((geometry) => geometry.id !== undefined && geometry.id !== null && String(geometry.id) !== "").map((geometry) => String(geometry.id));
  if ((!allowMissing && missingIdCount) || new Set(ids).size !== ids.length) throw new Error(`Atlas topology ${objectName} has missing or duplicate geometry IDs.`);
  return new Set(ids);
}

export function validateAtlasCountryRegistry(registry, geometryIdsByDataset = new Map()) {
  if (registry?.schemaVersion !== 1 || registry.kind !== "countries" || !Array.isArray(registry.countries)) throw new Error("Unsupported Atlas country registry schema.");
  rejectUnknownFields(registry, ["countries", "id", "kind", "schemaVersion", "sourceRetrieved", "sourceUrl"], "Atlas country registry");
  if (!STABLE_ID_RE.test(registry.id || "")) throw new Error("The Atlas country registry ID must be a stable ID.");
  let sourceUrl;
  try { sourceUrl = new URL(registry.sourceUrl); } catch {}
  if (sourceUrl?.protocol !== "https:") throw new Error(`Atlas country registry ${registry.id} must use an HTTPS source.`);
  validateReviewDate(registry.sourceRetrieved, registry.id);

  const countryByLocationId = new Map();
  const alpha2Codes = new Set();
  const numericCodes = new Set();
  for (const country of registry.countries) {
    if (!country || typeof country !== "object" || Array.isArray(country)) throw new Error(`Atlas country registry ${registry.id} entries must be objects.`);
    rejectUnknownFields(country, ["geometry", "isoAlpha2", "isoNumeric", "locationId"], `Atlas country ${country.locationId || "unknown"}`);
    if (!ISO_ALPHA_2_RE.test(country.isoAlpha2 || "") || !ISO_NUMERIC_RE.test(country.isoNumeric || "") || country.locationId !== country.isoAlpha2.toLocaleLowerCase("en-US")) throw new Error(`Invalid Atlas country identifiers for ${country.locationId || "missing"}.`);
    if (countryByLocationId.has(country.locationId) || alpha2Codes.has(country.isoAlpha2) || numericCodes.has(country.isoNumeric)) throw new Error(`Duplicate Atlas country identifiers for ${country.locationId}.`);
    if (!country.geometry || typeof country.geometry !== "object" || Array.isArray(country.geometry)) throw new Error(`Invalid Atlas country geometry for ${country.locationId}.`);
    rejectUnknownFields(country.geometry, ["dataset", "id"], `Atlas country geometry ${country.locationId}`);
    if (country.geometry.dataset !== "world" || country.geometry.id !== country.isoNumeric || !geometryIdsByDataset.get("world")?.has(country.geometry.id)) throw new Error(`Unknown or mismatched Atlas country geometry for ${country.locationId}.`);
    countryByLocationId.set(country.locationId, country);
    alpha2Codes.add(country.isoAlpha2);
    numericCodes.add(country.isoNumeric);
  }
  if (!countryByLocationId.size) throw new Error(`Atlas country registry ${registry.id} is empty.`);
  return { ...registry, countryByLocationId };
}

export function validateAtlasSubdivisionRegistry(registry, geometryIdsByDataset = new Map()) {
  if (registry?.schemaVersion !== 1 || registry.kind !== "subdivisions" || !Array.isArray(registry.subdivisions)) throw new Error("Unsupported Atlas subdivision registry schema.");
  rejectUnknownFields(registry, ["completeGeometryDatasets", "countryId", "id", "kind", "schemaVersion", "sourceRetrieved", "sourceUrl", "subdivisions"], "Atlas subdivision registry");
  if (!STABLE_ID_RE.test(registry.id || "") || !STABLE_ID_RE.test(registry.countryId || "")) throw new Error("Atlas subdivision registry IDs must be stable IDs.");
  if (!Array.isArray(registry.completeGeometryDatasets) || new Set(registry.completeGeometryDatasets).size !== registry.completeGeometryDatasets.length || registry.completeGeometryDatasets.some((dataset) => !STABLE_ID_RE.test(dataset || "")) || JSON.stringify(registry.completeGeometryDatasets) !== JSON.stringify([...registry.completeGeometryDatasets].sort())) throw new Error(`Atlas subdivision registry ${registry.id} has invalid complete geometry datasets.`);
  let sourceUrl;
  try { sourceUrl = new URL(registry.sourceUrl); } catch {}
  if (sourceUrl?.protocol !== "https:") throw new Error(`Atlas subdivision registry ${registry.id} must use an HTTPS source.`);
  validateReviewDate(registry.sourceRetrieved, registry.id);

  const subdivisionByLocationId = new Map();
  const postalCodes = new Set();
  const censusFipsCodes = new Set();
  const geometryKeys = new Set();
  for (const subdivision of registry.subdivisions) {
    if (!subdivision || typeof subdivision !== "object" || Array.isArray(subdivision)) throw new Error(`Atlas subdivision registry ${registry.id} entries must be objects.`);
    rejectUnknownFields(subdivision, ["censusFips", "geometry", "locationId", "name", "postalCode", "type"], `Atlas subdivision ${subdivision.locationId || "unknown"}`);
    if (!STABLE_ID_RE.test(subdivision.locationId || "") || subdivision.locationId !== `${registry.countryId}-${String(subdivision.postalCode || "").toLocaleLowerCase("en-US")}`) throw new Error(`Invalid Atlas subdivision location ID: ${subdivision.locationId || "missing"}`);
    if (typeof subdivision.name !== "string" || !subdivision.name.trim() || subdivision.name !== subdivision.name.trim()) throw new Error(`Invalid Atlas subdivision name: ${subdivision.locationId}`);
    if (!ATLAS_SUBDIVISION_TYPES.has(subdivision.type)) throw new Error(`Invalid Atlas subdivision type for ${subdivision.locationId}.`);
    if (!POSTAL_CODE_RE.test(subdivision.postalCode || "") || postalCodes.has(subdivision.postalCode)) throw new Error(`Invalid or duplicate Atlas subdivision postal code: ${subdivision.postalCode || "missing"}`);
    if (!CENSUS_FIPS_RE.test(subdivision.censusFips || "") || censusFipsCodes.has(subdivision.censusFips)) throw new Error(`Invalid or duplicate Atlas subdivision Census FIPS code: ${subdivision.censusFips || "missing"}`);
    if (subdivisionByLocationId.has(subdivision.locationId)) throw new Error(`Duplicate Atlas subdivision location ID: ${subdivision.locationId}`);
    postalCodes.add(subdivision.postalCode);
    censusFipsCodes.add(subdivision.censusFips);
    subdivisionByLocationId.set(subdivision.locationId, subdivision);

    if (subdivision.geometry === null) continue;
    if (!subdivision.geometry || typeof subdivision.geometry !== "object" || Array.isArray(subdivision.geometry)) throw new Error(`Invalid Atlas subdivision geometry for ${subdivision.locationId}.`);
    rejectUnknownFields(subdivision.geometry, ["dataset", "id"], `Atlas subdivision geometry ${subdivision.locationId}`);
    if (!STABLE_ID_RE.test(subdivision.geometry.dataset || "") || typeof subdivision.geometry.id !== "string" || !subdivision.geometry.id) throw new Error(`Invalid Atlas subdivision geometry for ${subdivision.locationId}.`);
    if (subdivision.geometry.dataset === "us-states" && subdivision.geometry.id !== subdivision.censusFips) throw new Error(`Atlas subdivision geometry does not match the Census FIPS code for ${subdivision.locationId}.`);
    const geometryKey = `${subdivision.geometry.dataset}\u0000${subdivision.geometry.id}`;
    if (geometryKeys.has(geometryKey)) throw new Error(`Duplicate Atlas subdivision geometry: ${subdivision.geometry.dataset} / ${subdivision.geometry.id}`);
    geometryKeys.add(geometryKey);
    const geometryIds = geometryIdsByDataset.get(subdivision.geometry.dataset);
    if (!geometryIds || !geometryIds.has(subdivision.geometry.id)) throw new Error(`Unknown Atlas geometry for ${subdivision.locationId}: ${subdivision.geometry.dataset} / ${subdivision.geometry.id}`);
  }
  if (!subdivisionByLocationId.size) throw new Error(`Atlas subdivision registry ${registry.id} is empty.`);
  for (const dataset of registry.completeGeometryDatasets) {
    const geometryIds = geometryIdsByDataset.get(dataset);
    if (!geometryIds) throw new Error(`Atlas subdivision registry ${registry.id} cannot verify complete dataset ${dataset}.`);
    const registeredIds = new Set(registry.subdivisions.filter((subdivision) => subdivision.geometry?.dataset === dataset).map((subdivision) => subdivision.geometry.id));
    if (registeredIds.size !== geometryIds.size || [...geometryIds].some((id) => !registeredIds.has(id))) throw new Error(`Atlas subdivision registry ${registry.id} does not completely cover geometry dataset ${dataset}.`);
  }
  return { ...registry, subdivisionByLocationId };
}

export function mergeAtlasLocationSources(manifest, includedDocumentsByPath) {
  if (manifest?.schemaVersion !== 2 || !Array.isArray(manifest.includes) || !Array.isArray(manifest.locations)) throw new Error("Unsupported Atlas location manifest schema.");
  rejectUnknownFields(manifest, ["includes", "locations", "rootId", "schemaVersion"], "Atlas location manifest");
  if (!(includedDocumentsByPath instanceof Map)) throw new Error("Atlas included location documents must be provided by path.");
  if (new Set(manifest.includes).size !== manifest.includes.length) throw new Error("Atlas location manifest contains duplicate includes.");
  if (JSON.stringify(manifest.includes) !== JSON.stringify([...manifest.includes].sort())) throw new Error("Atlas location manifest includes must be sorted.");
  if (manifest.locations.length !== 1 || manifest.locations[0]?.id !== manifest.rootId) throw new Error("The Atlas location manifest must contain only its root location.");
  const locations = manifest.locations.map((location) => ({ ...location, source: "atlas/locations.json" }));
  for (const includePath of manifest.includes) {
    const countryId = includePath.match(/^locations\/([a-z0-9-]+)\.json$/)?.[1];
    if (!countryId) throw new Error(`Invalid Atlas location include path: ${includePath}`);
    const document = includedDocumentsByPath.get(includePath);
    if (document?.schemaVersion !== 1 || !Array.isArray(document.locations)) throw new Error(`Unsupported Atlas included location schema: ${includePath}`);
    rejectUnknownFields(document, ["locations", "schemaVersion"], `Atlas included locations ${includePath}`);
    if (document.locations.filter((location) => location?.id === countryId && location.kind === "country").length !== 1 || document.locations.some((location) => typeof location?.id !== "string" || (location.id !== countryId && !location.id.startsWith(`${countryId}-`)))) throw new Error(`Atlas location include ${includePath} must contain exactly one matching country and only its descendants.`);
    locations.push(...document.locations.map((location) => ({ ...location, source: `atlas/${includePath}` })));
  }
  return { schemaVersion: manifest.schemaVersion, rootId: manifest.rootId, locations };
}

export function validateAtlasHierarchy(hierarchy, { countryRegistry = null, geometryIdsByDataset = new Map(), subdivisionRegistryById = new Map() } = {}) {
  if (hierarchy?.schemaVersion !== 2 || !Array.isArray(hierarchy.locations)) throw new Error("Unsupported atlas location schema.");
  rejectUnknownFields(hierarchy, ["locations", "rootId", "schemaVersion"], "Atlas location hierarchy");
  if (!STABLE_ID_RE.test(hierarchy.rootId || "")) throw new Error("The atlas root location ID is invalid.");
  if (hierarchy.locations.some((location) => !location || typeof location !== "object" || Array.isArray(location))) throw new Error("Atlas locations must be objects.");
  const locationById = new Map(hierarchy.locations.map((location) => [location.id, location]));
  if (locationById.size !== hierarchy.locations.length) throw new Error("The atlas contains duplicate location IDs.");
  if (!locationById.has(hierarchy.rootId)) throw new Error("The atlas root location does not exist.");
  const childrenByParentId = new Map();
  for (const location of hierarchy.locations) {
    if (location.catalogResources !== undefined) throw new Error(`Atlas catalog applicability belongs in atlas/applicability.json, not locations.json (${location.id || "unknown"}).`);
    rejectUnknownFields(location, ["camera", "geometry", "id", "identifiers", "kind", "name", "parentId", "shortName", "source"], `Atlas location ${location.id || "unknown"}`);
    if (!STABLE_ID_RE.test(location.id || "") || typeof location.name !== "string" || !location.name.trim() || location.name !== location.name.trim() || typeof location.shortName !== "string" || !location.shortName.trim() || location.shortName !== location.shortName.trim() || !ATLAS_LOCATION_KINDS.has(location.kind) || !location.geometry || !location.camera) throw new Error(`Incomplete or invalid atlas location: ${location.id || "unknown"}`);
    if (location.source !== undefined && !/^atlas\/locations(?:\/[a-z0-9-]+)?\.json$/.test(location.source)) throw new Error(`Invalid atlas location source for ${location.id}.`);
    rejectUnknownFields(location.camera, ["center", "zoom"], `Atlas camera ${location.id}`);
    if (!validCoordinatePair(location.camera.center) || !Number.isFinite(location.camera.zoom) || location.camera.zoom <= 0) throw new Error(`Invalid atlas camera for ${location.id}.`);
    if (location.id === hierarchy.rootId) {
      if (location.kind !== "world" || location.parentId !== null || location.geometry.dataset !== "world" || location.geometry.id !== null || location.identifiers !== undefined) throw new Error("The atlas root location must be the unnumbered world geometry.");
      rejectUnknownFields(location.geometry, ["dataset", "id"], `Atlas geometry ${location.id}`);
    } else if (location.kind === "country") {
      if (location.parentId !== hierarchy.rootId) throw new Error(`Atlas country ${location.id} must be a direct child of the root.`);
      if (!location.identifiers || typeof location.identifiers !== "object" || Array.isArray(location.identifiers)) throw new Error(`Atlas country ${location.id} is missing identifiers.`);
      rejectUnknownFields(location.identifiers, ["isoAlpha2", "isoNumeric"], `Atlas country identifiers ${location.id}`);
      if (!ISO_ALPHA_2_RE.test(location.identifiers.isoAlpha2 || "") || !ISO_NUMERIC_RE.test(location.identifiers.isoNumeric || "") || location.id !== location.identifiers.isoAlpha2.toLocaleLowerCase("en-US")) throw new Error(`Invalid Atlas country identifiers for ${location.id}.`);
      rejectUnknownFields(location.geometry, ["dataset", "id"], `Atlas geometry ${location.id}`);
      if (location.geometry.dataset !== "world" || location.geometry.id !== location.identifiers.isoNumeric) throw new Error(`Atlas country geometry does not match identifiers for ${location.id}.`);
      const geometryIds = geometryIdsByDataset.get("world");
      if (geometryIds && !geometryIds.has(location.geometry.id)) throw new Error(`Unknown Atlas country geometry for ${location.id}: ${location.geometry.id}`);
      const registeredCountry = countryRegistry?.countryByLocationId.get(location.id);
      if (countryRegistry && (!registeredCountry || registeredCountry.isoAlpha2 !== location.identifiers.isoAlpha2 || registeredCountry.isoNumeric !== location.identifiers.isoNumeric || registeredCountry.geometry.dataset !== location.geometry.dataset || registeredCountry.geometry.id !== location.geometry.id)) throw new Error(`Atlas country identifiers do not match the country registry for ${location.id}.`);
    } else if (location.kind === "region") {
      if (!location.identifiers || typeof location.identifiers !== "object" || Array.isArray(location.identifiers)) throw new Error(`Atlas region ${location.id} is missing identifiers.`);
      rejectUnknownFields(location.identifiers, ["censusFips", "postalCode", "registry", "subdivisionType"], `Atlas region identifiers ${location.id}`);
      const registry = subdivisionRegistryById.get(location.identifiers.registry);
      const subdivision = registry?.subdivisionByLocationId.get(location.id);
      if (!subdivision || registry.countryId !== location.parentId || subdivision.name !== location.name || subdivision.postalCode !== location.identifiers.postalCode || subdivision.censusFips !== location.identifiers.censusFips || subdivision.type !== location.identifiers.subdivisionType) throw new Error(`Atlas region identifiers do not match a registered subdivision for ${location.id}.`);
      if (subdivision.geometry === null) {
        if (location.geometry.dataset !== "none") throw new Error(`Atlas region ${location.id} has no registered map geometry.`);
        rejectUnknownFields(location.geometry, ["dataset"], `Atlas geometry ${location.id}`);
      } else {
        rejectUnknownFields(location.geometry, ["dataset", "id"], `Atlas geometry ${location.id}`);
        if (location.geometry.dataset !== subdivision.geometry.dataset || location.geometry.id !== subdivision.geometry.id) throw new Error(`Atlas region geometry does not match identifiers for ${location.id}.`);
      }
    } else if (location.kind === "locality") {
      if (location.identifiers !== undefined) throw new Error(`Atlas locality ${location.id} must not declare unsupported identifiers.`);
      rejectUnknownFields(location.geometry, ["coordinates", "dataset", "mapPosition"], `Atlas geometry ${location.id}`);
      if (location.geometry.dataset !== "point") throw new Error(`Atlas locality ${location.id} must use point geometry.`);
      const validCoordinates = validCoordinatePair(location.geometry.coordinates);
      const validMapPosition = Array.isArray(location.geometry.mapPosition) && location.geometry.mapPosition.length === 2 && location.geometry.mapPosition.every((value) => Number.isFinite(value) && value >= 0 && value <= 1);
      if (!validCoordinates || !validMapPosition) throw new Error(`Invalid atlas point geometry for ${location.id}.`);
    } else {
      throw new Error(`Only the atlas root may use the world location kind (${location.id}).`);
    }
    if (location.id !== hierarchy.rootId && (!location.parentId || !locationById.has(location.parentId))) throw new Error(`Unknown atlas parent ${location.parentId || "missing"} for ${location.id}.`);
    if (location.id !== hierarchy.rootId) childrenByParentId.set(location.parentId, [...(childrenByParentId.get(location.parentId) || []), location.id]);
  }
  const visited = new Set();
  const visiting = new Set();
  const visit = (locationId) => {
    if (visiting.has(locationId)) throw new Error(`Atlas hierarchy cycle detected at ${locationId}.`);
    if (visited.has(locationId)) return;
    visiting.add(locationId);
    for (const childId of childrenByParentId.get(locationId) || []) visit(childId);
    visiting.delete(locationId);
    visited.add(locationId);
  };
  visit(hierarchy.rootId);
  if (visited.size !== hierarchy.locations.length) {
    const disconnected = hierarchy.locations.find((location) => !visited.has(location.id));
    visit(disconnected.id);
    throw new Error(`Atlas location is disconnected from the root: ${disconnected.id}`);
  }
  for (const [registryId, registry] of subdivisionRegistryById) {
    const country = locationById.get(registry.countryId);
    if (registryId !== registry.id || country?.kind !== "country") throw new Error(`Atlas subdivision registry ${registryId} must reference a known country.`);
  }
  if (countryRegistry) {
    for (const countryId of countryRegistry.countryByLocationId.keys()) {
      if (locationById.get(countryId)?.kind !== "country") throw new Error(`Atlas country registry ${countryRegistry.id} references an unknown country: ${countryId}.`);
    }
  }
  for (const location of hierarchy.locations) location.children = childrenByParentId.get(location.id) || [];
  return locationById;
}

export function validateAtlasApplicability(manifest, locationById, catalogResourceById) {
  if (manifest?.schemaVersion !== 2 || !Array.isArray(manifest.provenance) || !Array.isArray(manifest.associations) || !Array.isArray(manifest.inheritance)) throw new Error("Unsupported atlas applicability schema.");
  rejectUnknownFields(manifest, ["schemaVersion", "provenance", "associations", "inheritance"], "Atlas applicability manifest");
  if (!manifest.provenance.length) throw new Error("Atlas applicability needs at least one provenance entry.");

  const provenanceById = new Map();
  for (const entry of manifest.provenance) {
    validateProvenance(entry);
    if (provenanceById.has(entry.id)) throw new Error(`Duplicate Atlas provenance ID: ${entry.id}`);
    provenanceById.set(entry.id, entry);
  }

  const associationKeys = new Set();
  const associations = manifest.associations.map((association, index) => {
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

  const inheritanceKeys = new Set();
  const inheritance = manifest.inheritance.map((edge, index) => {
    const context = `Atlas inheritance edge ${index + 1}`;
    if (!edge || typeof edge !== "object" || Array.isArray(edge)) throw new Error(`${context} must be an object.`);
    rejectUnknownFields(edge, ["inheritsFromLocationId", "locationId", "provenanceId"], context);
    if (!locationById.has(edge.locationId)) throw new Error(`${context} references unknown Atlas location: ${edge.locationId || "missing"}`);
    if (!locationById.has(edge.inheritsFromLocationId)) throw new Error(`${context} references unknown inherited Atlas location: ${edge.inheritsFromLocationId || "missing"}`);
    if (edge.locationId === edge.inheritsFromLocationId) throw new Error(`${context} cannot inherit from itself.`);
    const provenance = provenanceById.get(edge.provenanceId);
    if (!provenance) throw new Error(`${context} references unknown provenance: ${edge.provenanceId || "missing"}`);
    const inheritanceKey = `${edge.locationId}\u0000${edge.inheritsFromLocationId}`;
    if (inheritanceKeys.has(inheritanceKey)) throw new Error(`Duplicate Atlas inheritance edge: ${edge.locationId} / ${edge.inheritsFromLocationId}`);
    inheritanceKeys.add(inheritanceKey);
    return { id: `${edge.locationId}:${edge.inheritsFromLocationId}`, ...edge, provenance };
  });

  const inheritanceByLocation = new Map();
  for (const edge of inheritance) inheritanceByLocation.set(edge.locationId, [...(inheritanceByLocation.get(edge.locationId) || []), edge.inheritsFromLocationId]);
  const visited = new Set();
  const visiting = new Set();
  const visit = (locationId) => {
    if (visiting.has(locationId)) throw new Error(`Atlas inheritance cycle detected at ${locationId}.`);
    if (visited.has(locationId)) return;
    visiting.add(locationId);
    for (const inheritedLocationId of inheritanceByLocation.get(locationId) || []) visit(inheritedLocationId);
    visiting.delete(locationId);
    visited.add(locationId);
  };
  for (const locationId of locationById.keys()) visit(locationId);

  return { associations, inheritance };
}

export function deriveAtlasLocationResources(locations, resources, inheritance) {
  const resourcesByLocation = new Map(locations.map((location) => [location.id, []]));
  for (const resource of resources) {
    if (!resourcesByLocation.has(resource.locationId)) throw new Error(`Atlas resource has unknown location: ${resource.locationId}`);
    resourcesByLocation.get(resource.locationId).push(resource);
  }
  const inheritanceByLocation = new Map();
  for (const edge of inheritance) inheritanceByLocation.set(edge.locationId, [...(inheritanceByLocation.get(edge.locationId) || []), edge]);

  return Object.fromEntries(locations.map((location) => {
    const placements = [];
    const seenResourceIds = new Set();
    const append = (resource, relationship, sourceLocationId, inheritancePath) => {
      if (seenResourceIds.has(resource.id)) return;
      seenResourceIds.add(resource.id);
      placements.push({
        associationId: resource.associationId,
        relationship,
        ...(relationship === "inherited" ? { sourceRelationship: resource.relationship } : {}),
        sourceLocationId,
        inheritancePath,
      });
    };

    for (const resource of resourcesByLocation.get(location.id)) append(resource, resource.relationship, location.id, []);
    const queue = (inheritanceByLocation.get(location.id) || []).map((edge) => ({ locationId: edge.inheritsFromLocationId, path: [edge.id] }));
    const visitedLocationIds = new Set([location.id]);
    for (let queueIndex = 0; queueIndex < queue.length; queueIndex += 1) {
      const candidate = queue[queueIndex];
      if (visitedLocationIds.has(candidate.locationId)) continue;
      visitedLocationIds.add(candidate.locationId);
      for (const resource of resourcesByLocation.get(candidate.locationId) || []) {
        if (resource.relationship === "specific") append(resource, "inherited", candidate.locationId, candidate.path);
      }
      for (const edge of inheritanceByLocation.get(candidate.locationId) || []) queue.push({ locationId: edge.inheritsFromLocationId, path: [...candidate.path, edge.id] });
    }
    return [location.id, placements];
  }));
}
