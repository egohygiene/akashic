import assert from "node:assert/strict";
import test from "node:test";
import { atlasPlaceLabel, atlasSourceLanguages } from "../site/atlas-language.js";

test("place labels resolve independently without changing canonical geography or identity", () => {
  const place = Object.freeze({ id: "us-ma-wilmington", name: "Wilmington, Massachusetts", shortName: "Wilmington", parentId: "us-ma", geometry: Object.freeze({ dataset: "point", coordinates: Object.freeze([-71.1737, 42.5584]) }) });
  const before = JSON.stringify(place);
  const lookups = [];
  const lookup = (kind, id, canonical, field) => {
    lookups.push([kind, id, canonical, field]);
    return { text: field === "label" ? "Уилмингтон, Массачусетс" : canonical, lang: field === "label" ? "ru" : "en", translated: field === "label" };
  };
  assert.deepEqual(atlasPlaceLabel(place, "label", lookup), { text: "Уилмингтон, Массачусетс", lang: "ru", translated: true });
  assert.deepEqual(atlasPlaceLabel(place, "shortLabel", lookup), { text: "Wilmington", lang: "en", translated: false });
  assert.deepEqual(lookups, [["place", "us-ma-wilmington", "Wilmington, Massachusetts", "label"], ["place", "us-ma-wilmington", "Wilmington", "shortLabel"]]);
  assert.equal(JSON.stringify(place), before);
});

test("source-language hints use only explicit metadata and support multiple recorded languages", () => {
  const source = Object.freeze({ metadata: Object.freeze({ language: Object.freeze(["en-US", "fr", "en-US"]) }) });
  const hint = atlasSourceLanguages(source, "en", "Not recorded");
  assert.deepEqual(hint.codes, ["en-US", "fr"]);
  assert.deepEqual(hint.labels, ["American English", "French"]);
  assert.equal(hint.linkLanguage, "");
  assert.equal(atlasSourceLanguages({ metadata: { language: ["es"] } }, "fr", "Non renseignée").linkLanguage, "es");
  assert.deepEqual(atlasSourceLanguages({ metadata: { language: ["en"] } }, "ar", "غير مسجلة").labels, [new Intl.DisplayNames(["ar"], { type: "language" }).of("en")]);
});

test("place-only, missing, malformed, empty, and unsupported source languages stay unknown", () => {
  for (const resource of [null, {}, { url: "https://example.fr/English", locationId: "us" }, { metadata: {} }, { metadata: { language: [] } }, { metadata: { language: "en" } }, { metadata: { language: ["zz"] } }, { metadata: { language: ["invalid_language"] } }, { metadata: { language: [null] } }]) {
    assert.deepEqual(atlasSourceLanguages(resource, "ru", "Не указан"), { labels: ["Не указан"], codes: [], linkLanguage: "" });
  }
  assert.deepEqual(atlasSourceLanguages({ metadata: { language: ["en", "zz"] } }, "en", "Not recorded"), { labels: ["English", "Not recorded"], codes: ["en"], linkLanguage: "" });
  assert.equal(atlasSourceLanguages({ metadata: { language: ["mul"] } }, "en", "Not recorded").linkLanguage, "");
});
