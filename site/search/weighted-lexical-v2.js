import { SEARCH_CONCEPTS } from "./concepts-v1.js";

export const SEARCH_ALGORITHM_ID = "weighted-lexical-v2";

const MATCH_EXPLANATION_SCHEMA_VERSION = 1;
const MINIMUM_SEARCH_SCORE = 6;

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
const FIELD_ENTRIES = Object.freeze(Object.entries(FIELD_WEIGHTS));

const URGENCY_SIGNALS = Object.freeze([
  { kind: "immediate", phrases: ["today", "tonight", "right now", "now", "immediately", "urgent", "emergency", "stranded"] },
  { kind: "deadline", phrases: ["deadline", "due date", "hearing", "court paper", "court notice", "eviction notice", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] },
]);

const ACCESS_NEED_SIGNALS = Object.freeze([
  { id: "no-cost", phrases: ["free", "no cost", "no money", "no income", "cannot afford", "cant afford", "without paying"] },
  { id: "low-cost", phrases: ["low cost", "affordable", "cheap"] },
  { id: "no-car", phrases: ["without a car", "no car"] },
  { id: "older-device", phrases: ["old laptop", "old computer", "old phone", "older device", "low spec"] },
  { id: "low-bandwidth", phrases: ["low bandwidth", "slow internet", "limited data", "offline"] },
  { id: "no-account", phrases: ["no account", "without an account", "no signup", "without signing up"] },
  { id: "mobility-accessible", phrases: ["wheelchair", "paratransit", "mobility accessible"] },
]);

const ACCESS_QUERY_TERMS = Object.freeze({
  "no-cost": "free",
  "low-cost": "affordable",
  "no-car": "without a car",
  "older-device": "old device",
  "low-bandwidth": "low bandwidth",
  "no-account": "without an account",
  "mobility-accessible": "wheelchair accessible",
});

const NON_LOCATION_LEADS = new Set(["court", "danger", "debt", "jail", "need", "pain", "school", "trouble", "work"]);

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

function wordRangeMatches(text, start, end, term) {
  const wordLength = end - start;
  if (wordLength !== term.length && term.length < 5) return false;
  const comparisonLength = Math.min(wordLength, term.length);
  for (let index = 0; index < comparisonLength; index += 1) {
    if (text[start + index] !== term[index]) return false;
  }
  return true;
}

function termMatches(text, term) {
  if (!term) return false;
  if (term.includes(" ")) return text.includes(term);
  let start = 0;
  while (start < text.length) {
    const boundary = text.indexOf(" ", start);
    const end = boundary === -1 ? text.length : boundary;
    if (wordRangeMatches(text, start, end, term)) return true;
    start = end + 1;
  }
  return false;
}

function phraseIsPresent(normalized, phrase) {
  const normalizedPhrase = normalizeSearchText(phrase);
  return ` ${normalized} `.includes(` ${normalizedPhrase} `);
}

function matchedPhrases(normalized, phrases) {
  const matches = phrases.filter((phrase) => phraseIsPresent(normalized, phrase));
  return matches.filter((phrase) => !matches.some((other) => other !== phrase
    && normalizeSearchText(other).length > normalizeSearchText(phrase).length
    && phraseIsPresent(normalizeSearchText(other), phrase)));
}

function matchSearchConcepts(normalized) {
  return SEARCH_CONCEPTS.filter((concept) => concept.triggers.some((trigger) => normalized.includes(normalizeSearchText(trigger))));
}

function extractUrgency(normalized) {
  const signals = URGENCY_SIGNALS.flatMap(({ kind, phrases }) => matchedPhrases(normalized, phrases)
    .map((phrase) => ({ kind, text: normalizeSearchText(phrase) })));
  const level = signals.some((signal) => signal.kind === "immediate")
    ? "immediate"
    : signals.some((signal) => signal.kind === "deadline") ? "deadline-sensitive" : "unspecified";
  return { level, signals };
}

