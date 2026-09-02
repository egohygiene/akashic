import {
  decomposeSearchQuery,
  explainResourceMatch,
  normalizeSearchText,
  searchResources as searchWeightedResources,
} from "../../../site/search/weighted-lexical-v2.js";

export const SEARCH_ALGORITHM_ID = "decomposition-rrf-v1";
export const FUSION_CANDIDATE_DEPTH = 10;
export const RECIPROCAL_RANK_CONSTANT = 60;

function resourceKey(resource) {
  return resource.id || resource.url || resource;
}

export function fusionQueries(query) {
  const decomposition = decomposeSearchQuery(query);
  const seen = new Set();
  return [query, ...decomposition.subqueries].filter((candidate) => {
    const normalized = normalizeSearchText(candidate);
    if (!normalized || seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
}

export function fuseRankings(rankings, candidateDepth = FUSION_CANDIDATE_DEPTH, rankConstant = RECIPROCAL_RANK_CONSTANT) {
  if (!Number.isInteger(candidateDepth) || candidateDepth < 1) throw new TypeError("Fusion candidate depth must be a positive integer.");
  if (!Number.isFinite(rankConstant) || rankConstant < 0) throw new TypeError("Reciprocal-rank constant must be a non-negative number.");

  const fused = new Map();
  let firstSeen = 0;
  for (const [queryIndex, ranking] of rankings.entries()) {
    for (const [index, resource] of ranking.slice(0, candidateDepth).entries()) {
      const rank = index + 1;
      const key = resourceKey(resource);
      if (!fused.has(key)) {
        fused.set(key, {
          resource,
          score: 0,
          bestRank: rank,
          firstSeen: firstSeen++,
          contributions: [],
        });
      }
      const entry = fused.get(key);
      const contribution = 1 / (rankConstant + rank);
      entry.score += contribution;
      entry.bestRank = Math.min(entry.bestRank, rank);
      entry.contributions.push({ queryIndex, rank, contribution });
    }
  }

  return [...fused.values()].sort((left, right) => right.score - left.score
    || left.bestRank - right.bestRank
    || left.firstSeen - right.firstSeen);
}

function rankFusionEntries(resources, query) {
  const queries = fusionQueries(query);
  const rankings = queries.map((candidate) => searchWeightedResources(resources, candidate));
  return {
    queries,
    entries: fuseRankings(rankings),
  };
}

export function searchResources(resources, query) {
  if (!normalizeSearchText(query)) return [...resources];
  return rankFusionEntries(resources, query).entries.map((entry) => entry.resource);
}

export function searchResourcesWithExplanations(resources, query, limit = 10) {
  if (!Number.isInteger(limit) || limit < 1) throw new TypeError("Explanation limit must be a positive integer.");
  if (!normalizeSearchText(query)) {
    return resources.slice(0, limit).map((resource) => ({
      resource,
      score: 0,
      explanation: {
        schemaVersion: 1,
        searchAlgorithm: SEARCH_ALGORITHM_ID,
        score: 0,
        included: true,
        candidateDepth: FUSION_CANDIDATE_DEPTH,
        reciprocalRankConstant: RECIPROCAL_RANK_CONSTANT,
        queryContributions: [],
      },
    }));
  }

  const { queries, entries } = rankFusionEntries(resources, query);
  return entries.slice(0, limit).map((entry) => ({
    resource: entry.resource,
    score: entry.score,
    explanation: {
      schemaVersion: 1,
      searchAlgorithm: SEARCH_ALGORITHM_ID,
      score: entry.score,
      included: true,
      candidateDepth: FUSION_CANDIDATE_DEPTH,
      reciprocalRankConstant: RECIPROCAL_RANK_CONSTANT,
      queryContributions: entry.contributions.map((contribution) => ({
        query: queries[contribution.queryIndex],
        originalQuery: contribution.queryIndex === 0,
        rank: contribution.rank,
        contribution: contribution.contribution,
        lexicalExplanation: explainResourceMatch(entry.resource, queries[contribution.queryIndex]),
      })),
    },
  }));
}
