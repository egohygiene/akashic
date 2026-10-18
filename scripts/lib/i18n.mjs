import { readFile } from "node:fs/promises";
import path from "node:path";

export const DEFAULT_LOCALE = "en";
export const LOCALE_LINKS_PLACEHOLDER = "<!-- akashic-locale-links -->";
export const LANGUAGE_SWITCHER_PLACEHOLDER = "<!-- akashic-language-switcher -->";
export const LOCALE_COVERAGE_PLACEHOLDER = "<!-- akashic-locale-coverage -->";

const SITE_ORIGIN = "https://akashic.egohygiene.io";
const HTML_PAGES = ["index.html", "dashboard.html", "atlas.html"];
const PLACEHOLDER_PATTERN = /\{([a-z][a-z0-9]*)\}/gi;
const PLURAL_CATEGORIES = ["zero", "one", "two", "few", "many", "other"];
const RESERVED_ROUTES = new Set(["/assets/", "/data/", "/i18n/", "/search/", "/intelligence/"]);

const escapeHtml = (value) => String(value).replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const isText = (value) => typeof value === "string" && Boolean(value.trim());
const placeholders = (message) => [...String(message).matchAll(PLACEHOLDER_PATTERN)].map((match) => match[1]).sort();
const interpolate = (message, values) => message.replace(PLACEHOLDER_PATTERN, (_, key) => Object.hasOwn(values, key) ? String(values[key]) : `{${key}}`);
const scriptJson = (value) => JSON.stringify(value).replace(/[<>&\u2028\u2029]/g, (character) => `\\u${character.charCodeAt(0).toString(16).padStart(4, "0")}`);

export function localePagePath(locale, page) {
  const fileName = page === "index.html" ? "" : page;
  return `${locale.route}${fileName}`;
}

export async function loadLocales(siteDirectory) {
  const i18nDirectory = path.join(siteDirectory, "i18n");
  const registry = JSON.parse(await readFile(path.join(i18nDirectory, "locales.json"), "utf8"));
  if (!isObject(registry) || registry.schemaVersion !== 1 || registry.defaultLocale !== DEFAULT_LOCALE || !Array.isArray(registry.locales) || !registry.locales.length || registry.locales.some((locale) => !isObject(locale))) throw new Error("Unsupported locale registry.");
  if (new Set(registry.locales.map((locale) => locale.code)).size !== registry.locales.length) throw new Error("Locale codes must be unique.");
  if (!registry.locales.some((locale) => locale.code === registry.defaultLocale)) throw new Error("The default locale is missing from the registry.");

  const catalogs = new Map();
  const localesByCode = new Map(registry.locales.map((locale) => [locale.code, locale]));
  const localeRoutes = new Set();
  for (const locale of registry.locales) {
    let canonicalCode;
    try { if (isText(locale.code)) [canonicalCode] = Intl.getCanonicalLocales(locale.code); } catch {}
    if (!canonicalCode || canonicalCode !== locale.code || !isText(locale.name) || !isText(locale.nativeName) || !["ltr", "rtl"].includes(locale.direction) || !["canonical", "reference", "reviewed", "draft"].includes(locale.status) || typeof locale.route !== "string" || !/^\/(?:[a-z0-9-]+\/)?$/.test(locale.route) || RESERVED_ROUTES.has(locale.route)) throw new Error(`Incomplete locale metadata: ${locale.code || "unknown"}.`);
    if (localeRoutes.has(locale.route)) throw new Error(`Locale routes must be unique: ${locale.route}.`);
    if (locale.code === registry.defaultLocale && (locale.route !== "/" || locale.fallback !== null || locale.status !== "canonical")) throw new Error("The default locale must own /, be canonical, and have no fallback.");
    if (locale.code !== registry.defaultLocale && (locale.route === "/" || locale.status === "canonical" || !localesByCode.has(locale.fallback) || locale.fallback === locale.code)) throw new Error(`Invalid fallback or canonical ownership for ${locale.code}.`);
    localeRoutes.add(locale.route);
  }

  for (const locale of registry.locales) {
    const visited = new Set();
    let current = locale;
    while (current.code !== registry.defaultLocale) {
      if (visited.has(current.code)) throw new Error(`Locale fallback cycle: ${locale.code}.`);
      visited.add(current.code);
      current = localesByCode.get(current.fallback);
    }
    const catalog = JSON.parse(await readFile(path.join(i18nDirectory, `${locale.code}.json`), "utf8"));
    if (!isObject(catalog) || catalog.locale !== locale.code || !isObject(catalog.messages)) throw new Error(`Invalid message catalog: ${locale.code}.`);
    catalogs.set(locale.code, catalog.messages);
  }

  const defaultMessages = catalogs.get(registry.defaultLocale);
  const defaultKeys = Object.keys(defaultMessages).sort();
  if (!defaultKeys.length) throw new Error("The canonical message catalog must not be empty.");
  const pluralFamilies = new Set(defaultKeys.flatMap((key) => {
    const match = key.match(/^(.*)\.(zero|one|two|few|many|other)$/);
    return match ? [match[1]] : [];
  }));
  for (const family of pluralFamilies) {
    for (const category of PLURAL_CATEGORIES) {
      if (!Object.hasOwn(defaultMessages, `${family}.${category}`)) throw new Error(`Incomplete plural family: ${family}.${category}.`);
    }
  }
  for (const [locale, messages] of catalogs) {
    const keys = Object.keys(messages).sort();
    if (JSON.stringify(keys) !== JSON.stringify(defaultKeys)) throw new Error(`Message-key parity failed for ${locale}.`);
    for (const key of keys) {
      if (!isText(messages[key])) throw new Error(`Message ${key} in ${locale} must be a non-empty string.`);
      if (JSON.stringify(placeholders(messages[key])) !== JSON.stringify(placeholders(defaultMessages[key]))) throw new Error(`Placeholder parity failed for ${locale}:${key}.`);
    }
    const staticTranslations = new Map();
    for (const key of keys.filter((key) => key.startsWith("static."))) {
      const source = defaultMessages[key];
      const target = messages[key];
      if (staticTranslations.has(source) && staticTranslations.get(source) !== target) throw new Error(`Conflicting static translation in ${locale}: ${source}.`);
      staticTranslations.set(source, target);
    }
  }
  return { ...registry, catalogs };
}

