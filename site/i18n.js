import { createLocaleUrl, createTranslator, preferredLocale, shouldRestoreLocale, supportedLocale } from "./locale-navigation.js";

const LOCALE_STORAGE_KEY = "akashic-locale";
function readJson(id) {
  try { return JSON.parse(document.getElementById(id)?.textContent || "null"); } catch { return null; }
}
function readPreference() {
  try { return localStorage.getItem(LOCALE_STORAGE_KEY); } catch { return null; }
}

const config = readJson("akashic-locale-config");
const defaultLocale = config?.defaultLocale || "en";
const activeLocale = config?.activeLocale || document.documentElement.lang || defaultLocale;
const snapshot = readJson("akashic-i18n-messages");
let messages = snapshot?.locale === activeLocale ? snapshot.messages : null;
let fallbackMessages = snapshot?.fallbackMessages;

// Older cached HTML has no embedded snapshot; retain its EN/RU runtime path.
if (!messages) {
  const codes = activeLocale === defaultLocale ? [activeLocale] : [activeLocale, defaultLocale];
  const results = await Promise.allSettled(codes.map(async code => {
    const response = await fetch(new URL(`./i18n/${code}.json`, import.meta.url));
    if (!response.ok) throw new Error("Translation messages could not be loaded.");
    return (await response.json()).messages;
  }));
  messages = results[0].status === "fulfilled" ? results[0].value : {};
  fallbackMessages = results.at(-1).status === "fulfilled" ? results.at(-1).value : {};
}

const translator = createTranslator(activeLocale, messages, fallbackMessages || messages);
export const t = translator.t;
export const plural = translator.plural;
export const number = translator.number;
export const percent = translator.percent;
export const locale = activeLocale;
export const canonicalContentLanguage = activeLocale === defaultLocale ? "" : defaultLocale;

const locales = config?.locales || [];
const active = supportedLocale(activeLocale, locales);
let explicitChoice = supportedLocale(readPreference(), locales);
const form = document.getElementById("language-form");
const select = document.getElementById("language-select");
const fallback = document.getElementById("language-fallback");
const suggestion = document.getElementById("locale-suggestion");

function remember(target) {
  explicitChoice = target;
  try { localStorage.setItem(LOCALE_STORAGE_KEY, target.code); } catch {}
}
function hideSuggestion(returnFocus = false) {
  if (suggestion) suggestion.hidden = true;
  if (returnFocus) select?.focus({ preventScroll: true });
}
function chooseLocale(target) {
  remember(target);
  hideSuggestion(target.code === activeLocale);
  if (target.code !== activeLocale) location.assign(createLocaleUrl(location.href, target, config.page));
}

for (const link of document.querySelectorAll("[data-locale]")) {
  link.addEventListener("click", event => {
    const target = supportedLocale(link.dataset.locale, locales);
    if (target) {
      link.href = createLocaleUrl(location.href, target, config.page);
      remember(target);
      if (!event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey && event.button === 0) {
        event.preventDefault();
        chooseLocale(target);
      }
    } else if (!config) {
      const destination = new URL(link.href);
      const page = destination.pathname.match(/(?:dashboard|atlas)\.html$/)?.[0] || "index.html";
      const route = destination.pathname.replace(/[^/]+\.html$/, "");
      link.href = createLocaleUrl(location.href, { route }, page);
      remember({ code: link.dataset.locale });
    }
  });
}

function showSuggestion() {
  hideSuggestion();
  if (!suggestion || !active || explicitChoice || activeLocale !== defaultLocale) return;
  const target = preferredLocale(navigator.languages?.length ? navigator.languages : [navigator.language], locales);
  if (!target || target.code === activeLocale) return;
  suggestion.lang = target.code;
  suggestion.dir = target.direction;
  const copy = document.createElement("p");
  copy.textContent = target.offer;
  const actions = document.createElement("div");
  actions.className = "locale-suggestion-actions";
  if (target.status === "draft") {
    const badge = document.createElement("span");
    badge.className = "locale-draft-badge";
    badge.textContent = target.draftLabel;
    actions.append(badge);
  }
  const accept = document.createElement("button");
  accept.type = "button";
  accept.textContent = target.use;
  accept.addEventListener("click", () => chooseLocale(target));
  const dismiss = document.createElement("button");
  dismiss.type = "button";
  dismiss.textContent = target.dismiss;
  dismiss.addEventListener("click", () => chooseLocale(active));
  actions.append(accept, dismiss);
  suggestion.replaceChildren(copy, actions);
  suggestion.hidden = false;
}

if (config && active && form && select) {
  form.addEventListener("submit", event => {
    event.preventDefault();
    const target = supportedLocale(select.value, locales);
    if (target) chooseLocale(target);
  });
  form.hidden = false;
  if (fallback) fallback.hidden = true;
  const navigationType = performance.getEntriesByType?.("navigation")[0]?.type;
  if (shouldRestoreLocale(activeLocale, defaultLocale, explicitChoice, navigationType)) {
    location.replace(createLocaleUrl(location.href, explicitChoice, config.page));
  } else {
    showSuggestion();
  }
  addEventListener("languagechange", showSuggestion);
}
