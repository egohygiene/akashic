import assert from "node:assert/strict";
import test from "node:test";
import {
  fuseRankings,
  fusionQueries,
} from "../research/search/algorithms/decomposition-rrf-v1.js";
import {
  compareSearchReports,
  validateFusionGate,
} from "../scripts/compare-search-results.mjs";

const gate = {
  schemaVersion: 1,
  id: "test-gate",
  baselineAlgorithm: "baseline",
  candidateAlgorithm: "candidate",
  requirements: {
    minimumCasesWithRelevantAtKGain: 1,
    minimumMeanRecallAtKGain: 0,
    minimumMeanReciprocalRankGain: 0,
    maximumZeroResultCountIncrease: 0,
    maximumKnownIrrelevantFoundAtKIncrease: 0,
    maximumCasesWithKnownIrrelevantAtKIncrease: 0,
    maximumRelevantCaseLosses: 0,
    maximumFirstRelevantRankRegressions: 0,
    maximumExactIdentifierRankRegressions: 0,
    maximumKnownIrrelevantCaseIncreases: 0,
  },
};

function searchCase(id, kind, relevantFoundAtK, firstRelevantRank, knownIrrelevantFoundAtK = 0) {
  return {
    id,
    query: `${id} query`,
    kind,
    relevantFoundAtK,
    firstRelevantRank,
    knownIrrelevantFoundAtK,
  };
}

function report(searchAlgorithm, cases, summary) {
  return {
    schemaVersion: 1,
    suite: "test-suite",
    searchAlgorithm,
    topK: 10,
    inputs: {
      catalogSha256: "catalog",
      fixtureSha256: "fixture",
      implementationSha256: searchAlgorithm,
    },
    summary,
    cases,
  };
}

const baselineCases = [
  searchCase("natural-success", "natural-language", 1, 1),
  searchCase("exact-success", "exact-identifier", 1, 1),
  searchCase("natural-miss", "natural-language", 0, null),
];

const baselineSummary = {
  zeroResultCount: 1,
  casesWithRelevantAtK: 2,
  meanRecallAtK: 0.6667,
  meanReciprocalRank: 0.6667,
  knownIrrelevantFoundAtK: 0,
  casesWithKnownIrrelevantAtK: 0,
};

test("reciprocal-rank fusion is deterministic and records each contribution", () => {
  const first = { id: "first" };
  const shared = { id: "shared" };
  const last = { id: "last" };
  const fused = fuseRankings([
    [first, shared],
    [shared, last],
  ], 2, 60);

  assert.deepEqual(fused.map((entry) => entry.resource.id), ["shared", "first", "last"]);
  assert.deepEqual(fused[0].contributions.map(({ queryIndex, rank }) => ({ queryIndex, rank })), [
    { queryIndex: 0, rank: 2 },
    { queryIndex: 1, rank: 1 },
  ]);
  assert.equal(fused[0].score, 1 / 62 + 1 / 61);

  const tied = fuseRankings([[first], [last]], 1, 60);
  assert.deepEqual(tied.map((entry) => entry.resource.id), ["first", "last"]);
});

test("fusion queries keep the original question and deduplicate normalized subqueries", () => {
  assert.deepEqual(fusionQueries("How can I get food today?"), [
    "How can I get food today?",
    "get food today",
    "food today",
  ]);
});

test("fusion gate accepts a clean top-k relevance gain", () => {
  const candidateCases = [
    searchCase("natural-success", "natural-language", 1, 1),
    searchCase("exact-success", "exact-identifier", 1, 1),
    searchCase("natural-miss", "natural-language", 1, 1),
  ];
  const comparison = compareSearchReports(
    report("baseline", baselineCases, baselineSummary),
    report("candidate", candidateCases, {
      ...baselineSummary,
      zeroResultCount: 0,
      casesWithRelevantAtK: 3,
      meanRecallAtK: 1,
      meanReciprocalRank: 1,
    }),
    gate,
  );

  assert.equal(comparison.accepted, true);
  assert.equal(comparison.decision, "eligible-for-portal-review");
  assert.deepEqual(comparison.caseChanges.relevantAtKGains, ["natural-miss"]);
  assert.equal(comparison.checks.every((entry) => entry.passed), true);
});

test("fusion gate rejects rank and known-negative regressions", () => {
  const candidateCases = [
    searchCase("natural-success", "natural-language", 1, 2, 1),
    searchCase("exact-success", "exact-identifier", 1, 3),
    searchCase("natural-miss", "natural-language", 1, 1),
  ];
  const comparison = compareSearchReports(
    report("baseline", baselineCases, baselineSummary),
    report("candidate", candidateCases, {
      ...baselineSummary,
      zeroResultCount: 0,
      casesWithRelevantAtK: 3,
      meanRecallAtK: 1,
      meanReciprocalRank: 0.6111,
      knownIrrelevantFoundAtK: 1,
      casesWithKnownIrrelevantAtK: 1,
    }),
    gate,
  );

  assert.equal(comparison.accepted, false);
  assert.equal(comparison.decision, "keep-active-ranking");
  assert.deepEqual(comparison.caseChanges.firstRelevantRankRegressions, ["natural-success", "exact-success"]);
  assert.deepEqual(comparison.caseChanges.exactIdentifierRankRegressions, ["exact-success"]);
  assert.deepEqual(comparison.caseChanges.knownIrrelevantCaseIncreases, ["natural-success"]);
  assert.equal(comparison.checks.find((entry) => entry.id === "mean-reciprocal-rank-gain").passed, false);
});

test("fusion gate rejects missing or negative requirements", () => {
  const invalid = structuredClone(gate);
  invalid.requirements.maximumRelevantCaseLosses = -1;
  assert.throws(() => validateFusionGate(invalid), /must be a non-negative number/);
});
