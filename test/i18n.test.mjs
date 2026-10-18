import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { loadLocales, localePagePath, localizeHtml } from "../scripts/lib/i18n.mjs";

const root = process.cwd();
const siteDirectory = path.join(root, "site");
const pluralCategories = ["zero", "one", "two", "few", "many", "other"];
const english = { code: "en", name: "English", nativeName: "English", direction: "ltr", route: "/", status: "canonical", fallback: null };
const french = { code: "fr", name: "French", nativeName: "Français", direction: "ltr", route: "/fr/", status: "draft", fallback: "en" };
const portuguese = { code: "pt-BR", name: "Brazilian Portuguese", nativeName: "Português (Brasil)", direction: "ltr", route: "/pt-br/", status: "draft", fallback: "fr" };
const baseMessages = {
  "static.common.languageSwitcher": "Language",
  "static.localeCoverage.title": "Translated interface, English catalog",
  "static.localeCoverage.copy": "Curated content remains in English.",
  "runtime.locale.apply": "Apply",
  "runtime.locale.offer": "Use {language}?",
  "runtime.locale.use": "Use {language}",
  "runtime.locale.dismiss": "Keep English",
  "runtime.locale.draftLabel": "AI draft",
  "runtime.locale.draftTitle": "AI translation draft",
  "runtime.locale.draftCopy": "This translation needs human language review.",
  ...Object.fromEntries(pluralCategories.map((category) => [`runtime.unit.resource.${category}`, "{count} resources"])),
};

