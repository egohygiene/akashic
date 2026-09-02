import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { performance } from "node:perf_hooks";
import process from "node:process";
import { pathToFileURL } from "node:url";
import { brotliCompressSync, constants, gzipSync } from "node:zlib";

const root = process.cwd();
const defaultAlgorithmPath = path.join(root, "site/search/weighted-lexical-v2.js");
const defaultBudgetPath = path.join(root, "research/search/evaluations/performance-budget-v1.json");
const defaultCatalogPath = path.join(root, "dist/data/catalog.json");
const defaultFixturePath = path.join(root, "research/search/evaluations/natural-language-v1.json");

function optionValue(name, fallback = "") {
  const index = process.argv.indexOf(name);
  if (index === -1) return fallback;
  const value = process.argv[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`${name} requires a value.`);
  return value;
}

function hasOption(name) {
  return process.argv.includes(name);
}

function rounded(value) {
  return Number(value.toFixed(4));
}

function digest(value) {
  return createHash("sha256").update(value).digest("hex");
}

function positiveInteger(value, name) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) throw new Error(`${name} must be a positive integer.`);
  return parsed;
}

function budgetCheck(id, actual, maximum) {
  return { id, actual, operator: "<=", maximum, passed: actual <= maximum };
}

function validateMaximum(value, label) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) throw new Error(`${label} must be a positive number.`);
}

export function validatePerformanceBudget(budget) {
  if (budget?.schemaVersion !== 1 || typeof budget.id !== "string" || !budget.id || typeof budget.searchAlgorithm !== "string" || !budget.searchAlgorithm) throw new Error("Unsupported or incomplete search performance budget.");
  if (!Number.isInteger(budget.compression?.gzipLevel) || budget.compression.gzipLevel < 0 || budget.compression.gzipLevel > 9) throw new Error("gzipLevel must be an integer from 0 through 9.");
  if (!Number.isInteger(budget.compression?.brotliQuality) || budget.compression.brotliQuality < 0 || budget.compression.brotliQuality > 11) throw new Error("brotliQuality must be an integer from 0 through 11.");
  if (!Array.isArray(budget.transferGroups) || !budget.transferGroups.length) throw new Error("At least one transfer group is required.");
  const groupIds = new Set();
  for (const group of budget.transferGroups) {
    if (typeof group.id !== "string" || !group.id || groupIds.has(group.id)) throw new Error(`Invalid or duplicate transfer group: ${group.id || "unknown"}.`);
    groupIds.add(group.id);
    if (!Array.isArray(group.paths) || !group.paths.length || group.paths.some((assetPath) => typeof assetPath !== "string"
      || !assetPath.startsWith("dist/")
      || assetPath.includes("\\")
      || path.posix.normalize(assetPath) !== assetPath)) throw new Error(`Transfer group ${group.id} must contain normalized generated dist paths.`);
    if (new Set(group.paths).size !== group.paths.length) throw new Error(`Transfer group ${group.id} contains duplicate paths.`);
    validateMaximum(group.maximumRawBytes, `${group.id}.maximumRawBytes`);
    validateMaximum(group.maximumGzipBytes, `${group.id}.maximumGzipBytes`);
    validateMaximum(group.maximumBrotliBytes, `${group.id}.maximumBrotliBytes`);
  }
  if (!budget.timingProfiles || typeof budget.timingProfiles !== "object" || Array.isArray(budget.timingProfiles) || !Object.keys(budget.timingProfiles).length) throw new Error("At least one timing profile is required.");
  for (const [id, profile] of Object.entries(budget.timingProfiles)) {
    positiveInteger(profile.warmupPasses, `${id}.warmupPasses`);
    positiveInteger(profile.measurementPasses, `${id}.measurementPasses`);
    if (!Array.isArray(profile.requiredNodeFlags) || profile.requiredNodeFlags.some((flag) => typeof flag !== "string" || !flag.startsWith("--"))) throw new Error(`${id}.requiredNodeFlags must contain long-form Node.js flags.`);
    for (const field of [
      "maximumCatalogParseMilliseconds",
      "maximumIndexBuildMilliseconds",
      "maximumMedianQueryMilliseconds",
      "maximumP95QueryMilliseconds",
      "maximumQueryMilliseconds",
    ]) validateMaximum(profile[field], `${id}.${field}`);
  }
}

function percentile(sortedValues, fraction) {
  return sortedValues[Math.max(0, Math.ceil(sortedValues.length * fraction) - 1)];
}

export function summarizeDurations(durations) {
  if (!Array.isArray(durations) || !durations.length || durations.some((value) => typeof value !== "number" || !Number.isFinite(value) || value < 0)) throw new Error("Durations must be a non-empty array of non-negative numbers.");
  const sorted = [...durations].sort((left, right) => left - right);
  return {
    operationCount: sorted.length,
    meanMilliseconds: rounded(sorted.reduce((sum, value) => sum + value, 0) / sorted.length),
    medianMilliseconds: rounded(percentile(sorted, 0.5)),
    p95Milliseconds: rounded(percentile(sorted, 0.95)),
    p99Milliseconds: rounded(percentile(sorted, 0.99)),
    maximumMilliseconds: rounded(sorted.at(-1)),
  };
}

