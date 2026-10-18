import assert from "node:assert/strict";
import { test } from "node:test";
import { createContentSources, fingerprintCanonical, fingerprintTranslation, sourceKey, validateContentOverlays } from "../scripts/lib/content-overlays.mjs";
import { createDiscoveryResolver } from "../site/discovery-search.js";

const revision = "0123456789abcdef0123456789abcdef01234567";
const locales = [{ code: "en" }, { code: "ru" }, { code: "es" }];
const fixture = () => ({
  catalog: {
    categories: [{ slug: "learning", title: "Learning" }, { slug: "making", title: "Making" }],
    resources: [
      { id: "public-library", idOrigin: "explicit", title: "Public Library", categorySlug: "learning", groupSlug: "", section: "Getting Started", url: "https://example.invalid/library", metadata: { id: "public-library" } },
      { id: "legacy-library", idOrigin: "derived", title: "Legacy Library", categorySlug: "making", groupSlug: "books", section: "Getting Started", url: "https://example.invalid/legacy" },
    ],
  },
  atlas: { locations: [{ id: "world", name: "World", shortName: "World" }, { id: "synthetic-place", name: "Synthetic Place", shortName: "SP" }] },
  needs: [{ id: "learn", titleKey: "need.learn", query: "find learning resources" }],
  englishMessages: { "need.learn": "Find learning resources" },
});
const sources = () => createContentSources(fixture());
const entry = (kind = "collection", id = "learning", field = "label", value = "Обучение", status = "draft") => {
  const fields = structuredClone(sources().get(sourceKey(kind, id)).fields[field]);
  const result = {
    id: `${kind}-${field.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}-ru`, locale: "ru", target: { kind, id }, field, value,
    source: { revision, fields, fingerprint: fingerprintCanonical(fields) },
    translator: { kind: "ai", name: "Synthetic translation fixture" }, status,
  };
  if (status === "reviewed") result.review = { kind: "human", reviewer: "Synthetic reviewer fixture", date: "2026-10-17", fingerprint: fingerprintTranslation(result) };
  return result;
};
const validate = (entries, canonical = sources()) => validateContentOverlays({ schemaVersion: 1, sourceLanguage: "en", entries }, { sources: canonical, locales });

test("empty offline overlays produce no published payload and deterministic empty report", () => {
  assert.deepEqual(validate([]), {
    published: [],
    report: { schemaVersion: 1, sourceLanguage: "en", counts: { total: 0, published: 0, draft: 0, stale: 0, withdrawn: 0, orphaned: 0 }, entries: [] },
  });
});

test("canonical source index scopes topics and excludes resource IDs derived from titles", () => {
  const index = sources();
  assert(index.has(sourceKey("resource", "public-library")));
  assert(!index.has(sourceKey("resource", "legacy-library")));
  assert(index.has(sourceKey("topic", JSON.stringify(["learning", "", "Getting Started"]))));
  assert(index.has(sourceKey("topic", JSON.stringify(["making", "books", "Getting Started"]))));
  assert.deepEqual(index.get(sourceKey("need", "learn")).fields.aliases, { title: "Find learning resources", query: "find learning resources" });
  assert.deepEqual(index.get(sourceKey("place", "synthetic-place")).fields.shortLabel, { shortName: "SP" });
  const duplicate = fixture();
  duplicate.catalog.categories.push({ slug: "learning", title: "Other learning" });
  assert.throws(() => createContentSources(duplicate), /ambiguous duplicate identity/);
});

test("fingerprints preserve exact source text and field names while ignoring JSON key order", () => {
  assert.equal(fingerprintCanonical({ title: "Learning", query: "learn" }), fingerprintCanonical({ query: "learn", title: "Learning" }));
  assert.notEqual(fingerprintCanonical({ title: "Learning" }), fingerprintCanonical({ title: "learning" }));
  assert.notEqual(fingerprintCanonical({ title: "Learning" }), fingerprintCanonical({ name: "Learning" }));
  assert.notEqual(fingerprintCanonical({ title: "é" }), fingerprintCanonical({ title: "e\u0301" }));
  assert.throws(() => fingerprintCanonical({ title: ["Learning"] }), /string fields/);
});