function extractLocation(query) {
  const raw = String(query || "").trim();
  if (!raw) return null;
  const boundary = "today|tonight|right\\s+now|now|without|with|because|but|and|who|that|while|for|at|from|before|after|during|i|we|my|our|need|want|looking";
  const clauseMatch = raw.match(new RegExp(`\\b(?:near|around|in)\\s+(.+?)(?=\\s+(?:${boundary})\\b|[?;!]|\\.$|$)`, "iu"));
  const commaMatch = raw.match(/([\p{Uppercase_Letter}][\p{Letter}\p{Mark}.'-]*(?:\s+[\p{Uppercase_Letter}][\p{Letter}\p{Mark}.'-]*){0,2},\s*[\p{Uppercase_Letter}][\p{Letter}\p{Mark}.'-]*(?:\s+[\p{Uppercase_Letter}][\p{Letter}\p{Mark}.'-]*){0,2})/u);
  const zipMatch = raw.match(/\b\d{5}(?:-\d{4})?\b/);
  let text = clauseMatch?.[1] || commaMatch?.[1] || zipMatch?.[0] || "";
  text = text
    .replace(new RegExp(`\\s+(?:${boundary})\\b.*$`, "iu"), "")
    .replace(/^[\s,]+|[\s,.]+$/g, "")
    .replace(/^the\s+/iu, "")
    .trim();
  const normalized = normalizeSearchText(text);
  const locationTerms = normalized.split(" ").filter(Boolean);
  if (!normalized || locationTerms.length > 6 || NON_LOCATION_LEADS.has(locationTerms[0])) return null;
  return {
    text,
    normalized,
    source: /^\d{5}(?:-\d{4})?$/.test(text)
      ? "postal-code"
      : clauseMatch ? "prepositional-span" : "place-name-span",
  };
}

function extractAccessNeeds(normalized) {
  return ACCESS_NEED_SIGNALS.flatMap(({ id, phrases }) => {
    const signals = matchedPhrases(normalized, phrases).map(normalizeSearchText);
    return signals.length ? [{ id, signals }] : [];
  });
}

function buildSubqueries(originalTerms, concepts, location, accessNeeds) {
  const subqueries = [];
  const seen = new Set();
  const add = (value) => {
    const normalized = normalizeSearchText(value);
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    subqueries.push(value.trim().replace(/\s+/g, " "));
  };
  add(originalTerms.join(" "));
  for (const concept of concepts) add(concept.suggestion);

  const constraints = accessNeeds.map(({ id }) => ACCESS_QUERY_TERMS[id]).filter(Boolean);
  for (const concept of concepts) {
    const distinctConstraints = constraints.filter((constraint) => !phraseIsPresent(normalizeSearchText(concept.suggestion), constraint));
    add([concept.suggestion, ...distinctConstraints, location?.normalized].filter(Boolean).join(" "));
  }
  if (!concepts.length) add([originalTerms.join(" "), ...constraints, location?.normalized].filter(Boolean).join(" "));
  return subqueries.slice(0, 6);
}

export function decomposeSearchQuery(query) {
  const normalizedQuery = normalizeSearchText(query);
  const originalTerms = [...new Set(terms(query))];
  const concepts = matchSearchConcepts(normalizedQuery);
  const location = extractLocation(query);
  const accessNeeds = extractAccessNeeds(normalizedQuery);
  return {
    schemaVersion: 1,
    normalizedQuery,
    intents: concepts.map((concept) => concept.id),
    urgency: extractUrgency(normalizedQuery),
    location,
    accessNeeds,
    subqueries: buildSubqueries(originalTerms, concepts, location, accessNeeds),
  };
}

export function compileSearchQuery(query) {
  const decomposition = decomposeSearchQuery(query);
  const normalized = decomposition.normalizedQuery;
  const originalTerms = [...new Set(terms(query))];
  const concepts = matchSearchConcepts(normalized);
  const weightedTerms = new Map(originalTerms.map((term) => [term, 1]));
  for (const concept of concepts) {
    for (const expansion of concept.expansions) {
      const normalizedExpansion = normalizeSearchText(expansion);
      weightedTerms.set(normalizedExpansion, Math.max(weightedTerms.get(normalizedExpansion) || 0, 0.7));
    }
  }
  return { normalized, originalTerms, concepts, weightedTerms: [...weightedTerms], decomposition };
}

