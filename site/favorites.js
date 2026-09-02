export const FAVORITES_KEY = "akashic-favorites-v2";
export const URL_FAVORITES_KEYS = ["akashic-favorites", "ego-awesome-favorites"];

function normalizeFavoriteUrl(value) {
  try {
    const url = new URL(value);
    url.hostname = url.hostname.toLocaleLowerCase("en-US").replace(/^www\./, "");
    if (url.pathname !== "/") url.pathname = url.pathname.replace(/\/+$/, "");
    return url.toString().replace(/^https?:\/\//, "").replace(/\/$/, "");
  } catch {
    return "";
  }
}

export function parseFavoriteTokens(value) {
  try {
    const parsed = JSON.parse(value || "null");
    return Array.isArray(parsed) ? parsed.filter((token) => typeof token === "string" && token) : null;
  } catch {
    return null;
  }
}

export function migrateFavoriteTokens(resources, tokens) {
  const resourceById = new Map(resources.map((resource) => [resource.id, resource]));
  const idByUrl = new Map();
  for (const resource of resources) {
    for (const url of [resource.url, ...(resource.aliases || [])]) {
      const normalized = normalizeFavoriteUrl(url);
      if (normalized) idByUrl.set(normalized, resource.id);
    }
  }
  const ids = new Set();
  for (const token of tokens) {
    if (resourceById.has(token)) ids.add(token);
    else {
      const id = idByUrl.get(normalizeFavoriteUrl(token));
      if (id) ids.add(id);
    }
  }
  return ids;
}