test("only reviewed-current fields publish; AI authorship never supplies human review", () => {
  const draft = entry();
  assert.deepEqual(validate([draft]).published, []);
  const reviewed = entry("collection", "learning", "label", "Обучение", "reviewed");
  assert.deepEqual(validate([reviewed]).published, [{ locale: "ru", kind: "collection", id: "learning", field: "label", value: "Обучение", sourceLanguage: "en" }]);
  delete reviewed.review;
  assert.throws(() => validate([reviewed]), /collection-label-ru: reviewed status requires/);
  reviewed.review = { reviewer: "Synthetic AI", kind: "ai", date: "2026-10-17", fingerprint: fingerprintTranslation(reviewed) };
  assert.throws(() => validate([reviewed]), /explicitly identify a human/);
  reviewed.review = { reviewer: reviewed.translator.name, kind: "human", date: "2026-10-17", fingerprint: fingerprintTranslation(reviewed) };
  assert.throws(() => validate([reviewed]), /cannot serve as its own human review/);
  for (const status of ["stale", "withdrawn"]) assert.equal(validate([{ ...draft, status }]).published.length, 0);
});

test("every permitted reviewed field retains its canonical target without publishing provenance or source facts", () => {
  const entries = [
    entry("resource", "public-library", "label", "Публичная библиотека", "reviewed"),
    entry("resource", "public-library", "aliases", ["Библиотека"], "reviewed"),
    entry("collection", "learning", "label", "Обучение", "reviewed"),
    entry("collection", "learning", "aliases", ["Учебные ресурсы"], "reviewed"),
    entry("topic", JSON.stringify(["learning", "", "Getting Started"]), "label", "Начало", "reviewed"),
    entry("topic", JSON.stringify(["learning", "", "Getting Started"]), "aliases", ["Первые шаги"], "reviewed"),
    entry("need", "learn", "label", "Найти обучение", "reviewed"),
    entry("need", "learn", "aliases", ["Изучить новое"], "reviewed"),
    entry("place", "synthetic-place", "label", "Условное место", "reviewed"),
    entry("place", "synthetic-place", "shortLabel", "УМ", "reviewed"),
  ];
  const result = validate(entries);
  assert.equal(result.published.length, entries.length);
  for (const published of result.published) assert.deepEqual(Object.keys(published), ["locale", "kind", "id", "field", "value", "sourceLanguage"]);
  assert.equal(result.report.counts.published, entries.length);
});

test("source edits invalidate exactly the bound fields and removed targets stay unpublished", () => {
  const reviewed = entry("collection", "learning", "label", "Обучение", "reviewed");
  const changed = fixture();
  changed.catalog.categories[0].title = "Lifelong Learning";
  const result = validate([reviewed], createContentSources(changed));
  assert.equal(result.report.counts.stale, 1);
  assert.equal(result.report.entries[0].effectiveStatus, "stale");
  assert.deepEqual(result.report.entries[0].issues, ["canonical-source-changed"]);
  assert.deepEqual(result.published, []);
  const removed = fixture();
  removed.catalog.categories = removed.catalog.categories.filter((category) => category.slug !== "learning");
  assert.equal(validate([reviewed], createContentSources(removed)).report.counts.orphaned, 1);
  const changedFacts = fixture();
  changedFacts.catalog.resources[0].url = "https://example.invalid/changed";
  assert.equal(validate([reviewed], createContentSources(changedFacts)).published.length, 1);
});

test("topic renames and group moves orphan old identities rather than guessing replacement headings", () => {
  const topic = entry("topic", JSON.stringify(["learning", "", "Getting Started"]), "label", "Начало", "reviewed");
  const changed = fixture();
  changed.catalog.resources[0].section = "Start Here";
  assert.equal(validate([topic], createContentSources(changed)).report.counts.orphaned, 1);
  topic.target.id = JSON.stringify(["learning", "__root__", "Getting Started"]);
  assert.throws(() => validate([topic]), /exact JSON tuple/);
});

test("source snapshots must carry exact permitted fields, matching fingerprints, and full revision provenance", () => {
  const mismatch = entry();
  mismatch.source.fields.title = "Changed source";
  assert.throws(() => validate([mismatch]), /fingerprint does not match/);
  const forbidden = entry();
  forbidden.source.fields.authority = "official";
  assert.throws(() => validate([forbidden]), /unsupported field authority/);
  const shortRevision = entry();
  shortRevision.source.revision = "0123456";
  assert.throws(() => validate([shortRevision]), /full lowercase Git commit SHA/);
  const changedBinding = entry("need", "learn");
  changedBinding.source.fields.query = "unrelated query";
  changedBinding.source.fingerprint = fingerprintCanonical(changedBinding.source.fields);
  assert.equal(validate([changedBinding]).report.counts.stale, 1);
});