async function measureAssets(budget) {
  const assetPaths = [...new Set(budget.transferGroups.flatMap((group) => group.paths))].sort();
  const assets = await Promise.all(assetPaths.map(async (assetPath) => {
    const data = await readFile(path.resolve(root, assetPath));
    return {
      path: assetPath,
      sha256: digest(data),
      rawBytes: data.length,
      gzipBytes: gzipSync(data, { level: budget.compression.gzipLevel }).length,
      brotliBytes: brotliCompressSync(data, {
        params: { [constants.BROTLI_PARAM_QUALITY]: budget.compression.brotliQuality },
      }).length,
    };
  }));
  const assetByPath = new Map(assets.map((asset) => [asset.path, asset]));
  const groups = budget.transferGroups.map((group) => {
    const totals = group.paths.reduce((sum, assetPath) => {
      const asset = assetByPath.get(assetPath);
      if (!asset) throw new Error(`Transfer asset was not measured: ${assetPath}`);
      return {
        rawBytes: sum.rawBytes + asset.rawBytes,
        gzipBytes: sum.gzipBytes + asset.gzipBytes,
        brotliBytes: sum.brotliBytes + asset.brotliBytes,
      };
    }, { rawBytes: 0, gzipBytes: 0, brotliBytes: 0 });
    const checks = [
      budgetCheck("raw-bytes", totals.rawBytes, group.maximumRawBytes),
      budgetCheck("gzip-bytes", totals.gzipBytes, group.maximumGzipBytes),
      budgetCheck("brotli-bytes", totals.brotliBytes, group.maximumBrotliBytes),
    ];
    return {
      id: group.id,
      paths: group.paths,
      ...totals,
      checks,
      withinBudget: checks.every((entry) => entry.passed),
    };
  });
  return { assets, groups };
}

function timingChecks(profile, catalogParseMilliseconds, indexBuildMilliseconds, querySummary) {
  return [
    budgetCheck("catalog-parse-milliseconds", catalogParseMilliseconds, profile.maximumCatalogParseMilliseconds),
    budgetCheck("index-build-milliseconds", indexBuildMilliseconds, profile.maximumIndexBuildMilliseconds),
    budgetCheck("median-query-milliseconds", querySummary.medianMilliseconds, profile.maximumMedianQueryMilliseconds),
    budgetCheck("p95-query-milliseconds", querySummary.p95Milliseconds, profile.maximumP95QueryMilliseconds),
    budgetCheck("maximum-query-milliseconds", querySummary.maximumMilliseconds, profile.maximumQueryMilliseconds),
  ];
}

