import assert from "node:assert/strict";
import test from "node:test";
import {
  evaluateCase,
  summarizeCases,
  validateEvaluationFixture,
} from "../scripts/evaluate-search.mjs";

const resources = [
  {
    title: "Relevant result",
    url: "https://example.com/relevant",
    category: "Example",
    section: "Relevant",
  },
  {
    title: "Unjudged result",
    url: "https://example.com/unjudged",
    category: "Example",
    section: "Unjudged",
  },
  {
    title: "Known irrelevant result",
    url: "https://example.com/known-irrelevant",
    category: "Example",
    section: "Known Irrelevant",
  },
];

const evaluationCase = {
  id: "partial-negative-judgments",
  query: "example query",
  kind: "natural-language",
  rationale: "Exercise query-relative judgments.",
  relevantUrls: [resources[0].url],
  knownIrrelevantUrls: [resources[2].url],
  safetyInvariants: ["Keep unmarked results unjudged."],
};

const fixture = {
  schemaVersion: 1,
  cases: [evaluationCase],
};

const algorithm = {
  searchResources(candidates) {
    return candidates;
  },
};

const decomposingAlgorithm = {
  searchResources(candidates, query) {
    return query === "broader query"
      ? [candidates[0], candidates[2]]
      : [candidates[0], candidates[1]];
  },
  decomposeSearchQuery() {
    return {
      schemaVersion: 1,
      normalizedQuery: "example query",
      intents: [],
      urgency: { level: "unspecified", signals: [] },
      location: null,
      accessNeeds: [],
      subqueries: ["broader query"],
    };
  },
};

test("search evaluation measures partial known-irrelevant judgments", () => {
  validateEvaluationFixture(fixture, resources);
  const result = evaluateCase(evaluationCase, resources, 3, algorithm);

  assert.equal(result.knownIrrelevantCount, 1);
  assert.equal(result.knownIrrelevantFoundAtK, 1);
  assert.equal(result.knownIrrelevantRateAtK, 1);
  assert.equal(result.firstKnownIrrelevantRank, 3);
  assert.deepEqual(result.knownIrrelevantRanks, [3]);
  assert.equal(result.topResults[1].relevant, false);
  assert.equal(result.topResults[1].knownIrrelevant, false);
  assert.equal(result.topResults[2].knownIrrelevant, true);

  assert.deepEqual(summarizeCases([result]), {
    caseCount: 1,
    zeroResultCount: 0,
    casesWithRelevantAtK: 1,
    meanRecallAtK: 1,
    meanReciprocalRank: 1,
    knownIrrelevantJudgmentCount: 1,
    knownIrrelevantFoundAtK: 1,
    casesWithKnownIrrelevantJudgments: 1,
    casesWithKnownIrrelevantAtK: 1,
    meanKnownIrrelevantRateAtK: 1,
  });
});

test("search evaluation rejects contradictory known-irrelevant judgments", () => {
  const contradictoryFixture = structuredClone(fixture);
  contradictoryFixture.cases[0].knownIrrelevantUrls = [resources[0].url];

  assert.throws(
    () => validateEvaluationFixture(contradictoryFixture, resources),
    /marks the same URL relevant and known-irrelevant/,
  );
});

test("search evaluation rejects known-irrelevant resources outside the catalog", () => {
  const missingFixture = structuredClone(fixture);
  missingFixture.cases[0].knownIrrelevantUrls = ["https://example.com/missing"];

  assert.throws(
    () => validateEvaluationFixture(missingFixture, resources),
    /known-irrelevant resources outside the catalog/,
  );
});

test("search evaluation measures decomposition candidate gains before fusion", () => {
  const result = evaluateCase(evaluationCase, resources, 2, decomposingAlgorithm);

  assert.deepEqual(result.decompositionEvaluation, {
    schemaVersion: 1,
    decomposition: {
      schemaVersion: 1,
      normalizedQuery: "example query",
      intents: [],
      urgency: { level: "unspecified", signals: [] },
      location: null,
      accessNeeds: [],
      subqueries: ["broader query"],
    },
    candidateDepth: 2,
    originalCandidateCount: 2,
    candidatePoolCount: 3,
    candidatePoolExpansionCount: 1,
    relevantFoundInCandidatePool: 1,
    relevantCandidateGain: 0,
    knownIrrelevantFoundInCandidatePool: 1,
    knownIrrelevantCandidateGain: 1,
    subqueries: [
      {
        query: "broader query",
        resultCount: 2,
        candidateCount: 2,
        relevantFoundAtK: 1,
        recallAtK: 1,
        firstRelevantRank: 1,
        knownIrrelevantFoundAtK: 1,
        knownIrrelevantRateAtK: 1,
        firstKnownIrrelevantRank: 2,
      },
    ],
  });

  const summary = summarizeCases([result]);
  assert.equal(summary.decompositionCaseCount, 1);
  assert.equal(summary.decompositionSubqueryCount, 1);
  assert.equal(summary.meanDecompositionCandidatePoolCount, 3);
  assert.equal(summary.meanDecompositionCandidatePoolExpansionCount, 1);
  assert.equal(summary.decompositionRelevantCandidateGainCount, 0);
  assert.equal(summary.casesWithDecompositionRelevantCandidateGain, 0);
  assert.equal(summary.decompositionKnownIrrelevantCandidateGainCount, 1);
  assert.equal(summary.casesWithDecompositionKnownIrrelevantCandidateGain, 1);
});

test("search evaluation rejects duplicate decomposition subqueries", () => {
  const duplicateSubqueryAlgorithm = {
    ...decomposingAlgorithm,
    decomposeSearchQuery() {
      return {
        schemaVersion: 1,
        subqueries: ["broader query", "Broader Query"],
      };
    },
  };

  assert.throws(
    () => evaluateCase(evaluationCase, resources, 2, duplicateSubqueryAlgorithm),
    /duplicate subqueries/,
  );
});