test("unsafe text and canonical-fact overrides are rejected with exact entry diagnostics", () => {
  for (const value of ["<img src=x>", "javascript:alert(1)", "https://example.invalid/", "Label\u202e", "A\nB"]) {
    assert.throws(() => validate([entry("collection", "learning", "label", value)]), /Content overlay entry collection-label-ru.value: unsafe/);
  }
  for (const field of ["url", "description", "authority", "applicability", "parentId", "query"]) assert.throws(() => validate([{ ...entry(), field }]), /outside the translation boundary/);
  assert.throws(() => validate([{ ...entry(), eligibility: "everyone" }]), /unsupported field eligibility/);
  assert.throws(() => validate([{ ...entry(), locale: "de" }]), /unknown or canonical locale/);
  assert.throws(() => validate([{ ...entry(), locale: "en" }]), /unknown or canonical locale/);
  assert.throws(() => validate([entry("place", "world", "label", "Мир"), { ...entry("place", "world", "shortLabel", "Мир"), field: "aliases", value: ["Мир"] }]), /outside the translation boundary/);
});

test("malformed fields, locales, and primitive statuses identify their exact entry", () => {
  for (const field of ["constructor", "toString", "__proto__", ["label"], null, false, 0, {}]) {
    assert.throws(() => validate([{ ...entry(), field }]), /^Error: Content overlay entry collection-label-ru: field .*outside the translation boundary/);
  }
  for (const locale of ["", null, false, 0]) {
    assert.throws(() => validate([{ ...entry(), locale }]), /^Error: Content overlay entry collection-label-ru: unknown or canonical locale/);
  }
  for (const status of ["", null, false, 0]) {
    assert.throws(() => validate([{ ...entry(), status }]), /^Error: Content overlay entry collection-label-ru: unknown status/);
  }
  const invalidSourceSlug = entry("topic", JSON.stringify(["learning", "", "Getting Started"]));
  invalidSourceSlug.source.fields.collectionSlug = "invalid slug";
  invalidSourceSlug.source.fingerprint = fingerprintCanonical(invalidSourceSlug.source.fields);
  assert.throws(() => validate([invalidSourceSlug]), /Content overlay entry topic-label-ru.source.fields.collectionSlug: must be a canonical stable slug/);
});

test("duplicate entries, normalized duplicate aliases, and ambiguous reviewed aliases fail closed", () => {
  const one = entry();
  assert.throws(() => validate([one, structuredClone(one)]), /duplicate entry ID/);
  assert.throws(() => validate([one, { ...structuredClone(one), id: "duplicate-field" }]), /duplicate locale, target, and field/);
  assert.throws(() => validate([entry("collection", "learning", "aliases", ["Тема", "тема"])]), /duplicate aliases/);
  const first = entry("collection", "learning", "aliases", ["Учиться"], "reviewed");
  const second = entry("need", "learn", "aliases", ["учиться"], "reviewed");
  assert.throws(() => validate([first, second]), /need-aliases-ru: ambiguous reviewed alias/);
});

test("offline ambiguity detection matches runtime phrase whitespace, Unicode, and fixed casing", () => {
  for (const pair of [["Учебная  работа", "учебная работа"], ["ＡＢＣ", "abc"], ["I", "i"]]) {
    assert.throws(() => validate([entry("collection", "learning", "aliases", pair)]), /duplicate aliases/);
    const first = entry("collection", "learning", "aliases", [pair[0]], "reviewed");
    const second = entry("need", "learn", "aliases", [pair[1]], "reviewed");
    assert.throws(() => validate([first, second]), /ambiguous reviewed alias/);
    const runtimeEntries = [first, second].map((value) => ({ locale: value.locale, kind: value.target.kind, id: value.target.id, field: value.field, value: value.value, sourceLanguage: "en" }));
    const resolve = createDiscoveryResolver({ locale: "ru", aliases: runtimeEntries, ...fixture() });
    assert.equal(resolve(pair[0]).status, "ambiguous");
  }
});

test("real review dates are required and reports do not depend on entry ordering", () => {
  const one = entry("collection", "learning", "label", "Обучение", "reviewed");
  const two = entry("need", "learn", "label", "Учиться");
  assert.deepEqual(validate([one, two]), validate([two, one]));
  one.review.date = "2026-02-30";
  assert.throws(() => validate([one]), /real ISO calendar date/);
  assert.throws(() => validate([{ ...two, id: 123 }]), /stable slug/);
});

