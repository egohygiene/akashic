import { createHash } from "node:crypto";

const KINDS = new Set(["resource", "collection", "topic", "need", "place"]);
const STATUSES = new Set(["draft", "reviewed", "stale", "withdrawn"]);
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SOURCE_KEYS = {
  resource: { label: ["title"], aliases: ["title"] },
  collection: { label: ["title"], aliases: ["title"] },
  topic: { label: ["collectionSlug", "groupSlug", "title"], aliases: ["collectionSlug", "groupSlug", "title"] },
  need: { label: ["query", "title"], aliases: ["query", "title"] },
  place: { label: ["name"], shortLabel: ["shortName"] },
};

const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const ordered = (value) => Array.isArray(value) ? value.map(ordered) : isObject(value) ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, ordered(value[key])])) : value;
const same = (left, right) => JSON.stringify(ordered(left)) === JSON.stringify(ordered(right));
const digest = (value) => `sha256:${createHash("sha256").update(JSON.stringify(ordered(value)), "utf8").digest("hex")}`;
// Keep exact parity with the runtime's whole-phrase discovery normalizer.
const aliasPhrase = (value) => value.normalize("NFKC").toLocaleLowerCase("en-US").trim().replace(/\s+/gu, " ");

function fail(context, message) {
  throw new Error(`${context}: ${message}`);
}

function keys(value, required, optional, context) {
  if (!isObject(value)) fail(context, "must be an object.");
  for (const key of required) if (!Object.hasOwn(value, key)) fail(context, `missing ${key}.`);
  for (const key of Object.keys(value)) if (![...required, ...optional].includes(key)) fail(context, `unsupported field ${key}.`);
}

function canonicalText(value, context, maxLength = 240) {
  if (typeof value !== "string" || !value.trim() || value !== value.trim() || value.length > maxLength) fail(context, `must be trimmed non-empty text of at most ${maxLength} characters.`);
  if (/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/u.test(value)) fail(context, "unsafe control or bidirectional control character.");
}

function text(value, context, maxLength = 240) {
  canonicalText(value, context, maxLength);
  if (/[<>]/u.test(value) || /(?:https?:|javascript:|data:|\/\/)/iu.test(value)) fail(context, "unsafe markup or URL in translated text.");
}

function identity(kind, id, context) {
  if (!KINDS.has(kind)) fail(context, `unknown entity kind ${kind}.`);
  if (kind !== "topic") {
    if (typeof id !== "string" || !SLUG.test(id)) fail(context, "target ID must be a canonical stable slug.");
    return;
  }
  let parts;
  try { parts = JSON.parse(id); } catch {}
  if (!Array.isArray(parts) || parts.length !== 3 || typeof parts[0] !== "string" || !SLUG.test(parts[0]) || typeof parts[1] !== "string" || (parts[1] && !SLUG.test(parts[1])) || typeof parts[2] !== "string" || !parts[2].trim() || id !== JSON.stringify(parts)) fail(context, "topic ID must be the exact JSON tuple [collectionSlug, groupSlug, sectionTitle].");
  canonicalText(parts[2], `${context}.sectionTitle`);
}

export const sourceKey = (kind, id) => JSON.stringify([kind, id]);

// Exact Unicode code points and field names matter. Sorting object keys permits
// editorial JSON formatting changes without changing the source fingerprint.
export function fingerprintCanonical(fields) {
  if (!isObject(fields) || Object.values(fields).some((value) => typeof value !== "string")) throw new Error("Content source fingerprint requires an object of string fields.");
  return digest(fields);
}

// Review binds the exact authored translation and its provenance, rather than
// attaching a reusable approval flag to a mutable entity. This digest is an
// audit binding, not authentication or a substitute for a real human review.
export function fingerprintTranslation(entry) {
  const fields = ["id", "locale", "target", "field", "value", "source", "translator"];
  if (!isObject(entry) || fields.some((field) => !Object.hasOwn(entry, field))) throw new Error("Translation fingerprint requires entry identity, value, source, and translator provenance.");
  return digest(Object.fromEntries(fields.map((field) => [field, entry[field]])));
}

