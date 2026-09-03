import assert from "node:assert/strict";
import test from "node:test";
import {
  evaluateCase,
  summarizeCases,
  validateEvaluationFixture,
} from "../scripts/evaluate-search.mjs";
import { loadEvaluationFixture } from "../scripts/lib/search-evaluation.mjs";

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

const gradedFixture = {
  schemaVersion: 2,
  id: "graded-test",
  reviewProtocol: {
    id: "graded-test-v1",
    minimumRelevantGrade: 2,
    legacyBinaryRelevantGrade: 2,
    grades: [
      { value: 0, label: "known-irrelevant", definition: "Does not answer the query." },
      { value: 1, label: "related", definition: "Related but insufficient." },
      { value: 2, label: "useful", definition: "A useful pathway." },
      { value: 3, label: "direct", definition: "A direct pathway." },
    ],
    agreement: {
      minimumIndependentAssessors: 2,
      automaticResolution: "exact-grade-only",
      conflictResolution: "adjudicated-grade-required",
    },
  },
  assessors: [
    {
      id: "curator",
      kind: "curation-proposal",
      independent: false,
      scope: "Test judgments.",
      provenance: "Unit test.",
    },
  ],
  topK: 3,
  cases: [
    {
      id: "graded-case",
      query: "graded query",
      kind: "natural-language",
      language: "en",
      cohorts: ["graded-relevance"],
      targetCollections: ["Example"],
      targetStatus: "catalog-covered",
      rationale: "Exercise graded judgments.",
      safetyInvariants: ["Keep related results distinct from relevant results."],
      judgments: [
        { url: resources[0].url, assessments: [{ assessorId: "curator", grade: 3 }] },
        { url: resources[1].url, assessments: [{ assessorId: "curator", grade: 1 }] },
        { url: resources[2].url, assessments: [{ assessorId: "curator", grade: 0 }] },
      ],
    },
  ],
};

const gradedContext = {
  fixtureSchemaVersion: 2,
  reviewProtocol: gradedFixture.reviewProtocol,
  assessors: gradedFixture.assessors,
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

test("search evaluation reports graded relevance and honest review sufficiency", () => {
  validateEvaluationFixture(gradedFixture, resources);
  const result = evaluateCase(gradedFixture.cases[0], resources, 3, algorithm, gradedContext);
  const summary = summarizeCases([result], gradedContext);

  assert.equal(result.relevantCount, 1);
  assert.equal(result.knownIrrelevantCount, 1);
  assert.equal(result.topResults[1].judged, true);
  assert.equal(result.topResults[1].relevanceGrade, 1);
  assert.equal(result.topResults[1].relevant, false);
  assert.equal(result.ndcgAtK, 1);
  assert.equal(summary.meanNdcgAtK, 1);
  assert.equal(summary.review.exactAgreementRate, null);
  assert.equal(summary.review.casesMeetingMinimumIndependentAssessors, 0);
  assert.equal(summary.review.agreementSufficientForComparativeClaims, false);
});

test("search evaluation requires adjudication when grades conflict", () => {
  const conflicted = structuredClone(gradedFixture);
  conflicted.assessors.push({
    id: "second-curator",
    kind: "domain-reviewer",
    independent: true,
    scope: "Test judgments.",
    provenance: "Unit test.",
  });
  conflicted.cases[0].judgments[0].assessments.push({ assessorId: "second-curator", grade: 2 });

  assert.throws(
    () => validateEvaluationFixture(conflicted, resources),
    /unresolved assessor disagreement/,
  );
  conflicted.cases[0].judgments[0].adjudicatedGrade = 3;
  validateEvaluationFixture(conflicted, resources);
});

test("search evaluation accepts an explicit catalog-coverage gap", () => {
  const withGap = structuredClone(gradedFixture);
  withGap.cases.push({
    id: "catalog-gap",
    query: "missing exact identifier",
    kind: "exact-identifier",
    language: "en",
    cohorts: ["catalog-gap"],
    targetCollections: ["Example"],
    targetStatus: "catalog-gap",
    rationale: "The expected pathway is not in the catalog.",
    safetyInvariants: ["Do not invent a matching resource."],
    judgments: [],
    missingTargets: [{ title: "Missing resource", canonicalUrl: "https://example.com/missing" }],
  });

  validateEvaluationFixture(withGap, resources);
  const gapResult = evaluateCase(withGap.cases[1], resources, 3, algorithm, gradedContext);
  assert.equal(gapResult.evaluable, false);
  assert.equal(gapResult.recallAtK, null);
  assert.equal(gapResult.ndcgAtK, null);
});

test("search evaluation v2 materializes its immutable v1 base", async () => {
  const fixture = await loadEvaluationFixture("research/search/evaluations/natural-language-v2.json");

  assert.equal(fixture.schemaVersion, 2);
  assert.equal(fixture.cases.length, 33);
  assert.deepEqual(fixture.derivedFrom, [{
    id: "akashic-natural-language-v1",
    sourcePath: "natural-language-v1.json",
    sha256: "209f67722794fc103e69cdce20b1c6bdcc8e40187fafd1ab0da18f0b9f8de066",
  }]);
  assert.equal(fixture.cases[0].judgments[0].assessments[0].assessorId, "legacy-v1-curation");
  assert.equal(fixture.cases.at(-1).targetStatus, "catalog-gap");
});