function localizeStaticMessages(html, locale, locales) {
  if (locale.code === locales.defaultLocale) return html;
  const source = locales.catalogs.get(locales.defaultLocale);
  const target = locales.catalogs.get(locale.code);
  const replacements = new Map();
  for (const key of Object.keys(source).filter((key) => key.startsWith("static.") && source[key] !== target[key])) {
    for (const spelling of new Set([source[key], escapeHtml(source[key])])) replacements.set(spelling, escapeHtml(target[key]));
  }
  if (!replacements.size) return html;
  const pattern = new RegExp([...replacements.keys()].sort((left, right) => right.length - left.length).map(escapeRegExp).join("|"), "g");
  const replaceMessages = (value) => value.replace(pattern, (match) => replacements.get(match));
  return html.replace(/<!--[\s\S]*?-->|<script\b[^>]*>[\s\S]*?<\/script\s*>|<style\b[^>]*>[\s\S]*?<\/style\s*>|<[^>]+>|[^<]+/gi, (chunk) => {
    if (/^<!--|^<(?:script|style)\b/i.test(chunk)) return chunk;
    if (chunk.startsWith("<")) return chunk.replace(/\b(aria-label|placeholder|content)="([^"]*)"/g, (_, attribute, value) => `${attribute}="${replaceMessages(value)}"`);
    return replaceMessages(chunk);
  });
}

function localeLinks(locales, page) {
  return locales.locales.map((locale) => {
    const pathName = localePagePath(locale, page);
    return `<link rel="alternate" hreflang="${escapeHtml(locale.code)}" href="${SITE_ORIGIN}${pathName}">`;
  }).concat(`<link rel="alternate" hreflang="x-default" href="${SITE_ORIGIN}${localePagePath(locales.locales.find((locale) => locale.code === locales.defaultLocale), page)}">`).join("\n    ");
}

function localeConfiguration(locales, activeLocale, page) {
  const config = {
    defaultLocale: locales.defaultLocale,
    activeLocale: activeLocale.code,
    page,
    locales: locales.locales.map((locale) => {
      const messages = locales.catalogs.get(locale.code);
      return {
        code: locale.code,
        nativeName: locale.nativeName,
        direction: locale.direction,
        route: locale.route,
        status: locale.status,
        offer: interpolate(messages["runtime.locale.offer"], { language: locale.nativeName }),
        use: interpolate(messages["runtime.locale.use"], { language: locale.nativeName }),
        dismiss: messages["runtime.locale.dismiss"],
        draftLabel: messages["runtime.locale.draftLabel"],
      };
    }),
  };
  const fallbackCatalogs = [];
  let fallback = activeLocale.fallback;
  while (fallback) {
    fallbackCatalogs.push(locales.catalogs.get(fallback));
    fallback = locales.locales.find((locale) => locale.code === fallback).fallback;
  }
  const messages = locales.catalogs.get(activeLocale.code);
  const fallbackMessages = fallbackCatalogs.length ? Object.assign({}, ...fallbackCatalogs.reverse()) : messages;
  const content = (locales.contentOverlays || []).filter((entry) => entry.locale === activeLocale.code);
  const contentScript = content.length ? `\n    <script type="application/json" id="akashic-content-overlays">${scriptJson(content)}</script>` : "";
  return `<script type="application/json" id="akashic-locale-config">${scriptJson(config)}</script>\n    <script type="application/json" id="akashic-i18n-messages">${scriptJson({ locale: activeLocale.code, messages, fallbackMessages })}</script>${contentScript}`;
}

