export function sharedSearchAnchor(hash = "") {
  const value = String(hash || "");
  const parameterStart = value.indexOf("?");
  return parameterStart === -1 ? value : value.slice(0, parameterStart);
}

export function readSharedSearchQuery(search = "", hash = "") {
  const parameterStart = String(hash || "").indexOf("?");
  const fragmentQuery = parameterStart === -1
    ? ""
    : new URLSearchParams(String(hash).slice(parameterStart + 1)).get("q");
  const legacyQuery = new URLSearchParams(search).get("q");
  return String(fragmentQuery || legacyQuery || "").trim();
}

export function createSearchShareUrl(url, query, anchor = "#catalog") {
  const sharedUrl = new URL(String(url));
  const normalizedQuery = String(query || "").trim();
  const normalizedAnchor = sharedSearchAnchor(anchor) || "#catalog";
  sharedUrl.searchParams.delete("q");
  sharedUrl.hash = normalizedQuery
    ? `${normalizedAnchor.replace(/^#/, "")}?${new URLSearchParams({ q: normalizedQuery })}`
    : normalizedAnchor;
  return sharedUrl.toString();
}
