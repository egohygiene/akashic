function rendererKey(dataset, level) {
  return `${dataset}\u0000${level}`;
}

function validateRendererEntry(entry) {
  if (!entry || typeof entry !== "object") throw new TypeError("Atlas renderer entries must be objects.");
  if (typeof entry.dataset !== "string" || !entry.dataset) throw new TypeError("Atlas renderer entries need a geometry dataset.");
  if (typeof entry.level !== "string" || !entry.level) throw new TypeError("Atlas renderer entries need a location level.");
  if (typeof entry.render !== "function") throw new TypeError("Atlas renderer entries need a render function.");
}

export function createAtlasRendererRegistry(entries) {
  if (!Array.isArray(entries)) throw new TypeError("Atlas renderer registry entries must be an array.");
  const renderers = new Map();
  for (const entry of entries) {
    validateRendererEntry(entry);
    const key = rendererKey(entry.dataset, entry.level);
    if (renderers.has(key)) throw new Error(`Duplicate Atlas renderer: ${entry.dataset} / ${entry.level}`);
    renderers.set(key, entry.render);
  }

  return Object.freeze({
    resolve(location) {
      const dataset = location?.geometry?.dataset;
      const level = location?.kind;
      if (typeof dataset !== "string" || typeof level !== "string") return null;
      return renderers.get(rendererKey(dataset, level)) || null;
    },
  });
}