test("human review is bound to the exact translated value, target, locale, and provenance", () => {
  const reviewed = entry("collection", "learning", "aliases", ["Учебные ресурсы"], "reviewed");
  for (const mutate of [
    (value) => { value.value = ["Новые ресурсы"]; },
    (value) => { value.locale = "es"; },
    (value) => { value.target.id = "making"; },
    (value) => { value.id = "different-entry"; },
    (value) => { value.source.revision = "abcdef0123456789abcdef0123456789abcdef01"; },
    (value) => { value.source.fields.title = "Making"; value.source.fingerprint = fingerprintCanonical(value.source.fields); },
    (value) => { value.translator.name = "Different synthetic translator"; },
  ]) {
    const changed = structuredClone(reviewed);
    mutate(changed);
    assert.throws(() => validate([changed]), /human review fingerprint does not match/);
  }
  const missing = structuredClone(reviewed);
  delete missing.review.fingerprint;
  assert.throws(() => validate([missing]), /missing fingerprint/);
  const label = entry("collection", "learning", "label", "Обучение", "reviewed");
  label.value = "Новое обучение";
  assert.throws(() => validate([label]), /renewed human review is required/);
  assert.throws(() => fingerprintTranslation({ value: "incomplete" }), /entry identity, value, source/);
});

test("offline report binds draft text, source provenance, translator, and actual review metadata", () => {
  const draft = entry();
  const report = validate([draft]).report.entries[0];
  assert.equal(report.sourceRevision, revision);
  assert.equal(report.sourceFingerprint, draft.source.fingerprint);
  assert.equal(report.translationFingerprint, fingerprintTranslation(draft));
  assert.deepEqual(report.translator, draft.translator);
  assert.equal(report.review, null);
  const revised = structuredClone(draft);
  revised.value = "Новое обучение";
  assert.notEqual(validate([revised]).report.entries[0].translationFingerprint, report.translationFingerprint);
  revised.source.revision = "abcdef0123456789abcdef0123456789abcdef01";
  assert.notEqual(validate([revised]).report.entries[0].sourceRevision, report.sourceRevision);
  const reviewed = entry("collection", "learning", "label", "Обучение", "reviewed");
  const reviewedReport = validate([reviewed]).report.entries[0];
  assert.deepEqual(reviewedReport.review, reviewed.review);
  reviewedReport.review.reviewer = "Mutation of report only";
  assert.equal(reviewed.review.reviewer, "Synthetic reviewer fixture");
});

test("literal ampersands and quotes in exact source titles and translations are plain text", () => {
  const canonical = fixture();
  canonical.catalog.categories[0].title = "Books & \"Reading\"";
  const sourceIndex = createContentSources(canonical);
  const label = entry("collection", "learning", "label", "Книги & \"Чтение\"", "reviewed");
  label.source.fields = structuredClone(sourceIndex.get(sourceKey("collection", "learning")).fields.label);
  label.source.fingerprint = fingerprintCanonical(label.source.fields);
  label.review.fingerprint = fingerprintTranslation(label);
  assert.equal(validate([label], sourceIndex).published[0].value, "Книги & \"Чтение\"");
  assert.equal(label.source.fields.title, "Books & \"Reading\"");
});

test("URL-looking canonical headings remain exact fingerprint-only source evidence", () => {
  const canonical = fixture();
  canonical.catalog.resources[0].section = "HTTP:// Reference & <script>";
  const sourceIndex = createContentSources(canonical);
  const label = entry("topic", JSON.stringify(["learning", "", "Getting Started"]), "label", "Примеры", "draft");
  label.target.id = JSON.stringify(["learning", "", canonical.catalog.resources[0].section]);
  label.source.fields = structuredClone(sourceIndex.get(sourceKey("topic", label.target.id)).fields.label);
  label.source.fingerprint = fingerprintCanonical(label.source.fields);
  label.status = "reviewed";
  label.review = { kind: "human", reviewer: "Synthetic reviewer fixture", date: "2026-10-17", fingerprint: fingerprintTranslation(label) };
  const result = validate([label], sourceIndex);
  assert.equal(result.published[0].value, "Примеры");
  assert(!Object.hasOwn(result.published[0], "source"));
  assert(!Object.hasOwn(result.published[0], "fields"));
  label.value = "HTTP:// Reference";
  assert.throws(() => validate([label], sourceIndex), /unsafe markup or URL in translated text/);
});
