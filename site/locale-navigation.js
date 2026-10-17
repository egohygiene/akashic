import { readSharedSearchQuery } from "./search-query-state.js";

export function canonicalLocaleCode(value) {
  if (typeof value !== "string" || !value.trim()) return "";
  try { return Intl.getCanonicalLocales(value)[0] || ""; } catch { return ""; }
}

export function supportedLocale(value, locales) {
  const code = canonicalLocaleCode(value);
  return locales.find(candidate => candidate.code === code) || null;
}

// Match ordered browser preferences without guessing between regions or scripts.
export function preferredLocale(preferences, locales) {
  for (const preference of Array.isArray(preferences) ? preferences : []) {
    let code = canonicalLocaleCode(preference);
    while (code) {
      const match = supportedLocale(code, locales);
      if (match) return match;
      code = code.includes("-") ? code.slice(0, code.lastIndexOf("-")) : "";
    }
  }
  return null;
}

export function createLocaleUrl(currentUrl, target, page) {
  if (!/^\/(?:[a-z0-9-]+\/)?$/.test(target?.route || "")) throw new Error("Invalid locale route.");
  if (!["index.html", "dashboard.html", "atlas.html"].includes(page)) throw new Error("Invalid locale page.");
  const current = new URL(String(currentUrl));
  const destination = new URL(`${target.route}${page === "index.html" ? "" : page}`, current.origin);
  destination.search = current.search;
  destination.searchParams.delete("q");
  destination.hash = current.hash;
  const separator = current.hash.indexOf("?");
  const fragmentQuery = separator < 0 ? "" : new URLSearchParams(current.hash.slice(separator + 1)).get("q");
  const legacyQuery = new URLSearchParams(current.search).get("q");
  if (!fragmentQuery && legacyQuery?.trim()) {
    destination.hash = `catalog?${new URLSearchParams({ q: readSharedSearchQuery(current.search, current.hash) })}`;
  }
  return destination.toString();
}

export function shouldRestoreLocale(activeCode, defaultCode, saved, navigationType) {
  return Boolean(saved && saved.code !== activeCode && activeCode === defaultCode && navigationType !== "back_forward");
}

export function createTranslator(code, messages, fallbackMessages = {}) {
  const formatter = new Intl.NumberFormat(code);
  const pluralRules = new Intl.PluralRules(code);
  const percentFormatters = [0, 1].map(digits => new Intl.NumberFormat(code, { style: "percent", minimumFractionDigits: digits, maximumFractionDigits: digits }));
  const number = value => formatter.format(value);
  const percent = value => value > 0 && value < 0.01 ? `<${percentFormatters[0].format(0.01)}` : percentFormatters[value < 0.1 ? 1 : 0].format(value);
  const t = (key, values = {}) => {
    const message = messages[key] ?? fallbackMessages[key];
    if (typeof message !== "string") throw new Error(`Unknown translation message: ${key}`);
    return message.replace(/\{([a-z][a-z0-9]*)\}/gi, (_, name) => Object.hasOwn(values, name) ? String(values[name]) : `{${name}}`);
  };
  const plural = (key, count, values = {}) => {
    const exact = `${key}.${pluralRules.select(count)}`;
    const other = `${key}.other`;
    const selected = Object.hasOwn(messages, exact) ? exact : Object.hasOwn(messages, other) ? other
      : Object.hasOwn(fallbackMessages, exact) ? exact : other;
    return t(selected, { count: number(count), ...values });
  };
  return { t, plural, number, percent };
}