// Consume the existing parsed build products. This is an identity/binding index,
// not another parser or a second authored resource catalog.
export function createContentSources({ catalog, atlas, needs, englishMessages }) {
  if (!Array.isArray(catalog?.categories) || !Array.isArray(catalog?.resources) || !Array.isArray(atlas?.locations) || !Array.isArray(needs) || !isObject(englishMessages)) throw new Error("Content sources require parsed catalog, Atlas, needs, and English messages.");
  const sources = new Map();
  const add = (kind, id, fields, canonical) => {
    identity(kind, id, `Canonical ${kind}`);
    const key = sourceKey(kind, id);
    if (sources.has(key)) fail(`Canonical ${kind} ${id}`, "ambiguous duplicate identity.");
    for (const binding of Object.values(fields)) {
      for (const [name, value] of Object.entries(binding)) if (typeof value !== "string" || (!value && name !== "groupSlug")) fail(`Canonical ${kind} ${id}`, `missing source field ${name}.`);
    }
    sources.set(key, { kind, id, fields, canonical });
  };
  for (const category of catalog.categories) add("collection", category.slug, { label: { title: category.title }, aliases: { title: category.title } }, { collectionSlug: category.slug });
  const topics = new Set();
  const resourceIds = new Set();
  for (const resource of catalog.resources) {
    if (resourceIds.has(resource.id)) fail(`Canonical resource ${resource.id}`, "ambiguous duplicate identity.");
    resourceIds.add(resource.id);
    if (resource.idOrigin === "explicit") add("resource", resource.id, { label: { title: resource.title }, aliases: { title: resource.title } }, { resourceId: resource.id });
    const groupSlug = resource.groupSlug === "__root__" ? "" : resource.groupSlug || "";
    const id = JSON.stringify([resource.categorySlug, groupSlug, resource.section]);
    if (!topics.has(id)) {
      topics.add(id);
      const binding = { collectionSlug: resource.categorySlug, groupSlug, title: resource.section };
      add("topic", id, { label: { ...binding }, aliases: { ...binding } }, { collectionSlug: resource.categorySlug, groupSlug, section: resource.section });
    }
  }
  for (const need of needs) {
    const binding = { title: englishMessages[need.titleKey], query: need.query };
    add("need", need.id, { label: { ...binding }, aliases: { ...binding } }, { query: need.query });
  }
  for (const place of atlas.locations) add("place", place.id, { label: { name: place.name }, shortLabel: { shortName: place.shortName } }, { locationId: place.id });
  return sources;
}

function validateEntry(entry, index, localeCodes) {
  const context = `Content overlay entry ${typeof entry?.id === "string" ? entry.id : `at index ${index}`}`;
  keys(entry, ["id", "locale", "target", "field", "value", "source", "translator", "status"], ["review"], context);
  if (typeof entry.id !== "string" || !SLUG.test(entry.id)) fail(context, "id must be a stable slug.");
  if (!localeCodes.has(entry.locale) || entry.locale === "en") fail(context, `unknown or canonical locale ${entry.locale}.`);
  keys(entry.target, ["kind", "id"], [], `${context}.target`);
  identity(entry.target.kind, entry.target.id, context);
  const allowedFields = SOURCE_KEYS[entry.target.kind];
  if (typeof entry.field !== "string" || !Object.hasOwn(allowedFields, entry.field)) fail(context, `field ${entry.field} is outside the translation boundary.`);
  const expectedKeys = allowedFields[entry.field];
  if (entry.field === "aliases") {
    if (!Array.isArray(entry.value) || !entry.value.length || entry.value.length > 12) fail(context, "aliases require between 1 and 12 text values.");
    for (const alias of entry.value) text(alias, `${context}.value`, 120);
    const normalized = entry.value.map(aliasPhrase);
    if (new Set(normalized).size !== normalized.length) fail(context, "duplicate aliases.");
  } else text(entry.value, `${context}.value`);
  keys(entry.source, ["revision", "fields", "fingerprint"], [], `${context}.source`);
  if (typeof entry.source.revision !== "string" || !/^[0-9a-f]{40}$/.test(entry.source.revision)) fail(context, "source revision must be a full lowercase Git commit SHA.");
  keys(entry.source.fields, expectedKeys, [], `${context}.source.fields`);
  for (const [field, value] of Object.entries(entry.source.fields)) {
    if (field === "groupSlug" && value === "") continue;
    // Source snapshots are compared and fingerprinted, never inserted as labels.
    // Preserve literal URL-looking text, ampersands, quotes, and angle brackets
    // that may legitimately occur in an exact canonical heading.
    canonicalText(value, `${context}.source.fields.${field}`);
    if (["collectionSlug", "groupSlug"].includes(field) && !SLUG.test(value)) fail(`${context}.source.fields.${field}`, "must be a canonical stable slug.");
  }
  if (entry.source.fingerprint !== fingerprintCanonical(entry.source.fields)) fail(context, "source fingerprint does not match its recorded source fields.");
  keys(entry.translator, ["kind", "name"], [], `${context}.translator`);
  if (!["ai", "human"].includes(entry.translator.kind)) fail(context, "translator kind must be ai or human.");
  text(entry.translator.name, `${context}.translator.name`, 120);
  if (!STATUSES.has(entry.status)) fail(context, `unknown status ${entry.status}.`);
  if (entry.review !== undefined) {
    keys(entry.review, ["reviewer", "kind", "date", "fingerprint"], [], `${context}.review`);
    if (entry.review.kind !== "human") fail(context, "language review must explicitly identify a human reviewer.");
    text(entry.review.reviewer, `${context}.review.reviewer`, 120);
    if (entry.translator.kind === "ai" && entry.review.reviewer.normalize("NFKC").toLocaleLowerCase("en") === entry.translator.name.normalize("NFKC").toLocaleLowerCase("en")) fail(context, "AI translation cannot serve as its own human review.");
    if (typeof entry.review.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(entry.review.date) || !Number.isFinite(Date.parse(`${entry.review.date}T00:00:00Z`)) || new Date(`${entry.review.date}T00:00:00Z`).toISOString().slice(0, 10) !== entry.review.date) fail(context, "review date must be a real ISO calendar date.");
    if (entry.review.fingerprint !== fingerprintTranslation(entry)) fail(context, "human review fingerprint does not match the exact translation and provenance; renewed human review is required.");
  }
  if (entry.status === "reviewed" && !entry.review) fail(context, "reviewed status requires a human reviewer and date.");
  return context;
}