export function buildSearchIndex(resource) {
  return Object.fromEntries(FIELD_ENTRIES.map(([field]) => [field, normalizeSearchText(resource[field])]));
}

function termOrigin(term, compiled) {
  return {
    query: compiled.originalTerms.includes(term),
    conceptIds: compiled.concepts
      .filter((concept) => concept.expansions.some((expansion) => normalizeSearchText(expansion) === term))
      .map((concept) => concept.id),
  };
}

function buildMatchExplanation(compiled, scoreBeforeCoverage, finalScore, coverage, coverageMultiplier, matchedOriginalTerms, matchedTerms, boosts, excludedReason) {
  return {
    schemaVersion: MATCH_EXPLANATION_SCHEMA_VERSION,
    searchAlgorithm: SEARCH_ALGORITHM_ID,
    score: finalScore,
    scoreBeforeCoverage,
    minimumScore: MINIMUM_SEARCH_SCORE,
    included: finalScore >= MINIMUM_SEARCH_SCORE,
    coverage: {
      matchedOriginalTerms,
      unmatchedOriginalTerms: compiled.originalTerms.filter((term) => !matchedOriginalTerms.includes(term)),
      ratio: coverage,
      multiplier: coverageMultiplier,
    },
    matchedTerms,
    boosts,
    excludedReason,
  };
}

function evaluateResource(resource, compiled, includeExplanation) {
  const index = resource.searchIndex || buildSearchIndex(resource);
  let score = 0;
  let matchedOriginalTerms = 0;
  const matchedOriginalTermValues = includeExplanation ? [] : null;
  const matchedTerms = includeExplanation ? [] : null;
  const boosts = includeExplanation ? [] : null;

  for (const [term, termWeight] of compiled.weightedTerms) {
    let bestFieldWeight = 0;
    let creditedField = null;
    const matchedFields = includeExplanation ? [] : null;
    for (const [field, fieldWeight] of FIELD_ENTRIES) {
      if (!termMatches(index[field], term)) continue;
      if (includeExplanation) matchedFields.push({ field, fieldWeight });
      if (fieldWeight > bestFieldWeight) {
        bestFieldWeight = fieldWeight;
        creditedField = field;
      }
    }
    const contribution = bestFieldWeight * termWeight;
    score += contribution;
    const isOriginalTerm = compiled.originalTerms.includes(term);
    if (isOriginalTerm && bestFieldWeight > 0) {
      matchedOriginalTerms += 1;
      if (includeExplanation) matchedOriginalTermValues.push(term);
    }
    if (includeExplanation && contribution > 0) {
      matchedTerms.push({
        term,
        origin: termOrigin(term, compiled),
        termWeight,
        matchedFields,
        creditedField,
        contribution,
      });
    }
  }

  const coverage = compiled.originalTerms.length ? matchedOriginalTerms / compiled.originalTerms.length : 1;
  const coverageMultiplier = 0.62 + coverage * 0.38;
  if (!compiled.normalized) {
    return includeExplanation
      ? buildMatchExplanation(compiled, score, 0, coverage, coverageMultiplier, matchedOriginalTermValues, matchedTerms, boosts, "empty-query")
      : 0;
  }
  if (!compiled.concepts.length && compiled.originalTerms.length > 2 && coverage < 0.34) {
    return includeExplanation
      ? buildMatchExplanation(compiled, score, 0, coverage, coverageMultiplier, matchedOriginalTermValues, matchedTerms, boosts, "low-query-coverage")
      : 0;
  }
  if (compiled.normalized) {
    if (index.title === compiled.normalized) {
      score += 36;
      if (includeExplanation) boosts.push({ id: "exact-query-title", field: "title", contribution: 36 });
    } else if (index.title.includes(compiled.normalized)) {
      score += 22;
      if (includeExplanation) boosts.push({ id: "query-title-substring", field: "title", contribution: 22 });
    }
    if (index.section.includes(compiled.normalized)) {
      score += 14;
      if (includeExplanation) boosts.push({ id: "query-topic-substring", field: "section", contribution: 14 });
    }
    if (index.description.includes(compiled.normalized)) {
      score += 5;
      if (includeExplanation) boosts.push({ id: "query-description-substring", field: "description", contribution: 5 });
    }
  }
  for (const concept of compiled.concepts) {
    for (const priority of concept.priorities || []) {
      const normalizedPriority = normalizeSearchText(priority);
      if (index.title === normalizedPriority) {
        score += 90;
        if (includeExplanation) boosts.push({ id: "concept-priority-exact-title", conceptId: concept.id, priority: normalizedPriority, field: "title", contribution: 90 });
      } else if (normalizedPriority.length >= 8 && index.title.includes(normalizedPriority)) {
        score += 64;
        if (includeExplanation) boosts.push({ id: "concept-priority-title-substring", conceptId: concept.id, priority: normalizedPriority, field: "title", contribution: 64 });
      }
    }
  }
  if (!score) {
    return includeExplanation
      ? buildMatchExplanation(compiled, score, 0, coverage, coverageMultiplier, matchedOriginalTermValues, matchedTerms, boosts, "no-weighted-match")
      : 0;
  }
  if (index.section === "start here") {
    score += 11;
    if (includeExplanation) boosts.push({ id: "start-here-topic", field: "section", contribution: 11 });
  }
  const finalScore = score * coverageMultiplier;
  return includeExplanation
    ? buildMatchExplanation(compiled, score, finalScore, coverage, coverageMultiplier, matchedOriginalTermValues, matchedTerms, boosts, finalScore < MINIMUM_SEARCH_SCORE ? "below-minimum-score" : null)
    : finalScore;
}

