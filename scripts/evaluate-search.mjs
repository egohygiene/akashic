import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import { loadEvaluationFixture } from "./lib/search-evaluation.mjs";

const root = process.cwd();
const defaultCatalogPath = path.join(root, "dist/data/catalog.json");
const defaultFixturePath = path.join(root, "research/search/evaluations/natural-language-v2.json");
const defaultAlgorithmPath = path.join(root, "site/search/and-substring-v1.js");
const EXPLANATION_REPORT_DEPTH = 1;

function optionValue(name, fallback = "") {
  const index = process.argv.indexOf(name);
  if (index === -1) return fallback;
  const value = process.argv[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`${name} requires a value.`);
  return value;
}

function normalizedUrl(url) {
  const parsed = new URL(url);
  parsed.hash = "";
  if (parsed.pathname !== "/") parsed.pathname = parsed.pathname.replace(/\/+$/, "");
  return parsed.toString();
}

function rounded(value) {
  return Number(value.toFixed(4));
}

function digest(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function rankResources(algorithm, resources, query) {
  if (typeof algorithm.searchResources === "function") return algorithm.searchResources(resources, query);
  if (typeof algorithm.createAndSubstringMatcher === "function") return resources.filter(algorithm.createAndSubstringMatcher(query));
  throw new Error("Search algorithm must export searchResources or createAndSubstringMatcher.");
}

function explainRankedResources(algorithm, resources, query, ranked) {
  if (!ranked.length || typeof algorithm.searchResourcesWithExplanations !== "function") return [];
  const explained = algorithm.searchResourcesWithExplanations(resources, query, ranked.length);
  if (explained.length !== ranked.length) throw new Error(`Match explanation count differs from ranked results for query: ${query}`);
  for (const [index, entry] of explained.entries()) {
    if (normalizedUrl(entry.resource.url) !== normalizedUrl(ranked[index].url)) throw new Error(`Match explanations changed result order for query: ${query}`);
    if (entry.score !== entry.explanation.score) throw new Error(`Match explanation score differs from the ranking score for query: ${query}`);
  }
  return explained.map((entry) => entry.explanation);
}

function matchingRanks(matches, judgedUrls) {
  const ranks = [];
  for (const [index, resource] of matches.entries()) {
    if (judgedUrls.has(normalizedUrl(resource.url))) ranks.push(index + 1);
  }
  return ranks;
}

function resolvedJudgments(testCase) {
  if (Array.isArray(testCase.relevantUrls)) {
    return new Map([
      ...testCase.relevantUrls.map((url) => [normalizedUrl(url), { grade: 1, assessments: [] }]),
      ...(testCase.knownIrrelevantUrls || []).map((url) => [normalizedUrl(url), { grade: 0, assessments: [] }]),
    ]);
  }

  return new Map((testCase.judgments || []).map((judgment) => {
    const grade = judgment.adjudicatedGrade ?? judgment.assessments[0].grade;
    return [normalizedUrl(judgment.url), { grade, assessments: judgment.assessments, adjudicated: judgment.adjudicatedGrade !== undefined }];
  }));
}

function judgmentSets(testCase, reviewProtocol = null) {
  const judgments = resolvedJudgments(testCase);
  const minimumRelevantGrade = reviewProtocol?.minimumRelevantGrade ?? 1;
  return {
    judgments,
    relevantUrls: new Set([...judgments].filter(([, judgment]) => judgment.grade >= minimumRelevantGrade).map(([url]) => url)),
    knownIrrelevantUrls: new Set([...judgments].filter(([, judgment]) => judgment.grade === 0).map(([url]) => url)),
  };
}

function normalizedDiscountedCumulativeGain(ranked, judgments, topK) {
  const gain = (grade, rank) => ((2 ** grade) - 1) / Math.log2(rank + 1);
  const actual = ranked.slice(0, topK).reduce((sum, resource, index) => {
    const grade = judgments.get(normalizedUrl(resource.url))?.grade ?? 0;
    return sum + gain(grade, index + 1);
  }, 0);
  const ideal = [...judgments.values()]
    .map((judgment) => judgment.grade)
    .filter((grade) => grade > 0)
    .sort((left, right) => right - left)
    .slice(0, topK)
    .reduce((sum, grade, index) => sum + gain(grade, index + 1), 0);
  return ideal ? rounded(actual / ideal) : null;
}

function reviewCaseSummary(testCase, evaluationContext) {
  const assessorMap = new Map((evaluationContext.assessors || []).map((assessor) => [assessor.id, assessor]));
  const minimumIndependentAssessors = evaluationContext.reviewProtocol.agreement.minimumIndependentAssessors;
  const judgments = testCase.judgments || [];
  const independentCounts = judgments.map((judgment) => new Set(judgment.assessments
    .filter((assessment) => assessorMap.get(assessment.assessorId)?.independent)
    .map((assessment) => assessment.assessorId)).size);
  const multiAssessed = judgments.filter((judgment) => judgment.assessments.length > 1);
  const exactAgreement = multiAssessed.filter((judgment) => new Set(judgment.assessments.map((assessment) => assessment.grade)).size === 1);
  return {
    judgmentCount: judgments.length,
    assessmentCount: judgments.reduce((sum, judgment) => sum + judgment.assessments.length, 0),
    singleAssessorJudgmentCount: judgments.filter((judgment) => judgment.assessments.length === 1).length,
    multiAssessedJudgmentCount: multiAssessed.length,
    exactAgreementJudgmentCount: exactAgreement.length,
    adjudicatedJudgmentCount: judgments.filter((judgment) => judgment.adjudicatedGrade !== undefined).length,
    independentAssessorCount: new Set(judgments.flatMap((judgment) => judgment.assessments
      .filter((assessment) => assessorMap.get(assessment.assessorId)?.independent)
      .map((assessment) => assessment.assessorId))).size,
    meetsMinimumIndependentAssessors: judgments.length > 0 && independentCounts.every((count) => count >= minimumIndependentAssessors),
  };
}

function validateDecomposition(decomposition, query) {
  if (!decomposition || decomposition.schemaVersion !== 1 || !Array.isArray(decomposition.subqueries) || !decomposition.subqueries.length || decomposition.subqueries.length > 6) throw new Error(`Invalid search decomposition for query: ${query}`);
  if (decomposition.subqueries.some((subquery) => typeof subquery !== "string" || !subquery.trim())) throw new Error(`Search decomposition contains an empty subquery for query: ${query}`);
  const normalizedSubqueries = decomposition.subqueries.map((subquery) => subquery.trim().toLocaleLowerCase("en-US"));
  if (new Set(normalizedSubqueries).size !== normalizedSubqueries.length) throw new Error(`Search decomposition contains duplicate subqueries for query: ${query}`);
}

export function evaluateDecomposition(testCase, resources, topK, algorithm, originalRanked, evaluationContext = {}) {
  if (typeof algorithm.decomposeSearchQuery !== "function") return null;

  const { relevantUrls, knownIrrelevantUrls } = judgmentSets(testCase, evaluationContext.reviewProtocol);
  const decomposition = algorithm.decomposeSearchQuery(testCase.query);
  validateDecomposition(decomposition, testCase.query);

  const originalCandidates = new Set(originalRanked.map((resource) => normalizedUrl(resource.url)));
  const candidatePool = new Set(originalCandidates);
  const subqueries = decomposition.subqueries.map((query) => {
    const matches = rankResources(algorithm, resources, query);
    const ranked = matches.slice(0, topK);
    for (const resource of ranked) candidatePool.add(normalizedUrl(resource.url));
    const relevantRanks = matchingRanks(matches, relevantUrls);
    const knownIrrelevantRanks = matchingRanks(matches, knownIrrelevantUrls);
    const relevantFoundAtK = relevantRanks.filter((rank) => rank <= topK).length;
    const knownIrrelevantFoundAtK = knownIrrelevantRanks.filter((rank) => rank <= topK).length;
    return {
      query,
      resultCount: matches.length,
      candidateCount: ranked.length,
      relevantFoundAtK,
      recallAtK: relevantUrls.size ? rounded(relevantFoundAtK / relevantUrls.size) : 0,
      firstRelevantRank: relevantRanks[0] || null,
      knownIrrelevantFoundAtK,
      knownIrrelevantRateAtK: knownIrrelevantUrls.size ? rounded(knownIrrelevantFoundAtK / knownIrrelevantUrls.size) : null,
      firstKnownIrrelevantRank: knownIrrelevantRanks[0] || null,
    };
  });

  const relevantFoundInOriginal = [...relevantUrls].filter((url) => originalCandidates.has(url)).length;
  const relevantFoundInCandidatePool = [...relevantUrls].filter((url) => candidatePool.has(url)).length;
  const knownIrrelevantFoundInOriginal = [...knownIrrelevantUrls].filter((url) => originalCandidates.has(url)).length;
  const knownIrrelevantFoundInCandidatePool = [...knownIrrelevantUrls].filter((url) => candidatePool.has(url)).length;
  return {
    schemaVersion: 1,
    decomposition,
    candidateDepth: topK,
    originalCandidateCount: originalCandidates.size,
    candidatePoolCount: candidatePool.size,
    candidatePoolExpansionCount: candidatePool.size - originalCandidates.size,
    relevantFoundInCandidatePool,
    relevantCandidateGain: relevantFoundInCandidatePool - relevantFoundInOriginal,
    knownIrrelevantFoundInCandidatePool,
    knownIrrelevantCandidateGain: knownIrrelevantFoundInCandidatePool - knownIrrelevantFoundInOriginal,
    subqueries,
  };
}

export function evaluateCase(testCase, resources, topK, algorithm, evaluationContext = {}) {
  const versionTwo = evaluationContext.fixtureSchemaVersion === 2;
  const { judgments, relevantUrls, knownIrrelevantUrls } = judgmentSets(testCase, evaluationContext.reviewProtocol);
  const evaluable = testCase.targetStatus !== "catalog-gap";
  const matches = rankResources(algorithm, resources, testCase.query);
  const ranked = matches.slice(0, topK);
  const explanations = explainRankedResources(algorithm, resources, testCase.query, ranked);
  const relevantRanks = matchingRanks(matches, relevantUrls);
  const knownIrrelevantRanks = matchingRanks(matches, knownIrrelevantUrls);
  const foundAtK = relevantRanks.filter((rank) => rank <= topK).length;
  const knownIrrelevantFoundAtK = knownIrrelevantRanks.filter((rank) => rank <= topK).length;
  const firstRelevantRank = relevantRanks[0] || null;
  const firstKnownIrrelevantRank = knownIrrelevantRanks[0] || null;
  const result = {
    id: testCase.id,
    query: testCase.query,
    kind: testCase.kind,
    ...(versionTwo ? {
      language: testCase.language,
      cohorts: testCase.cohorts,
      targetCollections: testCase.targetCollections,
      targetStatus: testCase.targetStatus,
      evaluable,
    } : {}),
    resultCount: matches.length,
    relevantCount: relevantUrls.size,
    relevantFoundAtK: foundAtK,
    recallAtK: evaluable ? (relevantUrls.size ? rounded(foundAtK / relevantUrls.size) : 0) : null,
    reciprocalRank: evaluable ? (firstRelevantRank ? rounded(1 / firstRelevantRank) : 0) : null,
    ...(versionTwo ? { ndcgAtK: evaluable ? normalizedDiscountedCumulativeGain(ranked, judgments, topK) : null } : {}),
    firstRelevantRank,
    relevantRanks,
    knownIrrelevantCount: knownIrrelevantUrls.size,
    knownIrrelevantFoundAtK,
    knownIrrelevantRateAtK: knownIrrelevantUrls.size ? rounded(knownIrrelevantFoundAtK / knownIrrelevantUrls.size) : null,
    firstKnownIrrelevantRank,
    knownIrrelevantRanks,
    topResults: ranked.map((resource, index) => {
      const url = normalizedUrl(resource.url);
      const result = {
        rank: index + 1,
        title: resource.title,
        url: resource.url,
        collection: resource.category,
        topic: resource.section,
        ...(versionTwo ? {
          judged: judgments.has(url),
          relevanceGrade: judgments.get(url)?.grade ?? null,
        } : {}),
        relevant: relevantUrls.has(url),
        knownIrrelevant: knownIrrelevantUrls.has(url),
      };
      if (index < EXPLANATION_REPORT_DEPTH && explanations[index]) result.matchExplanation = explanations[index];
      return result;
    }),
  };
  if (versionTwo) result.review = reviewCaseSummary(testCase, evaluationContext);
  const decompositionEvaluation = evaluable ? evaluateDecomposition(testCase, resources, topK, algorithm, ranked, evaluationContext) : null;
  if (decompositionEvaluation) result.decompositionEvaluation = decompositionEvaluation;
  return result;
}

function validateVersionTwoProtocol(fixture) {
  const protocol = fixture.reviewProtocol;
  const grades = protocol?.grades;
  const gradeValues = Array.isArray(grades) ? grades.map((grade) => grade.value) : [];
  if (!protocol?.id || !Array.isArray(grades) || grades.length < 2 || new Set(gradeValues).size !== grades.length || grades.some((grade) => !Number.isInteger(grade.value) || grade.value < 0 || !grade.label || !grade.definition)) throw new Error("Search evaluation v2 has an invalid graded-relevance protocol.");
  if (!gradeValues.includes(protocol.minimumRelevantGrade) || !gradeValues.includes(protocol.legacyBinaryRelevantGrade) || protocol.legacyBinaryRelevantGrade < protocol.minimumRelevantGrade) throw new Error("Search evaluation v2 has invalid relevance thresholds.");
  if (!Number.isInteger(protocol.agreement?.minimumIndependentAssessors) || protocol.agreement.minimumIndependentAssessors < 2 || protocol.agreement.automaticResolution !== "exact-grade-only" || protocol.agreement.conflictResolution !== "adjudicated-grade-required") throw new Error("Search evaluation v2 has an invalid assessor-agreement contract.");
  if (!Array.isArray(fixture.assessors) || !fixture.assessors.length) throw new Error("Search evaluation v2 must define assessment provenance.");
  const assessorIds = new Set();
  for (const assessor of fixture.assessors) {
    if (!assessor.id || assessorIds.has(assessor.id) || !assessor.kind || typeof assessor.independent !== "boolean" || !assessor.scope || !assessor.provenance) throw new Error(`Invalid or duplicate search assessor: ${assessor.id || "unknown"}.`);
    assessorIds.add(assessor.id);
  }
  return { assessorIds, gradeValues: new Set(gradeValues) };
}

function validateVersionOneCase(testCase, catalogUrls) {
  if (!Array.isArray(testCase.relevantUrls) || !testCase.relevantUrls.length) throw new Error(`Incomplete evaluation case: ${testCase.id || "unknown"}.`);
  if (testCase.knownIrrelevantUrls !== undefined && !Array.isArray(testCase.knownIrrelevantUrls)) throw new Error(`Evaluation case ${testCase.id} must provide knownIrrelevantUrls as an array when present.`);
  const judgments = [
    ["relevant", testCase.relevantUrls],
    ["known-irrelevant", testCase.knownIrrelevantUrls || []],
  ];
  const normalizedJudgments = new Map();
  for (const [label, urls] of judgments) {
    if (urls.some((url) => typeof url !== "string" || !url.trim())) throw new Error(`Evaluation case ${testCase.id} contains an invalid ${label} URL.`);
    const normalizedUrls = urls.map(normalizedUrl);
    if (new Set(normalizedUrls).size !== normalizedUrls.length) throw new Error(`Evaluation case ${testCase.id} contains duplicate ${label} URLs.`);
    const missingUrls = urls.filter((url) => !catalogUrls.has(normalizedUrl(url)));
    if (missingUrls.length) throw new Error(`Evaluation case ${testCase.id} references ${label} resources outside the catalog: ${missingUrls.join(", ")}`);
    normalizedJudgments.set(label, new Set(normalizedUrls));
  }
  const overlaps = [...normalizedJudgments.get("known-irrelevant")].filter((url) => normalizedJudgments.get("relevant").has(url));
  if (overlaps.length) throw new Error(`Evaluation case ${testCase.id} marks the same URL relevant and known-irrelevant: ${overlaps.join(", ")}`);
}

function validateVersionTwoCase(testCase, fixture, catalogUrls, catalogCollections, protocolState) {
  if (!/^[a-z]{2,3}(?:-[A-Z]{2})?$/.test(testCase.language || "") || !Array.isArray(testCase.cohorts) || !testCase.cohorts.length || testCase.cohorts.some((cohort) => !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(cohort)) || new Set(testCase.cohorts).size !== testCase.cohorts.length) throw new Error(`Evaluation case ${testCase.id} has invalid language or cohort metadata.`);
  if (!Array.isArray(testCase.targetCollections) || !testCase.targetCollections.length || testCase.targetCollections.some((collection) => !catalogCollections.has(collection))) throw new Error(`Evaluation case ${testCase.id} references an unknown target collection.`);
  if (!["catalog-covered", "catalog-gap"].includes(testCase.targetStatus) || !Array.isArray(testCase.judgments)) throw new Error(`Evaluation case ${testCase.id} has an invalid target status or judgment set.`);

  if (testCase.targetStatus === "catalog-gap") {
    if (testCase.judgments.length || !Array.isArray(testCase.missingTargets) || !testCase.missingTargets.length) throw new Error(`Catalog-gap case ${testCase.id} must provide missing targets and no catalog judgments.`);
    for (const target of testCase.missingTargets) {
      if (!target.title || !target.canonicalUrl || catalogUrls.has(normalizedUrl(target.canonicalUrl))) throw new Error(`Catalog-gap case ${testCase.id} has an invalid or already-covered target.`);
    }
    return;
  }

  if (!testCase.judgments.length) throw new Error(`Catalog-covered case ${testCase.id} has no graded judgments.`);
  const judgmentUrls = new Set();
  let relevantCount = 0;
  let knownIrrelevantCount = 0;
  for (const judgment of testCase.judgments) {
    const url = normalizedUrl(judgment.url);
    if (judgmentUrls.has(url) || !catalogUrls.has(url) || !Array.isArray(judgment.assessments) || !judgment.assessments.length) throw new Error(`Evaluation case ${testCase.id} has an invalid, duplicate, or missing catalog judgment.`);
    judgmentUrls.add(url);
    const assessmentIds = new Set();
    const grades = new Set();
    for (const assessment of judgment.assessments) {
      if (!protocolState.assessorIds.has(assessment.assessorId) || assessmentIds.has(assessment.assessorId) || !protocolState.gradeValues.has(assessment.grade)) throw new Error(`Evaluation case ${testCase.id} has an invalid or duplicate assessment.`);
      assessmentIds.add(assessment.assessorId);
      grades.add(assessment.grade);
    }
    if (grades.size > 1 && judgment.adjudicatedGrade === undefined) throw new Error(`Evaluation case ${testCase.id} has unresolved assessor disagreement.`);
    if (judgment.adjudicatedGrade !== undefined && !protocolState.gradeValues.has(judgment.adjudicatedGrade)) throw new Error(`Evaluation case ${testCase.id} has an invalid adjudicated grade.`);
    const grade = judgment.adjudicatedGrade ?? judgment.assessments[0].grade;
    if (grade >= fixture.reviewProtocol.minimumRelevantGrade) relevantCount += 1;
    if (grade === 0) knownIrrelevantCount += 1;
  }
  if (!relevantCount || !knownIrrelevantCount) throw new Error(`Catalog-covered case ${testCase.id} must include relevant and known-irrelevant judgments.`);
}

export function validateEvaluationFixture(fixture, resources) {
  if (![1, 2].includes(fixture.schemaVersion) || !Array.isArray(fixture.cases) || !fixture.cases.length) throw new Error("Unsupported or empty search evaluation fixture.");
  if (!Array.isArray(resources) || !resources.length) throw new Error("The generated catalog has no resources. Run node scripts/build-site.mjs first.");

  const catalogUrls = new Set(resources.map((resource) => normalizedUrl(resource.url)));
  const catalogCollections = new Set(resources.map((resource) => resource.category));
  const protocolState = fixture.schemaVersion === 2 ? validateVersionTwoProtocol(fixture) : null;
  const caseIds = new Set();
  const queries = new Set();
  for (const testCase of fixture.cases) {
    if (!testCase.id || !testCase.query || !["natural-language", "exact-identifier"].includes(testCase.kind) || typeof testCase.rationale !== "string" || !testCase.rationale.trim() || !Array.isArray(testCase.safetyInvariants) || !testCase.safetyInvariants.length || testCase.safetyInvariants.some((invariant) => typeof invariant !== "string" || !invariant.trim())) throw new Error(`Incomplete evaluation case: ${testCase.id || "unknown"}.`);
    if (caseIds.has(testCase.id)) throw new Error(`Duplicate evaluation case ID: ${testCase.id}.`);
    caseIds.add(testCase.id);
    const normalizedQuery = testCase.query.trim().toLocaleLowerCase("en-US");
    if (queries.has(normalizedQuery)) throw new Error(`Duplicate evaluation query: ${testCase.query}.`);
    queries.add(normalizedQuery);

    if (fixture.schemaVersion === 1) validateVersionOneCase(testCase, catalogUrls);
    else validateVersionTwoCase(testCase, fixture, catalogUrls, catalogCollections, protocolState);
  }
}

function countValues(values) {
  return Object.fromEntries([...values.reduce((counts, value) => counts.set(value, (counts.get(value) || 0) + 1), new Map())]
    .sort(([left], [right]) => left.localeCompare(right)));
}

function summarizeReview(cases, evaluationContext) {
  const evaluated = cases.filter((testCase) => testCase.evaluable);
  const reviewCases = evaluated.map((testCase) => testCase.review);
  const multiAssessedJudgmentCount = reviewCases.reduce((sum, review) => sum + review.multiAssessedJudgmentCount, 0);
  const exactAgreementJudgmentCount = reviewCases.reduce((sum, review) => sum + review.exactAgreementJudgmentCount, 0);
  return {
    protocol: evaluationContext.reviewProtocol.id,
    minimumIndependentAssessors: evaluationContext.reviewProtocol.agreement.minimumIndependentAssessors,
    assessorCount: evaluationContext.assessors.length,
    independentAssessorCount: evaluationContext.assessors.filter((assessor) => assessor.independent).length,
    judgmentCount: reviewCases.reduce((sum, review) => sum + review.judgmentCount, 0),
    assessmentCount: reviewCases.reduce((sum, review) => sum + review.assessmentCount, 0),
    singleAssessorJudgmentCount: reviewCases.reduce((sum, review) => sum + review.singleAssessorJudgmentCount, 0),
    multiAssessedJudgmentCount,
    exactAgreementJudgmentCount,
    exactAgreementRate: multiAssessedJudgmentCount ? rounded(exactAgreementJudgmentCount / multiAssessedJudgmentCount) : null,
    adjudicatedJudgmentCount: reviewCases.reduce((sum, review) => sum + review.adjudicatedJudgmentCount, 0),
    casesMeetingMinimumIndependentAssessors: reviewCases.filter((review) => review.meetsMinimumIndependentAssessors).length,
    agreementSufficientForComparativeClaims: reviewCases.length > 0 && reviewCases.every((review) => review.meetsMinimumIndependentAssessors),
  };
}

export function summarizeCases(cases, evaluationContext = {}) {
  const versionTwo = evaluationContext.fixtureSchemaVersion === 2;
  const metricCases = versionTwo ? cases.filter((testCase) => testCase.evaluable) : cases;
  const casesWithKnownIrrelevantJudgments = cases.filter((testCase) => testCase.knownIrrelevantCount > 0);
  const summary = {
    caseCount: cases.length,
    ...(versionTwo ? {
      evaluableCaseCount: metricCases.length,
      catalogGapCaseCount: cases.length - metricCases.length,
      languageCounts: countValues(cases.map((testCase) => testCase.language)),
      cohortCounts: countValues(cases.flatMap((testCase) => testCase.cohorts)),
    } : {}),
    zeroResultCount: cases.filter((testCase) => testCase.resultCount === 0).length,
    casesWithRelevantAtK: metricCases.filter((testCase) => testCase.relevantFoundAtK > 0).length,
    meanRecallAtK: rounded(metricCases.reduce((sum, testCase) => sum + testCase.recallAtK, 0) / metricCases.length),
    meanReciprocalRank: rounded(metricCases.reduce((sum, testCase) => sum + testCase.reciprocalRank, 0) / metricCases.length),
    ...(versionTwo ? { meanNdcgAtK: rounded(metricCases.reduce((sum, testCase) => sum + testCase.ndcgAtK, 0) / metricCases.length) } : {}),
    knownIrrelevantJudgmentCount: cases.reduce((sum, testCase) => sum + testCase.knownIrrelevantCount, 0),
    knownIrrelevantFoundAtK: cases.reduce((sum, testCase) => sum + testCase.knownIrrelevantFoundAtK, 0),
    casesWithKnownIrrelevantJudgments: casesWithKnownIrrelevantJudgments.length,
    casesWithKnownIrrelevantAtK: cases.filter((testCase) => testCase.knownIrrelevantFoundAtK > 0).length,
    meanKnownIrrelevantRateAtK: casesWithKnownIrrelevantJudgments.length
      ? rounded(casesWithKnownIrrelevantJudgments.reduce((sum, testCase) => sum + testCase.knownIrrelevantRateAtK, 0) / casesWithKnownIrrelevantJudgments.length)
      : null,
  };
  if (versionTwo) summary.review = summarizeReview(cases, evaluationContext);
  const decompositionCases = cases.filter((testCase) => testCase.decompositionEvaluation);
  if (decompositionCases.length) {
    summary.decompositionCaseCount = decompositionCases.length;
    summary.decompositionSubqueryCount = decompositionCases.reduce((sum, testCase) => sum + testCase.decompositionEvaluation.subqueries.length, 0);
    summary.meanDecompositionCandidatePoolCount = rounded(decompositionCases.reduce((sum, testCase) => sum + testCase.decompositionEvaluation.candidatePoolCount, 0) / decompositionCases.length);
    summary.meanDecompositionCandidatePoolExpansionCount = rounded(decompositionCases.reduce((sum, testCase) => sum + testCase.decompositionEvaluation.candidatePoolExpansionCount, 0) / decompositionCases.length);
    summary.decompositionRelevantCandidateGainCount = decompositionCases.reduce((sum, testCase) => sum + testCase.decompositionEvaluation.relevantCandidateGain, 0);
    summary.casesWithDecompositionRelevantCandidateGain = decompositionCases.filter((testCase) => testCase.decompositionEvaluation.relevantCandidateGain > 0).length;
    summary.decompositionKnownIrrelevantCandidateGainCount = decompositionCases.reduce((sum, testCase) => sum + testCase.decompositionEvaluation.knownIrrelevantCandidateGain, 0);
    summary.casesWithDecompositionKnownIrrelevantCandidateGain = decompositionCases.filter((testCase) => testCase.decompositionEvaluation.knownIrrelevantCandidateGain > 0).length;
  }
  return summary;
}

async function main() {
  const catalogPath = path.resolve(optionValue("--catalog", defaultCatalogPath));
  const fixturePath = path.resolve(optionValue("--fixture", defaultFixturePath));
  const algorithmPath = path.resolve(optionValue("--algorithm", defaultAlgorithmPath));
  const outputOption = optionValue("--output");
  const verifyOption = optionValue("--verify");
  if (outputOption && verifyOption) throw new Error("Use either --output or --verify, not both.");
  const [catalogText, fixture, algorithmText] = await Promise.all([
    readFile(catalogPath, "utf8"),
    loadEvaluationFixture(fixturePath),
    readFile(algorithmPath, "utf8"),
  ]);
  const algorithm = await import(`${pathToFileURL(algorithmPath).href}?source=${digest(algorithmText)}`);
  if (typeof algorithm.SEARCH_ALGORITHM_ID !== "string" || !algorithm.SEARCH_ALGORITHM_ID) throw new Error("Search algorithm must export SEARCH_ALGORITHM_ID.");
  const catalog = JSON.parse(catalogText);
  validateEvaluationFixture(fixture, catalog.resources);
  const topK = Number(optionValue("--top-k", String(fixture.topK || 10)));
  if (!Number.isInteger(topK) || topK < 1) throw new Error("--top-k must be a positive integer.");

  const evaluationContext = fixture.schemaVersion === 2 ? {
    fixtureSchemaVersion: 2,
    reviewProtocol: fixture.reviewProtocol,
    assessors: fixture.assessors,
  } : {};
  const cases = fixture.cases.map((testCase) => evaluateCase(testCase, catalog.resources, topK, algorithm, evaluationContext));
  const report = {
    schemaVersion: 1,
    suite: fixture.id,
    searchAlgorithm: algorithm.SEARCH_ALGORITHM_ID,
    catalogResourceCount: catalog.resources.length,
    inputs: {
      catalogSha256: digest({ categories: catalog.categories, resources: catalog.resources }),
      fixtureSha256: digest(fixture),
      implementationSha256: createHash("sha256").update(algorithmText).digest("hex"),
    },
    topK,
    summary: summarizeCases(cases, evaluationContext),
    cases,
  };

  const serialized = `${JSON.stringify(report, null, 2)}\n`;
  if (verifyOption) {
    const expectedPath = path.resolve(verifyOption);
    const expected = await readFile(expectedPath, "utf8");
    if (expected !== serialized) throw new Error(`Search baseline differs from ${path.relative(root, expectedPath)}. Regenerate and review the report intentionally.`);
    console.log(`Verified ${path.relative(root, expectedPath)}.`);
  } else if (outputOption) {
    const outputPath = path.resolve(outputOption);
    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, serialized);
    console.log(`Wrote ${path.relative(root, outputPath)}.`);
  } else {
    process.stdout.write(serialized);
  }
  console.error(`Evaluated ${cases.length} queries: ${report.summary.casesWithRelevantAtK} found a judged resource in the top ${topK}; ${report.summary.zeroResultCount} returned no results.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) await main();