export function validateContentOverlays(document, { sources, locales }) {
  keys(document, ["schemaVersion", "sourceLanguage", "entries"], [], "Content overlays");
  if (document.schemaVersion !== 1 || document.sourceLanguage !== "en" || !Array.isArray(document.entries)) throw new Error("Unsupported content-overlay document; schemaVersion 1 and sourceLanguage en are required.");
  if (!(sources instanceof Map)) throw new Error("Content overlays require the canonical source index.");
  const registry = Array.isArray(locales) ? locales : locales?.locales;
  if (!Array.isArray(registry)) throw new Error("Content overlays require the validated locale registry.");
  const localeCodes = new Set(registry.map((locale) => typeof locale === "string" ? locale : locale.code));
  const ids = new Set();
  const targets = new Set();
  const aliases = new Map();
  const published = [];
  const report = { schemaVersion: 1, sourceLanguage: "en", counts: { total: document.entries.length, published: 0, draft: 0, stale: 0, withdrawn: 0, orphaned: 0 }, entries: [] };
  for (const [index, entry] of document.entries.entries()) {
    const context = validateEntry(entry, index, localeCodes);
    if (ids.has(entry.id)) fail(context, "duplicate entry ID.");
    ids.add(entry.id);
    const target = JSON.stringify([entry.locale, entry.target.kind, entry.target.id, entry.field]);
    if (targets.has(target)) fail(context, "duplicate locale, target, and field.");
    targets.add(target);
    const source = sources.get(sourceKey(entry.target.kind, entry.target.id));
    let effectiveStatus = entry.status;
    const issues = [];
    if (!source) {
      effectiveStatus = "orphaned";
      issues.push("target-not-found-or-ineligible");
    } else if (!same(entry.source.fields, source.fields[entry.field])) {
      effectiveStatus = "stale";
      issues.push("canonical-source-changed");
    }
    if (effectiveStatus === "reviewed") {
      if (entry.field === "aliases") for (const alias of entry.value) {
        const aliasKey = JSON.stringify([entry.locale, aliasPhrase(alias)]);
        const canonicalKey = sourceKey(entry.target.kind, entry.target.id);
        if (aliases.has(aliasKey) && aliases.get(aliasKey) !== canonicalKey) fail(context, `ambiguous reviewed alias ${alias}.`);
        aliases.set(aliasKey, canonicalKey);
      }
      published.push({ locale: entry.locale, kind: entry.target.kind, id: entry.target.id, field: entry.field, value: Array.isArray(entry.value) ? [...entry.value] : entry.value, sourceLanguage: "en" });
      report.counts.published++;
    } else report.counts[effectiveStatus]++;
    report.entries.push({
      id: entry.id,
      locale: entry.locale,
      target: { ...entry.target },
      field: entry.field,
      sourceRevision: entry.source.revision,
      sourceFingerprint: entry.source.fingerprint,
      translationFingerprint: fingerprintTranslation(entry),
      translator: { ...entry.translator },
      review: entry.review ? { ...entry.review } : null,
      declaredStatus: entry.status,
      effectiveStatus,
      issues,
    });
  }
  report.entries.sort((left, right) => left.id < right.id ? -1 : left.id > right.id ? 1 : 0);
  published.sort((left, right) => {
    const a = JSON.stringify([left.locale, left.kind, left.id, left.field]);
    const b = JSON.stringify([right.locale, right.kind, right.id, right.field]);
    return a < b ? -1 : a > b ? 1 : 0;
  });
  return { published, report };
}
