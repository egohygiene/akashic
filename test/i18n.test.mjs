import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { loadLocales, localePagePath, localizeHtml } from "../scripts/lib/i18n.mjs";

const root = process.cwd();
const siteDirectory = path.join(root, "site");

test("locale registry and catalogs have complete key and placeholder parity", async () => {
  const locales = await loadLocales(siteDirectory);
  assert.equal(locales.defaultLocale, "en");
  assert.deepEqual(locales.locales.map((locale) => locale.code), ["en", "ru"]);
  assert.equal(locales.locales.find((locale) => locale.code === "ru").fallback, "en");
  assert.equal(Object.keys(locales.catalogs.get("en")).length, Object.keys(locales.catalogs.get("ru")).length);
});

test("localized routes keep shared assets single-copy and expose accessible language navigation", async () => {
  const locales = await loadLocales(siteDirectory);
  const russian = locales.locales.find((locale) => locale.code === "ru");
  const source = await readFile(path.join(siteDirectory, "index.html"), "utf8");
  const html = localizeHtml(source, russian, "index.html", locales);
  assert.match(html, /<html lang="ru" dir="ltr">/);
  assert.match(html, /href="\.\.\/styles\.css"/);
  assert.match(html, /src="\.\.\/app\.js"/);
  assert.match(html, /<nav class="language-switcher" aria-label="Язык"/);
  assert.match(html, /lang="en" hreflang="en"/);
  assert.match(html, /lang="ru" hreflang="ru"[^>]+aria-current="page"/);
  assert.match(html, /class="locale-coverage"/);
  assert.match(html, /Знания должны быть/);
  assert.equal(localePagePath(russian, "index.html"), "/ru/");
  assert.equal(localePagePath(russian, "atlas.html"), "/ru/atlas.html");
});

test("English remains the untranslated canonical default with a saved-locale redirect", async () => {
  const locales = await loadLocales(siteDirectory);
  const english = locales.locales.find((locale) => locale.code === "en");
  const source = await readFile(path.join(siteDirectory, "dashboard.html"), "utf8");
  const html = localizeHtml(source, english, "dashboard.html", locales);
  assert.match(html, /<html lang="en" dir="ltr">/);
  assert.match(html, /See the shape of/);
  assert.doesNotMatch(html, /class="locale-coverage"/);
  assert.match(html, /localStorage\.getItem\("akashic-locale"\)/);
  assert.match(html, /href="\/ru\/dashboard\.html"/);
});