function languageSwitcher(locales, activeLocale, page) {
  const messages = locales.catalogs.get(activeLocale.code);
  const label = escapeHtml(messages["static.common.languageSwitcher"]);
  const options = locales.locales.map((locale) => `<option value="${escapeHtml(locale.code)}" lang="${escapeHtml(locale.code)}" dir="${locale.direction}"${locale.code === activeLocale.code ? " selected" : ""}>${escapeHtml(locale.nativeName)}${locale.status === "draft" ? ` — ${escapeHtml(messages["runtime.locale.draftLabel"])}` : ""}</option>`).join("");
  const links = locales.locales.map((locale) => {
    const current = locale.code === activeLocale.code;
    return `<a href="${escapeHtml(localePagePath(locale, page))}" lang="${escapeHtml(locale.code)}" dir="${locale.direction}" hreflang="${escapeHtml(locale.code)}" data-locale="${escapeHtml(locale.code)}"${current ? ' aria-current="page"' : ""}>${escapeHtml(locale.nativeName)}</a>`;
  }).join("");
  return `<form class="language-switcher" id="language-form" hidden translate="no"><label for="language-select">${label}</label><select id="language-select">${options}</select><button id="language-apply" type="submit">${escapeHtml(messages["runtime.locale.apply"])}</button></form><details class="language-fallback" id="language-fallback" translate="no"><summary>${label}</summary><nav aria-label="${label}">${links}</nav></details>`;
}

function coverageNotice(locale, locales) {
  const suggestion = '<aside class="locale-suggestion" id="locale-suggestion" hidden></aside>';
  if (locale.code === locales.defaultLocale) return suggestion;
  const messages = locales.catalogs.get(locale.code);
  const hasContent = (locales.contentOverlays || []).some((entry) => entry.locale === locale.code);
  const coverageCopy = messages[hasContent ? "runtime.contentCoverage.copy" : "static.localeCoverage.copy"];
  const coverage = `<aside class="locale-coverage" id="locale-coverage"><strong>${escapeHtml(messages["static.localeCoverage.title"])}</strong><p>${escapeHtml(coverageCopy)}</p></aside>`;
  const draft = locale.status === "draft" ? `<aside class="locale-draft" id="locale-draft"><strong>${escapeHtml(messages["runtime.locale.draftTitle"])}</strong><p>${escapeHtml(messages["runtime.locale.draftCopy"])}</p></aside>` : "";
  return `${suggestion}${coverage}${draft}`;
}

function prefixSharedAssets(html) {
  return html
    .replace(/((?:href|src)=")((?:assets\/|i18n\/)[^"]+|(?:styles|dashboard|atlas|app|mind-map|search|i18n)\.(?:css|js))"/g, "$1../$2\"")
    .replace(/href="intelligence\//g, 'href="../intelligence/');
}

export function localizeHtml(sourceHtml, locale, page, locales) {
  if (!HTML_PAGES.includes(page)) throw new Error(`Unsupported localized page: ${page}.`);
  let html = localizeStaticMessages(sourceHtml, locale, locales);
  const pagePath = localePagePath(locale, page);
  const canonicalUrl = `${SITE_ORIGIN}${pagePath}`;
  html = html
    .replace(/<html lang="[^"]+"(?: dir="[^"]+")?>/, `<html lang="${locale.code}" dir="${locale.direction}">`)
    .replace(/<link rel="canonical" href="[^"]+">/, `<link rel="canonical" href="${canonicalUrl}">`)
    .replace(/<meta property="og:url" content="[^"]+">/, `<meta property="og:url" content="${canonicalUrl}">`)
    .replace(LOCALE_LINKS_PLACEHOLDER, () => `${localeLinks(locales, page)}\n    ${localeConfiguration(locales, locale, page)}`)
    .replace(LANGUAGE_SWITCHER_PLACEHOLDER, () => languageSwitcher(locales, locale, page))
    .replace(LOCALE_COVERAGE_PLACEHOLDER, () => coverageNotice(locale, locales));
  if (locale.code !== locales.defaultLocale) html = prefixSharedAssets(html);
  return html;
}
