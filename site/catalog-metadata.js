export const METADATA_FACETS = [
  ["resourceType", "runtime.metadata.resourceType"],
  ["role", "runtime.metadata.role"],
  ["authority", "runtime.metadata.authority"],
  ["access", "runtime.metadata.access"],
  ["geography", "runtime.metadata.geography"],
  ["language", "runtime.metadata.language"],
  ["platform", "runtime.metadata.platform"],
  ["account", "runtime.metadata.account"],
  ["license", "runtime.metadata.license"],
  ["status", "runtime.metadata.status"],
  ["volatility", "runtime.metadata.volatility"],
  ["reviewTier", "runtime.metadata.reviewTier"],
  ["sensitive", "runtime.metadata.sensitive"],
];

export const emptyMetadataFacets = () => Object.fromEntries(METADATA_FACETS.map(([field]) => [field, ""]));

export function humanizeMetadataValue(value) {
  return value.replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toLocaleUpperCase("en-US"));
}

export function formatMetadataValue(field, value) {
  return ["geography", "language"].includes(field) ? value : humanizeMetadataValue(value);
}

export function metadataFacetValues(resources, field) {
  return [...new Set(resources.flatMap((resource) => {
    const value = resource.metadata?.[field];
    return Array.isArray(value) ? value : value ? [value] : [];
  }))].sort((left, right) => left.localeCompare(right));
}

export function activeMetadataFacetCount(facets) {
  return Object.values(facets).filter(Boolean).length;
}

export function matchesMetadataFacets(resource, facets) {
  return METADATA_FACETS.every(([field]) => {
    const expected = facets[field];
    if (!expected) return true;
    const value = resource.metadata?.[field];
    return Array.isArray(value) ? value.includes(expected) : value === expected;
  });
}
