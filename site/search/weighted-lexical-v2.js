import { SEARCH_CONCEPTS } from "./concepts-v1.js";

export const SEARCH_ALGORITHM_ID = "weighted-lexical-v2";

const STOP_WORDS = new Set([
  "a", "an", "and", "another", "are", "be", "but", "can", "could", "do", "does", "for", "from", "have", "how", "i", "in", "is", "it", "me", "my", "of", "on", "or", "please", "says", "some", "somewhere", "that", "the", "this", "to", "want", "what", "where", "with", "would",
]);

const FIELD_WEIGHTS = Object.freeze({
  title: 12,
  section: 8,
  groupTitle: 6,
  category: 5,
  description: 2.25,
  domain: 1,
});

export function normalizeSearchText(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/\p{Mark}/gu, "")
    .toLocaleLowerCase("en-US")
    .replace(/['’]/g, "")
    .replace(/[^\p{Letter}\p{Number}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function terms(value) {
  return normalizeSearchText(value).split(" ").filter((term) => term && !STOP_WORDS.has(term));
}

function termMatches(text, term) {
  if (!term) return false;
  if (term.includes(" ")) return text.includes(term);
  return text.split(" ").some((candidate) => candidate === term || (term.length >= 5 && (candidate.startsWith(term) || term.startsWith(candidate))));
}

export function compileSearchQuery(query) {
  const normalized = normalizeSearchText(query);
  const originalTerms = [...new Set(terms(query))];
  const concepts = SEARCH_CONCEPTS.filter((concept) => concept.triggers.some((trigger) => normalized.includes(normalizeSearchText(trigger))));
  const weightedTerms = new Map(originalTerms.map((term) => [term, 1]));
  for (const concept of concepts) {
    for (const expansion of concept.expansions) {
      const normalizedExpansion = normalizeSearchText(expansion);
      weightedTerms.set(normalizedExpansion, Math.max(weightedTerms.get(normalizedExpansion) || 0, 0.7));
    }
  }
  return { normalized, originalTerms, concepts, weightedTerms: [...weightedTerms] };
}

export function buildSearchIndex(resource) {
  return Object.fromEntries(Object.keys(FIELD_WEIGHTS).map((field) => [field, normalizeSearchText(resource[field])]));
}

export function scoreResource(resource, compiled) {
  const index = resource.searchIndex || buildSearchIndex(resource);
  let score = 0;
  let matchedOriginalTerms = 0;

  for (const [term, termWeight] of compiled.weightedTerms) {
    let bestFieldWeight = 0;
    for (const [field, fieldWeight] of Object.entries(FIELD_WEIGHTS)) {
      if (termMatches(index[field], term)) bestFieldWeight = Math.max(bestFieldWeight, fieldWeight);
    }
    score += bestFieldWeight * termWeight;
    if (compiled.originalTerms.includes(term) && bestFieldWeight > 0) matchedOriginalTerms += 1;
  }

  const coverage = compiled.originalTerms.length ? matchedOriginalTerms / compiled.originalTerms.length : 1;
  if (!compiled.concepts.length && compiled.originalTerms.length > 2 && coverage < 0.34) return 0;
  if (compiled.normalized) {
    if (index.title === compiled.normalized) score += 36;
    else if (index.title.includes(compiled.normalized)) score += 22;
    if (index.section.includes(compiled.normalized)) score += 14;
    if (index.description.includes(compiled.normalized)) score += 5;
  }
  for (const concept of compiled.concepts) {
    for (const priority of concept.priorities || []) {
      const normalizedPriority = normalizeSearchText(priority);
      if (index.title === normalizedPriority) score += 90;
      else if (normalizedPriority.length >= 8 && index.title.includes(normalizedPriority)) score += 64;
    }
  }
  if (!score) return 0;
  if (index.section === "start here") score += 11;
  return score * (0.62 + coverage * 0.38);
}

export function searchResources(resources, query) {
  const compiled = compileSearchQuery(query);
  if (!compiled.normalized) return [...resources];
  return resources
    .map((resource, index) => ({ resource, index, score: scoreResource(resource, compiled) }))
    .filter((entry) => entry.score >= 6)
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .map((entry) => entry.resource);
}

export function suggestedQueries(query, limit = 4) {
  const compiled = compileSearchQuery(query);
  const preferred = compiled.concepts.map((concept) => concept.suggestion);
  const defaults = ["food today", "housing or eviction help", "court paper legal help", "find work or job support"];
  return [...new Set([...preferred, ...defaults])].slice(0, limit);
}