export function scoreResource(resource, compiled) {
  return evaluateResource(resource, compiled, false);
}

export function explainResourceMatch(resource, queryOrCompiled) {
  const compiled = typeof queryOrCompiled === "string" ? compileSearchQuery(queryOrCompiled) : queryOrCompiled;
  if (!compiled || !Array.isArray(compiled.originalTerms) || !Array.isArray(compiled.weightedTerms)) throw new TypeError("A query string or compiled search query is required.");
  return evaluateResource(resource, compiled, true);
}

function rankedResourceEntries(resources, compiled) {
  return resources
    .map((resource, index) => ({ resource, index, score: scoreResource(resource, compiled) }))
    .filter((entry) => entry.score >= MINIMUM_SEARCH_SCORE)
    .sort((left, right) => right.score - left.score || left.index - right.index);
}

export function searchResources(resources, query) {
  const compiled = compileSearchQuery(query);
  if (!compiled.normalized) return [...resources];
  return rankedResourceEntries(resources, compiled).map((entry) => entry.resource);
}

export function searchResourcesWithExplanations(resources, query, limit = 10) {
  if (!Number.isInteger(limit) || limit < 1) throw new TypeError("Explanation limit must be a positive integer.");
  const compiled = compileSearchQuery(query);
  const ranked = compiled.normalized
    ? rankedResourceEntries(resources, compiled).slice(0, limit)
    : resources.slice(0, limit).map((resource, index) => ({ resource, index, score: 0 }));
  return ranked.map(({ resource, score }) => ({
    resource,
    score,
    explanation: explainResourceMatch(resource, compiled),
  }));
}

export function suggestedQueries(query, limit = 4) {
  const compiled = compileSearchQuery(query);
  const preferred = compiled.concepts.map((concept) => concept.suggestion);
  const defaults = ["food today", "housing or eviction help", "court paper legal help", "find work or job support"];
  return [...new Set([...preferred, ...defaults])].slice(0, limit);
}
