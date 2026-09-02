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
