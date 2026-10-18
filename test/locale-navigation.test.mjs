import assert from "node:assert/strict";
import test from "node:test";
import { canonicalLocaleCode, createLocaleUrl, createTranslator, preferredLocale, shouldRestoreLocale, supportedLocale } from "../site/locale-navigation.js";

const locales = [
  { code: "en", route: "/" }, { code: "ru", route: "/ru/" },
  { code: "es", route: "/es/" }, { code: "pt-BR", route: "/pt-br/" },
  { code: "zh-Hans", route: "/zh-hans/" }, { code: "ar", route: "/ar/" },
];

test("browser preferences match supported tags in order without guessing regions or scripts", () => {
  for (const [preferences, expected] of [
    [["es-MX", "en"], "es"], [["en-US", "es"], "en"], [["ru-RU"], "ru"],
    [["pt-br"], "pt-BR"], [["pt-PT"], undefined], [["zh-Hant-TW"], undefined],
    [["zh-Hans-CN"], "zh-Hans"], [["bad_tag", "ar-EG"], "ar"], [[], undefined], [null, undefined],
  ]) assert.equal(preferredLocale(preferences, locales)?.code, expected);
  assert.equal(canonicalLocaleCode("pt-br"), "pt-BR");
  assert.equal(canonicalLocaleCode({}), "");
  assert.equal(supportedLocale("ru-RU", locales), null);
});

test("language switching preserves public state and prefers explicitly shared fragment search", () => {
  const url = new URL(createLocaleUrl("https://akashic.egohygiene.io/?collection=work-and-learning&saved=1&view=text&q=legacy#catalog?q=shared+question", locales[2], "index.html"));
  assert.equal(url.pathname, "/es/");
  assert.equal(url.search, "?collection=work-and-learning&saved=1&view=text");
  assert.equal(url.hash, "#catalog?q=shared+question");
  const legacy = new URL(createLocaleUrl("https://example.com/?q=old+query&saved=1#catalog", locales[1], "index.html"));
  assert.equal(legacy.search, "?saved=1");
  assert.equal(legacy.hash, "#catalog?q=old+query");
  const atlas = new URL(createLocaleUrl("https://example.com/ar/atlas.html?place=us&theme=dark#resources", locales[0], "atlas.html"));
  assert.equal(atlas.pathname, "/atlas.html");
  assert.equal(atlas.search, "?place=us&theme=dark");
  assert.equal(atlas.hash, "#resources");
  assert.throws(() => createLocaleUrl(atlas, { route: "//evil.example/" }, "atlas.html"), /route/);
  assert.throws(() => createLocaleUrl(atlas, locales[0], "../../private"), /page/);
});

test("saved choice restores only canonical entries and never traps history navigation", () => {
  assert.equal(shouldRestoreLocale("en", "en", locales[1], "navigate"), true);
  assert.equal(shouldRestoreLocale("en", "en", locales[1], "back_forward"), false);
  assert.equal(shouldRestoreLocale("es", "en", locales[1], "navigate"), false);
  assert.equal(shouldRestoreLocale("en", "en", locales[0], "navigate"), false);
  assert.equal(shouldRestoreLocale("en", "en", null, "navigate"), false);
});

test("translation uses all Arabic CLDR categories, localized numbers, and safe fallback", () => {
  const messages = Object.fromEntries(["zero", "one", "two", "few", "many", "other"].map(category => [`unit.${category}`, `${category}: {count}`]));
  const translator = createTranslator("ar", messages, { greeting: "Hello {name}" });
  for (const count of [0, 1, 2, 3, 11, 100]) {
    assert.equal(translator.plural("unit", count), `${new Intl.PluralRules("ar").select(count)}: ${new Intl.NumberFormat("ar").format(count)}`);
  }
  assert.equal(translator.t("greeting", { name: "reader" }), "Hello reader");
  assert.throws(() => translator.t("missing"), /Unknown translation/);
  assert.equal(createTranslator("ru", { "unit.other": "local {count}" }, { "unit.few": "English {count}" }).plural("unit", 2), "local 2");
});

test("percentages keep locale digits, separators, spacing and small-share precision", () => {
  for (const code of ["en", "ru", "es", "fr", "pt-BR", "ar"]) {
    const translator = createTranslator(code, {});
    for (const value of [0, 0.074, 0.16]) {
      const digits = value < 0.1 ? 1 : 0;
      assert.equal(translator.percent(value), new Intl.NumberFormat(code, { style: "percent", minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value));
    }
    assert.equal(translator.percent(0.005), `<${new Intl.NumberFormat(code, { style: "percent", maximumFractionDigits: 0 }).format(0.01)}`);
  }
});
