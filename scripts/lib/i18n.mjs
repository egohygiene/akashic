import { readFile } from "node:fs/promises";
import path from "node:path";

export const DEFAULT_LOCALE = "en";
export const LOCALE_LINKS_PLACEHOLDER = "<!-- akashic-locale-links -->";
export const LANGUAGE_SWITCHER_PLACEHOLDER = "<!-- akashic-language-switcher -->";
export const LOCALE_COVERAGE_PLACEHOLDER = "<!-- akashic-locale-coverage -->";

const SITE_ORIGIN = "https://akashic.egohygiene.io";
const HTML_PAGES = ["index.html", "dashboard.html", "atlas.html"];
const PLACEHOLDER_PATTERN = /\{([a-z][a-z0-9]*)\}/gi;

const escapeHtml = (value) => String(value).replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);

const placeholders = (message) => [...String(message).matchAll(PLACEHOLDER_PATTERN)].map((match) => match[1]).sort();

export function localePagePath(locale, page) {
  const fileName = page === "index.html" ? "" : page;
  return `${locale.route}${fileName}`;
}

export async function loadLocales(siteDirectory) {
  const i18nDirectory = path.join(siteDirectory, "i18n");
  const registry = JSON.parse(await readFile(path.join(i18nDirectory, "locales.json"), "utf8"));
  if (registry.schemaVersion !== 1 || registry.defaultLocale !== DEFAULT_LOCALE || !Array.isArray(registry.locales)) throw new Error("Unsupported locale registry.");
  if (new Set(registry.locales.map((locale) => locale.code)).size !== registry.locales.length) throw new Error("Locale codes must be unique.");
  if (!registry.locales.some((locale) => locale.code === registry.defaultLocale)) throw new Error("The default locale is missing from the registry.");

  const catalogs = new Map();
  const localeCodes = new Set(registry.locales.map((locale) => locale.code));
  const localeRoutes = new Set();
  for (const locale of registry.locales) {
    let canonicalCode;
    try { [canonicalCode] = Intl.getCanonicalLocales(locale.code); } catch {}
    if (canonicalCode !== locale.code || !locale.name || !locale.nativeName || !["ltr", "rtl"].includes(locale.direction) || !["canonical", "reference", "reviewed", "draft"].includes(locale.status) || !/^\/(?:[a-z0-9-]+\/)?$/.test(locale.route)) throw new Error(`Incomplete locale metadata: ${locale.code || "unknown"}.`);
    if (localeRoutes.has(locale.route)) throw new Error(`Locale routes must be unique: ${locale.route}.`);
    if (locale.code === registry.defaultLocale && (locale.route !== "/" || locale.fallback !== null)) throw new Error("The default locale must own / and have no fallback.");
    if (locale.code !== registry.defaultLocale && (!localeCodes.has(locale.fallback) || locale.fallback === locale.code)) throw new Error(`Invalid fallback for ${locale.code}.`);
    localeRoutes.add(locale.route);
    const catalog = JSON.parse(await readFile(path.join(i18nDirectory, `${locale.code}.json`), "utf8"));
    if (catalog.locale !== locale.code || !catalog.messages || Array.isArray(catalog.messages)) throw new Error(`Invalid message catalog: ${locale.code}.`);
    catalogs.set(locale.code, catalog.messages);
  }

  const defaultMessages = catalogs.get(registry.defaultLocale);
  const defaultKeys = Object.keys(defaultMessages).sort();
  for (const [locale, messages] of catalogs) {
    const keys = Object.keys(messages).sort();
    if (JSON.stringify(keys) !== JSON.stringify(defaultKeys)) throw new Error(`Message-key parity failed for ${locale}.`);
    for (const key of keys) {
      if (typeof messages[key] !== "string" || !messages[key].trim()) throw new Error(`Message ${key} in ${locale} must be a non-empty string.`);
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
  const replacements = Object.keys(source)
    .filter((key) => key.startsWith("static.") && source[key] !== target[key])
    .map((key) => [source[key], target[key]])
    .sort((left, right) => right[0].length - left[0].length);
  const replaceMessages = (value) => {
    for (const [english, translation] of replacements) value = value.replaceAll(english, translation);
    return value;
  };
  html = html.replace(/(<[^>]+>)|([^<]+)/g, (chunk, tag, text) => tag || replaceMessages(text));
  return html.replace(/\b(aria-label|placeholder|content)="([^"]*)"/g, (_, attribute, value) => `${attribute}="${replaceMessages(value)}"`);
}

function localeLinks(locales, page) {
  return locales.locales.map((locale) => {
    const pathName = localePagePath(locale, page);
    return `<link rel="alternate" hreflang="${escapeHtml(locale.code)}" href="${SITE_ORIGIN}${pathName}">`;
  }).concat(`<link rel="alternate" hreflang="x-default" href="${SITE_ORIGIN}${localePagePath(locales.locales.find((locale) => locale.code === locales.defaultLocale), page)}">`).join("\n    ");
}

function preferenceRedirect(locales, activeLocale, page) {
  if (activeLocale.code !== locales.defaultLocale) return "";
  const routes = Object.fromEntries(locales.locales.filter((locale) => locale.code !== locales.defaultLocale).map((locale) => [locale.code, localePagePath(locale, page)]));
  return `<script>try{const l=localStorage.getItem("akashic-locale"),r=${JSON.stringify(routes)};if(r[l])location.replace(r[l]+location.search+location.hash)}catch{}</script>`;
}

function languageSwitcher(locales, activeLocale, page) {
  const messages = locales.catalogs.get(activeLocale.code);
  const links = locales.locales.map((locale) => {
    const current = locale.code === activeLocale.code;
    const href = localePagePath(locale, page);
    return `<a href="${escapeHtml(href)}" lang="${escapeHtml(locale.code)}" hreflang="${escapeHtml(locale.code)}" data-locale="${escapeHtml(locale.code)}"${current ? ' aria-current="page"' : ""}>${escapeHtml(locale.nativeName)}</a>`;
  }).join("");
  return `<nav class="language-switcher" aria-label="${escapeHtml(messages["static.common.languageSwitcher"])}" translate="no"><span aria-hidden="true">文</span>${links}</nav>`;
}

function coverageNotice(locale, locales) {
  if (locale.code === locales.defaultLocale) return "";
  const messages = locales.catalogs.get(locale.code);
  return `<aside class="locale-coverage" id="locale-coverage"><strong>${escapeHtml(messages["static.localeCoverage.title"])}</strong><p>${escapeHtml(messages["static.localeCoverage.copy"])}</p></aside>`;
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
    .replace(LOCALE_LINKS_PLACEHOLDER, `${localeLinks(locales, page)}\n    ${preferenceRedirect(locales, locale, page)}`)
    .replace(LANGUAGE_SWITCHER_PLACEHOLDER, languageSwitcher(locales, locale, page))
    .replace(LOCALE_COVERAGE_PLACEHOLDER, coverageNotice(locale, locales));
  if (locale.code !== locales.defaultLocale) html = prefixSharedAssets(html);
  return html;
}
