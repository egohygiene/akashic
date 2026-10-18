// This module consumes only the build's reviewed, current publication projection.
// Raw authored records (including draft/review metadata) are never a runtime input.
const LABEL_FIELDS = new Map([
  ["collection", new Set(["label"])],
  ["topic", new Set(["label"])],
  ["need", new Set(["label"])],
  ["resource", new Set(["label"])],
  ["place", new Set(["label", "shortLabel"])],
]);
const ENTRY_KEYS = new Set(["locale", "kind", "id", "field", "value", "sourceLanguage"]);

export const contentTopicId = (categorySlug, groupSlug, section) => JSON.stringify([categorySlug, groupSlug || "", section]);

export function createContentLocalization(locale, publishedEntries = []) {
  const labels = new Map();
  const aliases = [];
  for (const entry of Array.isArray(publishedEntries) ? publishedEntries : []) {
    if (!entry || typeof entry !== "object" || Object.keys(entry).some((key) => !ENTRY_KEYS.has(key))) continue;
    if (entry.locale !== locale || entry.sourceLanguage !== "en" || typeof entry.id !== "string" || !entry.id) continue;
    if (!LABEL_FIELDS.has(entry.kind)) continue;
    if (entry.field === "aliases" && entry.kind !== "place" && Array.isArray(entry.value)
      && entry.value.length && entry.value.every((value) => typeof value === "string" && value.trim())) {
      aliases.push({ ...entry, value: [...entry.value] });
    } else if (LABEL_FIELDS.get(entry.kind).has(entry.field) && typeof entry.value === "string" && entry.value.trim()) {
      labels.set(JSON.stringify([entry.kind, entry.id, entry.field]), entry.value);
    }
  }
  return {
    label(kind, id, canonical, field = "label") {
      const value = labels.get(JSON.stringify([kind, id, field]));
      return value === undefined
        ? { text: canonical, lang: "en", translated: false }
        : { text: value, lang: locale, translated: true };
    },
    aliases() { return aliases.map((entry) => ({ ...entry, value: [...entry.value] })); },
  };
}
