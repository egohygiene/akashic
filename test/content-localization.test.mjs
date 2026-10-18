import assert from "node:assert/strict";
import test from "node:test";
import { contentTopicId, createContentLocalization } from "../site/content-localization.js";

test("content labels use exact stable identities without changing canonical data", () => {
  const id = contentTopicId("work", "", "Start Here");
  assert.equal(id, '["work","","Start Here"]');
  const canonical = { title: "Start Here" };
  const localizer = createContentLocalization("ru", [
    { locale: "ru", kind: "topic", id, field: "label", value: "Начните здесь", sourceLanguage: "en" },
    { locale: "es", kind: "topic", id, field: "label", value: "Empieza aquí", sourceLanguage: "en" },
  ]);
  assert.deepEqual(localizer.label("topic", id, canonical.title), { text: "Начните здесь", lang: "ru", translated: true });
  assert.deepEqual(localizer.label("topic", contentTopicId("work", "branch", "Start Here"), canonical.title), { text: "Start Here", lang: "en", translated: false });
  assert.equal(canonical.title, "Start Here");
});

test("missing, malformed, raw draft, and stale authored records cannot publish client labels", () => {
  const entry = { locale: "ru", kind: "collection", id: "work", field: "label", value: "Работа", sourceLanguage: "en" };
  for (const records of [undefined, null, {}, [null], [{ ...entry, status: "draft" }], [{ ...entry, status: "stale" }], [{ ...entry, review: {} }], [{ ...entry, field: "description" }], [{ ...entry, sourceLanguage: "fr" }], [{ ...entry, value: " " }]]) {
    assert.deepEqual(createContentLocalization("ru", records).label("collection", "work", "Work"), { text: "Work", lang: "en", translated: false });
  }
});

test("aliases are locale-scoped publication records with independent copies", () => {
  const entry = { locale: "ru", kind: "need", id: "work", field: "aliases", value: ["работа"], sourceLanguage: "en" };
  const localizer = createContentLocalization("ru", [entry]);
  entry.value.push("later mutation");
  const result = localizer.aliases();
  assert.deepEqual(result[0].value, ["работа"]);
  result[0].value.push("changed");
  assert.deepEqual(localizer.aliases()[0].value, ["работа"]);
});
