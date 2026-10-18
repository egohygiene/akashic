// This adapter accepts only the minimal, validated published alias payload.
// Draft/review provenance belongs to the offline overlay validator, never here.
const PUBLISHED_FIELDS = ["locale", "kind", "id", "field", "value", "sourceLanguage"];

function phrase(value) {
  return String(value || "").normalize("NFKC").toLocaleLowerCase("en-US").trim().replace(/\s+/gu, " ");
}

function targetKey(kind, id) {
  return JSON.stringify([kind, id]);
}

function catalogTargets(catalog, needs) {
  const targets = new Map();
  for (const category of catalog?.categories || []) {
    if (typeof category.slug !== "string" || typeof category.title !== "string") continue;
    targets.set(targetKey("collection", category.slug), category.title);
    for (const group of category.groups || []) {
      for (const section of group.sections || []) {
        if (typeof group.slug !== "string" || typeof section.title !== "string") continue;
        const id = JSON.stringify([category.slug, group.slug === "__root__" ? "" : group.slug, section.title]);
        // The full tuple selects the canonical topic. Searching only its title
        // avoids broad ancestor words overwhelming the frozen lexical ranker.
        targets.set(targetKey("topic", id), section.title);
      }
    }
  }
  for (const need of Array.isArray(needs) ? needs : []) {
    if (typeof need.id === "string" && typeof need.query === "string") targets.set(targetKey("need", need.id), need.query);
  }
  return targets;
}

/**
 * Bridge a whole reviewed alias phrase to canonical search vocabulary. The caller
 * retains the original input and passes only result.query to the frozen ranker.
 * Unknown, ambiguous, partial, and protected resource queries remain unchanged.
 */
export function createDiscoveryResolver({ locale, aliases = [], catalog, needs = [] } = {}) {
  const targets = catalogTargets(catalog, needs);
  const protectedQueries = new Set((catalog?.resources || []).flatMap((resource) => [resource.id, resource.title, resource.domain, resource.url]).filter(Boolean).map(phrase));
  const phrases = new Map();
  for (const entry of Array.isArray(aliases) ? aliases : []) {
    if (!entry || Object.keys(entry).length !== PUBLISHED_FIELDS.length || PUBLISHED_FIELDS.some((field) => !Object.hasOwn(entry, field))
      || entry.locale !== locale || locale === "en" || entry.sourceLanguage !== "en" || entry.field !== "aliases"
      || !["collection", "topic", "need"].includes(entry.kind) || typeof entry.id !== "string"
      || !Array.isArray(entry.value) || !entry.value.length || entry.value.some((value) => typeof value !== "string" || !value.trim())) continue;
    const key = targetKey(entry.kind, entry.id);
    const canonicalQuery = targets.get(key);
    if (!canonicalQuery) continue;
    for (const value of entry.value) {
      const normalized = phrase(value);
      const candidates = phrases.get(normalized) || new Map();
      candidates.set(key, { query: canonicalQuery, target: { kind: entry.kind, id: entry.id } });
      phrases.set(normalized, candidates);
    }
  }
  return (query) => {
    const original = typeof query === "string" ? query : String(query || "");
    const normalized = phrase(original);
    if (!normalized) return { query: original, status: "unchanged" };
    if (protectedQueries.has(normalized)) return { query: original, status: "protected" };
    const candidates = phrases.get(normalized);
    if (!candidates?.size) return { query: original, status: "unchanged" };
    if (candidates.size !== 1) return { query: original, status: "ambiguous" };
    return { ...candidates.values().next().value, status: "mapped" };
  };
}
