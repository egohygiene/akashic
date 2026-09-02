export function validateAtlasHierarchy(hierarchy) {
  if (hierarchy.schemaVersion !== 2 || !Array.isArray(hierarchy.locations)) throw new Error("Unsupported atlas location schema.");
  const locationById = new Map(hierarchy.locations.map((location) => [location.id, location]));
  if (locationById.size !== hierarchy.locations.length) throw new Error("The atlas contains duplicate location IDs.");
  if (!locationById.has(hierarchy.rootId)) throw new Error("The atlas root location does not exist.");
  for (const location of hierarchy.locations) {
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
