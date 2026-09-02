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

function termMatches(text, term) {
  if (!term) return false;
  if (term.includes(" ")) return text.includes(term);
  return text.split(" ").some((candidate) => candidate === term || (term.length >= 5 && (candidate.startsWith(term) || term.startsWith(candidate))));
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
