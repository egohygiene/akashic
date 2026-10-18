import assert from "node:assert/strict";
import test from "node:test";
import { createDiscoveryResolver } from "../site/discovery-search.js";

const catalog = {
  categories: [{ slug: "work", title: "Work and Learning", groups: [{ slug: "", title: "Work and Learning", sections: [{ title: "Remote Paid Work" }] }] }],
  resources: [{ id: "dataannotation", title: "DataAnnotation", domain: "dataannotation.tech", url: "https://dataannotation.tech/" }],
};
const needs = [{ id: "work", query: "find work or job support" }];
const alias = (kind, id, value, extra = {}) => ({ locale: "ru", kind, id, field: "aliases", value, sourceLanguage: "en", ...extra });

test("discovery aliases bridge whole canonical collection, topic, and need targets", () => {
  const aliases = [
    alias("collection", "work", ["работа и обучение"]),
    alias("topic", JSON.stringify(["work", "", "Remote Paid Work"]), ["удалённая работа", "удалённая paid work"]),
    alias("need", "work", ["мне нужна работа"]),
  ];
  const resolve = createDiscoveryResolver({ locale: "ru", aliases, catalog, needs });
  assert.deepEqual(resolve("  РАБОТА  и обучение "), { query: "Work and Learning", target: { kind: "collection", id: "work" }, status: "mapped" });
  assert.equal(resolve("удалённая работа").query, "Remote Paid Work");
  assert.equal(resolve("удалённая paid work").status, "mapped");
  assert.equal(resolve("мне нужна работа").query, needs[0].query);
  assert.deepEqual(resolve("мне нужна работа Boston"), { query: "мне нужна работа Boston", status: "unchanged" });
  assert.equal(resolve("не мне нужна работа").status, "unchanged");
  assert.equal(catalog.categories[0].title, "Work and Learning");
  assert.deepEqual(aliases[0].value, ["работа и обучение"]);
});

test("ambiguous aliases across targets preserve the original query even with equal canonical text", () => {
  const resolve = createDiscoveryResolver({ locale: "ru", catalog, needs, aliases: [
    alias("collection", "work", ["работа"]), alias("need", "work", ["работа"]),
  ] });
  assert.deepEqual(resolve("Работа"), { query: "Работа", status: "ambiguous" });
  const duplicate = createDiscoveryResolver({ locale: "ru", catalog, needs, aliases: [alias("need", "work", ["работа", "Работа"])] });
  assert.equal(duplicate("работа").status, "mapped");
});

test("synthetic root groups resolve to the same empty-group canonical topic tuple as the source validator", () => {
  const withRootGroup = structuredClone(catalog);
  withRootGroup.categories[0].groups[0].slug = "__root__";
  const resolve = createDiscoveryResolver({ locale: "ru", catalog: withRootGroup, aliases: [alias("topic", JSON.stringify(["work", "", "Remote Paid Work"]), ["удалённая работа"])] });
  assert.equal(resolve("удалённая работа").query, "Remote Paid Work");
});

test("exact resource identifiers, titles, domains, and URLs cannot be captured by aliases", () => {
  const protectedQueries = ["dataannotation", "DataAnnotation", "dataannotation.tech", "https://dataannotation.tech/"];
  const resolve = createDiscoveryResolver({ locale: "ru", catalog, needs, aliases: [alias("need", "work", protectedQueries)] });
  for (const query of protectedQueries) assert.deepEqual(resolve(query), { query, status: "protected" });
});

test("missing, unknown, malformed, draft, stale, and other-locale aliases fail closed", () => {
  const aliases = [
    alias("need", "work", ["draft"], { status: "draft" }),
    alias("need", "work", ["stale"], { status: "stale" }),
    alias("need", "work", ["other"], { locale: "es" }),
    alias("need", "work", ["wrong-language"], { sourceLanguage: "ru" }),
    alias("need", "work", ["wrong-field"], { field: "label" }),
    alias("need", "missing", ["missing"]),
    alias("resource", "dataannotation", ["wrong-kind"]),
    alias("need", "work", ["", "malformed"]),
    null,
  ];
  const resolve = createDiscoveryResolver({ locale: "ru", aliases, catalog, needs });
  for (const query of ["draft", "stale", "other", "wrong-language", "wrong-field", "missing", "wrong-kind", "malformed"]) assert.equal(resolve(query).status, "unchanged");
  assert.deepEqual(createDiscoveryResolver()("x"), { query: "x", status: "unchanged" });
  assert.equal(createDiscoveryResolver({ locale: "ru", catalog, aliases: {} })("x").query, "x");
});

test("English locale stays canonical and phrase matching does not stem or fold diacritics", () => {
  const aliases = [alias("need", "work", ["работа"], { locale: "en" })];
  assert.equal(createDiscoveryResolver({ locale: "en", aliases, catalog, needs })("работа").status, "unchanged");
  const resolve = createDiscoveryResolver({ locale: "ru", aliases: [alias("need", "work", ["удалённая работа"])], catalog, needs });
  assert.equal(resolve("удаленная работа").status, "unchanged");
  assert.equal(resolve("удалённая работа!").status, "unchanged");
});