async function fixture(t, { locales = [english, french], catalogs, registry } = {}) {
  const directory = await mkdtemp(path.join(os.tmpdir(), "akashic-i18n-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await mkdir(path.join(directory, "i18n"));
  await writeFile(path.join(directory, "i18n", "locales.json"), JSON.stringify(registry ?? { schemaVersion: 1, defaultLocale: "en", locales }));
  for (const locale of locales) {
    const catalog = catalogs?.[locale.code] ?? { locale: locale.code, messages: { ...baseMessages } };
    await writeFile(path.join(directory, "i18n", `${locale.code}.json`), JSON.stringify(catalog));
  }
  return directory;
}

function embeddedJson(html, id) {
  const match = html.match(new RegExp(`<script type="application/json" id="${id}">([\\s\\S]*?)<\\/script>`));
  assert.ok(match, `Missing #${id}`);
  return JSON.parse(match[1]);
}

const sourceHtml = '<html lang="en"><head><link rel="canonical" href="https://akashic.egohygiene.io/"><meta property="og:url" content="https://akashic.egohygiene.io/"><!-- akashic-locale-links --><link href="styles.css"><script type="module" src="app.js"></script></head><body><!-- akashic-language-switcher --><!-- akashic-locale-coverage --></body></html>';

test("published locales keep complete message and placeholder parity without a language allowlist", async () => {
  const locales = await loadLocales(siteDirectory);
  assert.equal(locales.defaultLocale, "en");
  assert.ok(locales.locales.length > 1);
  const expectedKeys = Object.keys(locales.catalogs.get(locales.defaultLocale)).sort();
  for (const locale of locales.locales) {
    assert.deepEqual(Object.keys(locales.catalogs.get(locale.code)).sort(), expectedKeys);
    for (const family of ["resource", "collection", "topic", "branch"]) {
      for (const category of pluralCategories) assert.ok(locales.catalogs.get(locale.code)[`runtime.unit.${family}.${category}`]);
    }
  }
});

test("every registered locale receives native explicit language controls and shared root assets", async () => {
  const locales = await loadLocales(siteDirectory);
  const source = await readFile(path.join(siteDirectory, "index.html"), "utf8");
  for (const locale of locales.locales) {
    const html = localizeHtml(source, locale, "index.html", locales);
    assert.ok(html.includes(`<html lang="${locale.code}" dir="${locale.direction}">`));
    assert.match(html, /<form class="language-switcher" id="language-form" hidden/);
    assert.match(html, /<label for="language-select">/);
    assert.match(html, /<select id="language-select">/);
    assert.match(html, /id="language-apply" type="submit"/);
    assert.match(html, /<details class="language-fallback" id="language-fallback"/);
    assert.ok(html.includes(`data-locale="${locale.code}" aria-current="page"`));
    assert.match(html, /id="locale-suggestion" hidden/);
    const form = html.match(/<form class="language-switcher"[\s\S]*?<\/form>/)[0];
    assert.doesNotMatch(form, /\bname=|\baction=/);
    assert.equal(html.includes('id="locale-coverage"'), locale.code !== locales.defaultLocale);
    assert.equal(html.includes('id="locale-draft"'), locale.status === "draft");
    if (locale.code !== locales.defaultLocale) {
      assert.match(html, /href="\.\.\/styles\.css"/);
      assert.match(html, /src="\.\.\/app\.js"/);
    }
    for (const alternate of locales.locales) {
      assert.ok(html.includes(`hreflang="${alternate.code}" href="https://akashic.egohygiene.io${alternate.route}"`));
    }
    const config = embeddedJson(html, "akashic-locale-config");
    assert.equal(config.activeLocale, locale.code);
    assert.equal(config.page, "index.html");
    assert.deepEqual(config.locales.map((entry) => entry.code), locales.locales.map((entry) => entry.code));
    const payload = embeddedJson(html, "akashic-i18n-messages");
    assert.equal(payload.locale, locale.code);
    assert.deepEqual(payload.messages, locales.catalogs.get(locale.code));
  }
});

test("regional tags, RTL direction, and ordered fallback chains need no build special cases", async (t) => {
  const arabic = { code: "ar", name: "Arabic", nativeName: "العربية", direction: "rtl", route: "/ar/", status: "draft", fallback: "en" };
  const locales = await loadLocales(await fixture(t, {
    locales: [english, french, portuguese, arabic],
    catalogs: {
      fr: { locale: "fr", messages: { ...baseMessages, "runtime.locale.apply": "Choisir" } },
      "pt-BR": { locale: "pt-BR", messages: { ...baseMessages, "runtime.locale.apply": "Aplicar" } },
    },
  }));
  const html = localizeHtml(sourceHtml, portuguese, "atlas.html", locales);
  const payload = embeddedJson(html, "akashic-i18n-messages");
  assert.equal(payload.fallbackMessages["runtime.locale.apply"], "Choisir");
  assert.equal(localePagePath(portuguese, "index.html"), "/pt-br/");
  assert.equal(localePagePath(portuguese, "atlas.html"), "/pt-br/atlas.html");
  assert.match(localizeHtml(sourceHtml, arabic, "dashboard.html", locales), /<html lang="ar" dir="rtl">/);
  assert.match(html, /value="ar" lang="ar" dir="rtl"/);
});

test("malformed registries, ambiguous routes, and invalid fallback graphs fail before publishing", async (t) => {
  const cases = [
    { registry: null, error: /Unsupported locale registry/ },
    { registry: { schemaVersion: 1, defaultLocale: "en", locales: [null] }, error: /Unsupported locale registry/ },
    { locales: [english, { ...french, code: "FR" }], error: /Incomplete locale metadata/ },
    { locales: [english, { ...french, route: "/data/" }], error: /Incomplete locale metadata/ },
    { locales: [english, { ...french, route: "/fr/nested/" }], error: /Incomplete locale metadata/ },
    { locales: [english, french, { ...portuguese, route: "/fr/" }], error: /Locale routes must be unique/ },
    { locales: [english, { ...french, fallback: "unknown" }], error: /Invalid fallback/ },
    { locales: [english, { ...french, fallback: "pt-BR" }, portuguese], error: /fallback cycle/ },
    { locales: [{ ...english, status: "draft" }, french], error: /default locale must/ },
  ];
  for (const [index, entry] of cases.entries()) {
    await t.test(`invalid registry ${index + 1}`, async (subtest) => {
      const directory = await fixture(subtest, entry);
      if (entry.registry === null) await writeFile(path.join(directory, "i18n", "locales.json"), "null");
      await assert.rejects(loadLocales(directory), entry.error);
    });
  }
});

test("catalog validation rejects unsafe shapes, empty values, placeholder drift, and missing plural forms", async (t) => {
  const cases = [
    { catalog: { locale: "fr", messages: "not an object" }, error: /Invalid message catalog/ },
    { catalog: { locale: "fr", messages: [] }, error: /Invalid message catalog/ },
    { catalog: { locale: "fr", messages: { ...baseMessages, "runtime.locale.apply": " " } }, error: /non-empty string/ },
    { catalog: { locale: "fr", messages: { ...baseMessages, "runtime.locale.offer": "Use {name}?" } }, error: /Placeholder parity/ },
    { catalog: { locale: "fr", messages: { ...baseMessages, extra: "Unexpected" } }, error: /Message-key parity/ },
  ];
  for (const [index, entry] of cases.entries()) {
    await t.test(`invalid catalog ${index + 1}`, async (subtest) => {
      const directory = await fixture(subtest, { catalogs: { fr: entry.catalog } });
      await assert.rejects(loadLocales(directory), entry.error);
    });
  }
  const incomplete = { ...baseMessages };
  delete incomplete["runtime.unit.resource.two"];
  const directory = await fixture(t, { catalogs: { en: { locale: "en", messages: incomplete }, fr: { locale: "fr", messages: incomplete } } });
  await assert.rejects(loadLocales(directory), /Incomplete plural family/);
});

test("static translation is a single escaped pass and does not rewrite scripts, styles, or URLs", async (t) => {
  const en = { ...baseMessages, "static.test.alpha": "Alpha", "static.test.beta": "Beta" };
  const fr = { ...en, "static.test.alpha": 'Beta <script> & "quoted"', "static.test.beta": "Gamma" };
  const locales = await loadLocales(await fixture(t, { catalogs: { en: { locale: "en", messages: en }, fr: { locale: "fr", messages: fr } } }));
  const source = sourceHtml.replace("</body>", '<p>Alpha</p><input aria-label="Alpha" placeholder="Alpha"><a href="/Alpha">Beta</a><script>const label = "Alpha";</script><style>.Alpha { color: red; }</style><!-- Alpha --></body>');
  const html = localizeHtml(source, french, "index.html", locales);
  assert.match(html, /<p>Beta &lt;script&gt; &amp; &quot;quoted&quot;<\/p>/);
  assert.match(html, /aria-label="Beta &lt;script&gt; &amp; &quot;quoted&quot;"/);
  assert.match(html, /href="\/Alpha">Gamma<\/a>/);
  assert.match(html, /<script>const label = "Alpha";<\/script>/);
  assert.match(html, /<style>\.Alpha \{ color: red; \}<\/style>/);
  assert.match(html, /<!-- Alpha -->/);
});

test("embedded translation snapshots safely round-trip script-like text and translated offers", async (t) => {
  const maliciousText = '</script><script>alert("draft")</script>\u2028&';
  const fr = { ...baseMessages, "runtime.locale.draftCopy": maliciousText };
  const locales = await loadLocales(await fixture(t, { catalogs: { fr: { locale: "fr", messages: fr } } }));
  const html = localizeHtml(sourceHtml, french, "index.html", locales);
  assert.doesNotMatch(html, /<script>alert/);
  assert.equal(embeddedJson(html, "akashic-i18n-messages").messages["runtime.locale.draftCopy"], maliciousText);
  const config = embeddedJson(html, "akashic-locale-config");
  assert.equal(config.locales.find((locale) => locale.code === "fr").offer, "Use Français?");
  assert.equal(config.locales.find((locale) => locale.code === "fr").use, "Use Français");
});

test("English remains canonical and does not contain a build-generated preference redirect", async () => {
  const locales = await loadLocales(siteDirectory);
  const locale = locales.locales.find((entry) => entry.code === locales.defaultLocale);
  const source = await readFile(path.join(siteDirectory, "dashboard.html"), "utf8");
  const html = localizeHtml(source, locale, "dashboard.html", locales);
  assert.match(html, /<html lang="en" dir="ltr">/);
  assert.match(html, /See the shape of/);
  assert.doesNotMatch(html, /id="locale-coverage"/);
  assert.doesNotMatch(html, /location\.replace|localStorage\.getItem\("akashic-locale"\)/);
  assert.equal(embeddedJson(html, "akashic-i18n-messages").locale, "en");
});