async function main() {
  const algorithmPath = path.resolve(optionValue("--algorithm", defaultAlgorithmPath));
  const budgetPath = path.resolve(optionValue("--budget", defaultBudgetPath));
  const catalogPath = path.resolve(optionValue("--catalog", defaultCatalogPath));
  const fixturePath = path.resolve(optionValue("--fixture", defaultFixturePath));
  const profileId = optionValue("--profile", "standard");
  const outputOption = optionValue("--output");
  const staticOutputOption = optionValue("--static-output");
  const staticVerifyOption = optionValue("--static-verify");
  const timingOnly = hasOption("--timing-only");
  if (staticOutputOption && staticVerifyOption) throw new Error("Use either --static-output or --static-verify, not both.");
  if (timingOnly && (staticOutputOption || staticVerifyOption)) throw new Error("--timing-only cannot be combined with a static report option.");

  const [algorithmText, budgetText, catalogText, fixtureText, runnerText] = await Promise.all([
    readFile(algorithmPath, "utf8"),
    readFile(budgetPath, "utf8"),
    readFile(catalogPath, "utf8"),
    readFile(fixturePath, "utf8"),
    readFile(new URL(import.meta.url), "utf8"),
  ]);
  const budget = JSON.parse(budgetText);
  validatePerformanceBudget(budget);
  const profile = budget.timingProfiles[profileId];
  if (!profile) throw new Error(`Unknown timing profile: ${profileId}`);
  const missingFlags = profile.requiredNodeFlags.filter((flag) => !process.execArgv.includes(flag));
  if (missingFlags.length) throw new Error(`Timing profile ${profileId} requires Node.js flags: ${missingFlags.join(", ")}`);
  const algorithm = await import(`${pathToFileURL(algorithmPath).href}?source=${digest(algorithmText)}`);
  if (algorithm.SEARCH_ALGORITHM_ID !== budget.searchAlgorithm || typeof algorithm.buildSearchIndex !== "function" || typeof algorithm.searchResources !== "function") throw new Error(`Performance budget expects a compatible ${budget.searchAlgorithm} module.`);
  const inputs = {
    algorithmSha256: digest(algorithmText),
    budgetSha256: digest(budgetText),
    catalogSha256: digest(catalogText),
    fixtureSha256: digest(fixtureText),
    runnerSha256: digest(runnerText),
  };

  const parseStarted = performance.now();
  const catalog = JSON.parse(catalogText);
  const catalogParseMilliseconds = rounded(performance.now() - parseStarted);
  const fixture = JSON.parse(fixtureText);
  if (!Array.isArray(catalog.resources) || !catalog.resources.length || !Array.isArray(fixture.cases) || !fixture.cases.length) throw new Error("Benchmark inputs must contain catalog resources and evaluation cases.");

  const heapAfterCatalogParseBytes = process.memoryUsage().heapUsed;
  const indexStarted = performance.now();
  for (const resource of catalog.resources) resource.searchIndex = algorithm.buildSearchIndex(resource);
  const indexBuildMilliseconds = rounded(performance.now() - indexStarted);
  const heapAfterIndexBytes = process.memoryUsage().heapUsed;
  const warmupPasses = positiveInteger(optionValue("--warmup-passes", String(profile.warmupPasses)), "--warmup-passes");
  const measurementPasses = positiveInteger(optionValue("--measurement-passes", String(profile.measurementPasses)), "--measurement-passes");

  for (let pass = 0; pass < warmupPasses; pass += 1) {
    for (const testCase of fixture.cases) algorithm.searchResources(catalog.resources, testCase.query);
  }
  const durations = [];
  const durationsByCase = new Map(fixture.cases.map((testCase) => [testCase.id, []]));
  for (let pass = 0; pass < measurementPasses; pass += 1) {
    for (const testCase of fixture.cases) {
      const started = performance.now();
      algorithm.searchResources(catalog.resources, testCase.query);
      const duration = performance.now() - started;
      durations.push(duration);
      durationsByCase.get(testCase.id).push(duration);
    }
  }
  const querySummary = summarizeDurations(durations);
  const checks = timingChecks(profile, catalogParseMilliseconds, indexBuildMilliseconds, querySummary);
  const timingReport = {
    profile: profileId,
    profileDescription: profile.description,
    environment: {
      node: process.version,
      platform: process.platform,
      architecture: process.arch,
      cpuModel: os.cpus()[0]?.model || "unknown",
      logicalCpuCount: os.cpus().length,
    },
    configuration: {
      warmupPasses,
      measurementPasses,
      queryCount: fixture.cases.length,
      catalogResourceCount: catalog.resources.length,
    },
    catalogParseMilliseconds,
    indexBuildMilliseconds,
    memoryObservation: {
      heapAfterCatalogParseBytes,
      heapAfterIndexBytes,
      observedIndexHeapDeltaBytes: heapAfterIndexBytes - heapAfterCatalogParseBytes,
    },
    querySummary,
    slowestCasesByP95: [...durationsByCase]
      .map(([id, values]) => ({ id, p95Milliseconds: summarizeDurations(values).p95Milliseconds }))
      .sort((left, right) => right.p95Milliseconds - left.p95Milliseconds || left.id.localeCompare(right.id))
      .slice(0, 5),
    checks,
    withinBudget: checks.every((entry) => entry.passed),
  };

  let staticReport = null;
  if (!timingOnly) {
    const measurements = await measureAssets(budget);
    staticReport = {
      schemaVersion: 1,
      suite: budget.id,
      searchAlgorithm: algorithm.SEARCH_ALGORITHM_ID,
      catalogResourceCount: catalog.resources.length,
      inputs,
      compression: budget.compression,
      assets: measurements.assets,
      transferGroups: measurements.groups,
      withinBudget: measurements.groups.every((group) => group.withinBudget),
    };
    const serialized = `${JSON.stringify(staticReport, null, 2)}\n`;
    if (staticVerifyOption) {
      const expectedPath = path.resolve(staticVerifyOption);
      const expected = await readFile(expectedPath, "utf8");
      if (expected !== serialized) throw new Error(`Static search performance report differs from ${path.relative(root, expectedPath)}. Regenerate and review it intentionally.`);
      console.log(`Verified ${path.relative(root, expectedPath)}.`);
    } else if (staticOutputOption) {
      const outputPath = path.resolve(staticOutputOption);
      await mkdir(path.dirname(outputPath), { recursive: true });
      await writeFile(outputPath, serialized);
      console.log(`Wrote ${path.relative(root, outputPath)}.`);
    }
  }

  const report = {
    schemaVersion: 1,
    suite: budget.id,
    searchAlgorithm: algorithm.SEARCH_ALGORITHM_ID,
    inputs,
    static: staticReport,
    timing: timingReport,
  };
  if (outputOption) {
    const outputPath = path.resolve(outputOption);
    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`);
    console.log(`Wrote ${path.relative(root, outputPath)}.`);
  }
  console.log(`Search timing (${profileId}): median ${querySummary.medianMilliseconds} ms; p95 ${querySummary.p95Milliseconds} ms; maximum ${querySummary.maximumMilliseconds} ms.`);
  if (staticReport) {
    for (const group of staticReport.transferGroups) console.log(`Transfer proxy (${group.id}): ${group.gzipBytes} gzip bytes; ${group.brotliBytes} Brotli bytes.`);
  }
  if (!timingReport.withinBudget || staticReport?.withinBudget === false) throw new Error("Search performance budget exceeded.");
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) await main();
