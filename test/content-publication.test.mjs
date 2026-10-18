import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createContentSources, fingerprintCanonical, fingerprintTranslation, validateContentOverlays } from "../scripts/lib/content-overlays.mjs";
import { loadLocales, localizeHtml } from "../scripts/lib/i18n.mjs";
import { createContentLocalization } from "../site/content-localization.js";

const locales = await loadLocales(new URL("../site/", import.meta.url).pathname);
const russian = locales.locales.find(locale => locale.code === "ru");
const html = await readFile(new URL("../site/index.html", import.meta.url), "utf8");
const sources = createContentSources({ catalog: { categories: [{ slug: "work", title: "Work" }], resources: [] }, atlas: { locations: [] }, needs: [], englishMessages: {} });
function candidate(status = "draft") {
  const entry = {
    id: "synthetic-ru-work-label", locale: "ru", target: { kind: "collection", id: "work" }, field: "label", value: "Работа",
    source: { revision: "a".repeat(40), fields: { title: "Work" }, fingerprint: fingerprintCanonical({ title: "Work" }) },
    translator: { kind: "ai", name: "Synthetic test generator" }, status,
  };
  if (status === "reviewed") entry.review = { kind: "human", reviewer: "Synthetic test reviewer", date: "2026-10-18", fingerprint: fingerprintTranslation(entry) };
  return entry;
}
function publication(entries, sourceIndex = sources) {
  return validateContentOverlays({ schemaVersion: 1, sourceLanguage: "en", entries }, { sources: sourceIndex, locales }).published;
}
function page(entries) {
  return localizeHtml(html, russian, "index.html", { ...locales, contentOverlays: entries });
}

test("empty and draft overlays preserve the current generated interface without a content payload", () => {
  const baseline = localizeHtml(html, russian, "index.html", locales);
  assert.equal(page([]), baseline);
  assert.equal(page(publication([candidate()])), baseline);
  assert.doesNotMatch(baseline, /id="akashic-content-overlays"/);
});

test("only the validated reviewed-current projection reaches an active locale page", () => {
  const published = publication([candidate("reviewed")]);
  const generated = page(published);
  const payload = JSON.parse(generated.match(/id="akashic-content-overlays">([\s\S]*?)<\/script>/)[1]);
  assert.deepEqual(payload, published);
  assert.equal(payload[0].value, "Работа");
  assert.equal(payload[0].review, undefined);
  assert.equal(payload[0].translator, undefined);
  assert.equal(payload[0].source, undefined);
  assert.equal(createContentLocalization("ru", payload).label("collection", "work", "Work").lang, "ru");
  const english = locales.locales.find(locale => locale.code === "en");
  assert.doesNotMatch(localizeHtml(html, english, "index.html", { ...locales, contentOverlays: published }), /id="akashic-content-overlays"/);
});

test("changed or removed canonical targets cannot leave translated labels in generated pages", () => {
  const reviewed = candidate("reviewed");
  const changed = createContentSources({ catalog: { categories: [{ slug: "work", title: "Careers" }], resources: [] }, atlas: { locations: [] }, needs: [], englishMessages: {} });
  for (const current of [changed, new Map()]) {
    const published = publication([reviewed], current);
    assert.equal(published.length, 0);
    assert.doesNotMatch(page(published), /id="akashic-content-overlays"/);
    assert.deepEqual(createContentLocalization("ru", published).label("collection", "work", "Careers"), { text: "Careers", lang: "en", translated: false });
  }
});

test("embedded content JSON cannot close its script element", () => {
  // Defense in depth: the offline validator rejects this value before a real build.
  const entries = [{ locale: "ru", kind: "collection", id: "work", field: "label", value: "</script><script>unsafe()</script>", sourceLanguage: "en" }];
  const generated = page(entries);
  const payload = generated.match(/id="akashic-content-overlays">([\s\S]*?)<\/script>/)[1];
  assert.doesNotMatch(payload, /[<>]/);
  assert.deepEqual(JSON.parse(payload), entries);
});
