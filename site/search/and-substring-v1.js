// Frozen research baseline. Add a new version instead of changing this algorithm.
export const SEARCH_ALGORITHM_ID = "and-substring-v1";

const SEARCH_FIELDS = ["title", "description", "category", "groupTitle", "section", "domain"];

export function buildSearchText(resource) {
  return SEARCH_FIELDS.map((field) => resource[field] || "").join(" ").toLocaleLowerCase("en-US");
}

export function queryTerms(query) {
  return query.toLocaleLowerCase("en-US").split(/\s+/).filter(Boolean);
}

export function createAndSubstringMatcher(query) {
  const terms = queryTerms(query);
  return (resource) => {
    const searchText = resource.searchText || buildSearchText(resource);
    return terms.every((term) => searchText.includes(term));
  };
}
