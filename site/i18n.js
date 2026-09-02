const LOCALE_STORAGE_KEY = "akashic-locale";
const DEFAULT_LOCALE = "en";
const activeLocale = document.documentElement.lang || DEFAULT_LOCALE;

const catalogUrl = new URL(`./i18n/${activeLocale}.json`, import.meta.url);
const fallbackUrl = new URL(`./i18n/${DEFAULT_LOCALE}.json`, import.meta.url);
const [catalogResponse, fallbackResponse] = await Promise.all([
  fetch(catalogUrl),
  activeLocale === DEFAULT_LOCALE ? Promise.resolve(null) : fetch(fallbackUrl),
]);
if (!catalogResponse.ok || (fallbackResponse && !fallbackResponse.ok)) throw new Error("Translation messages could not be loaded.");
const messages = (await catalogResponse.json()).messages;
const fallbackMessages = fallbackResponse ? (await fallbackResponse.json()).messages : messages;
const numberFormatter = new Intl.NumberFormat(activeLocale);
const pluralRules = new Intl.PluralRules(activeLocale);

function interpolate(message, values) {
  return message.replace(/\{([a-z][a-z0-9]*)\}/gi, (_, key) => Object.hasOwn(values, key) ? String(values[key]) : `{${key}}`);
}

export function t(key, values = {}) {
  const message = messages[key] ?? fallbackMessages[key];
  if (typeof message !== "string") throw new Error(`Unknown translation message: ${key}`);
  return interpolate(message, values);
}

export function plural(key, count, values = {}) {
  const category = pluralRules.select(count);
  const messageKey = `${key}.${category}`;
  const fallbackKey = `${key}.other`;
  return t(Object.hasOwn(messages, messageKey) ? messageKey : fallbackKey, { count: number(count), ...values });
}

export function number(value) {
  return numberFormatter.format(value);
}

export const locale = activeLocale;
export const canonicalContentLanguage = activeLocale === DEFAULT_LOCALE ? "" : DEFAULT_LOCALE;

for (const link of document.querySelectorAll("[data-locale]")) {
  link.addEventListener("click", () => {
    try { localStorage.setItem(LOCALE_STORAGE_KEY, link.dataset.locale); } catch {}
    const destination = new URL(link.href);
    const searchParameters = new URLSearchParams(location.search);
    const legacyQuery = searchParameters.get("q");
    searchParameters.delete("q");
    destination.search = searchParameters;
    destination.hash = legacyQuery ? `catalog?${new URLSearchParams({ q: legacyQuery })}` : location.hash;
    link.href = destination;
  });
}
