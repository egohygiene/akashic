import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

const root = process.cwd();

function optionValue(name) {
  const index = process.argv.indexOf(name);
  if (index === -1) return "";
  const value = process.argv[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`${name} requires a value.`);
  return value;
}

function rounded(value) {
  return Number(value.toFixed(4));
}

function digest(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function numericDelta(candidate, baseline) {
  return rounded(candidate - baseline);
}

function validatesNonNegativeNumber(value) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

export function validateFusionGate(gate) {
  const requiredFields = [
    "minimumCasesWithRelevantAtKGain",
    "minimumMeanRecallAtKGain",
    "minimumMeanReciprocalRankGain",
    "maximumZeroResultCountIncrease",
    "maximumKnownIrrelevantFoundAtKIncrease",
    "maximumCasesWithKnownIrrelevantAtKIncrease",
    "maximumRelevantCaseLosses",
    "maximumFirstRelevantRankRegressions",
    "maximumExactIdentifierRankRegressions",
    "maximumKnownIrrelevantCaseIncreases",
  ];
  if (gate?.schemaVersion !== 1 || typeof gate.id !== "string" || !gate.id || typeof gate.baselineAlgorithm !== "string" || typeof gate.candidateAlgorithm !== "string") throw new Error("Unsupported or incomplete fusion gate.");
  for (const field of requiredFields) {
    if (!validatesNonNegativeNumber(gate.requirements?.[field])) throw new Error(`Fusion gate requirement ${field} must be a non-negative number.`);
  }
}

function reportCases(report) {
  if (report?.schemaVersion !== 1 || !Array.isArray(report.cases) || !report.cases.length) throw new Error("Unsupported or empty search report.");
  return new Map(report.cases.map((testCase) => [testCase.id, testCase]));
}

function compareInputs(baseline, candidate) {
  const comparable = baseline.suite === candidate.suite
    && baseline.topK === candidate.topK
    && baseline.inputs?.catalogSha256 === candidate.inputs?.catalogSha256
    && baseline.inputs?.fixtureSha256 === candidate.inputs?.fixtureSha256;
  if (!comparable) throw new Error("Search reports must use the same suite, top-k, catalog, and fixture.");
  return {
    suite: baseline.suite,
    topK: baseline.topK,
    catalogSha256: baseline.inputs.catalogSha256,
    fixtureSha256: baseline.inputs.fixtureSha256,
  };
}

function check(id, actual, operator, threshold) {
  const passed = operator === ">=" ? actual >= threshold : actual <= threshold;
  return { id, actual, operator, threshold, passed };
}

export function compareSearchReports(baseline, candidate, gate) {
  validateFusionGate(gate);
  if (baseline.searchAlgorithm !== gate.baselineAlgorithm) throw new Error(`Expected baseline algorithm ${gate.baselineAlgorithm}.`);
  if (candidate.searchAlgorithm !== gate.candidateAlgorithm) throw new Error(`Expected candidate algorithm ${gate.candidateAlgorithm}.`);
  const comparableInputs = compareInputs(baseline, candidate);
  const baselineCases = reportCases(baseline);
  const candidateCases = reportCases(candidate);
  if (baselineCases.size !== candidateCases.size || [...baselineCases.keys()].some((id) => !candidateCases.has(id))) throw new Error("Search reports must contain the same case IDs.");

  const relevantAtKGains = [];
  const relevantAtKLosses = [];
  const firstRelevantRankRegressions = [];
  const exactIdentifierRankRegressions = [];
  const knownIrrelevantCaseIncreases = [];
  for (const [id, baselineCase] of baselineCases) {
    const candidateCase = candidateCases.get(id);
    if (baselineCase.query !== candidateCase.query || baselineCase.kind !== candidateCase.kind) throw new Error(`Search case ${id} differs between reports.`);
    const baselineFoundAtK = baselineCase.relevantFoundAtK > 0;
    const candidateFoundAtK = candidateCase.relevantFoundAtK > 0;
    if (!baselineFoundAtK && candidateFoundAtK) relevantAtKGains.push(id);
    if (baselineFoundAtK && !candidateFoundAtK) relevantAtKLosses.push(id);

    const rankRegressed = baselineCase.firstRelevantRank !== null
      && (candidateCase.firstRelevantRank === null || candidateCase.firstRelevantRank > baselineCase.firstRelevantRank);
    if (rankRegressed) {
      firstRelevantRankRegressions.push(id);
      if (baselineCase.kind === "exact-identifier") exactIdentifierRankRegressions.push(id);
    }
    if (candidateCase.knownIrrelevantFoundAtK > baselineCase.knownIrrelevantFoundAtK) knownIrrelevantCaseIncreases.push(id);
  }

  const summaryDelta = {
    zeroResultCount: numericDelta(candidate.summary.zeroResultCount, baseline.summary.zeroResultCount),
    casesWithRelevantAtK: numericDelta(candidate.summary.casesWithRelevantAtK, baseline.summary.casesWithRelevantAtK),
    meanRecallAtK: numericDelta(candidate.summary.meanRecallAtK, baseline.summary.meanRecallAtK),
    meanReciprocalRank: numericDelta(candidate.summary.meanReciprocalRank, baseline.summary.meanReciprocalRank),
    knownIrrelevantFoundAtK: numericDelta(candidate.summary.knownIrrelevantFoundAtK, baseline.summary.knownIrrelevantFoundAtK),
    casesWithKnownIrrelevantAtK: numericDelta(candidate.summary.casesWithKnownIrrelevantAtK, baseline.summary.casesWithKnownIrrelevantAtK),
  };
  const requirements = gate.requirements;
  const checks = [
    check("cases-with-relevant-at-k-gain", relevantAtKGains.length, ">=", requirements.minimumCasesWithRelevantAtKGain),
    check("mean-recall-at-k-gain", summaryDelta.meanRecallAtK, ">=", requirements.minimumMeanRecallAtKGain),
    check("mean-reciprocal-rank-gain", summaryDelta.meanReciprocalRank, ">=", requirements.minimumMeanReciprocalRankGain),
    check("zero-result-count-increase", summaryDelta.zeroResultCount, "<=", requirements.maximumZeroResultCountIncrease),
    check("known-irrelevant-found-at-k-increase", summaryDelta.knownIrrelevantFoundAtK, "<=", requirements.maximumKnownIrrelevantFoundAtKIncrease),
    check("cases-with-known-irrelevant-at-k-increase", summaryDelta.casesWithKnownIrrelevantAtK, "<=", requirements.maximumCasesWithKnownIrrelevantAtKIncrease),
    check("relevant-case-losses", relevantAtKLosses.length, "<=", requirements.maximumRelevantCaseLosses),
    check("first-relevant-rank-regressions", firstRelevantRankRegressions.length, "<=", requirements.maximumFirstRelevantRankRegressions),
    check("exact-identifier-rank-regressions", exactIdentifierRankRegressions.length, "<=", requirements.maximumExactIdentifierRankRegressions),
    check("known-irrelevant-case-increases", knownIrrelevantCaseIncreases.length, "<=", requirements.maximumKnownIrrelevantCaseIncreases),
  ];
  const accepted = checks.every((entry) => entry.passed);

  return {
    schemaVersion: 1,
    gate: gate.id,
    gateSha256: digest(gate),
    accepted,
    decision: accepted ? "eligible-for-portal-review" : "keep-active-ranking",
    comparableInputs,
    baseline: {
      searchAlgorithm: baseline.searchAlgorithm,
      reportSha256: digest(baseline),
      summary: baseline.summary,
    },
    candidate: {
      searchAlgorithm: candidate.searchAlgorithm,
      reportSha256: digest(candidate),
      summary: candidate.summary,
    },
    summaryDelta,
    caseChanges: {
      relevantAtKGains,
      relevantAtKLosses,
      firstRelevantRankRegressions,
      exactIdentifierRankRegressions,
      knownIrrelevantCaseIncreases,
    },
    checks,
  };
}

async function main() {
  const baselineOption = optionValue("--baseline");
  const candidateOption = optionValue("--candidate");
  const gateOption = optionValue("--gate");
  const outputOption = optionValue("--output");
  const verifyOption = optionValue("--verify");
  if (!baselineOption || !candidateOption || !gateOption) throw new Error("--baseline, --candidate, and --gate are required.");
  if (outputOption && verifyOption) throw new Error("Use either --output or --verify, not both.");
  const baselinePath = path.resolve(baselineOption);
  const candidatePath = path.resolve(candidateOption);
  const gatePath = path.resolve(gateOption);
  const [baselineText, candidateText, gateText] = await Promise.all([
    readFile(baselinePath, "utf8"),
    readFile(candidatePath, "utf8"),
    readFile(gatePath, "utf8"),
  ]);
  const report = compareSearchReports(JSON.parse(baselineText), JSON.parse(candidateText), JSON.parse(gateText));
  const serialized = `${JSON.stringify(report, null, 2)}\n`;
  if (verifyOption) {
    const expectedPath = path.resolve(verifyOption);
    const expected = await readFile(expectedPath, "utf8");
    if (expected !== serialized) throw new Error(`Search comparison differs from ${path.relative(root, expectedPath)}. Regenerate and review the decision intentionally.`);
    console.log(`Verified ${path.relative(root, expectedPath)}.`);
  } else if (outputOption) {
    const outputPath = path.resolve(outputOption);
    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, serialized);
    console.log(`Wrote ${path.relative(root, outputPath)}.`);
  } else {
    process.stdout.write(serialized);
  }
  console.error(report.accepted ? "Fusion candidate cleared the acceptance gate." : "Fusion candidate did not clear the acceptance gate; keep the active ranking.");
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) await main();
