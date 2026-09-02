import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const defaultCatalogPath = path.join(root, "dist/data/catalog.json");
const defaultFixturePath = path.join(root, "research/search/evaluations/natural-language-v1.json");
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

function evaluateCase(testCase, resources, topK, algorithm) {
  const relevantUrls = new Set(testCase.relevantUrls.map(normalizedUrl));
  const matches = rankResources(algorithm, resources, testCase.query);
  const ranked = matches.slice(0, topK);
  const explanations = explainRankedResources(algorithm, resources, testCase.query, ranked);
  const relevantRanks = [];
  for (const [index, resource] of matches.entries()) {
    if (relevantUrls.has(normalizedUrl(resource.url))) relevantRanks.push(index + 1);
  }
  const foundAtK = relevantRanks.filter((rank) => rank <= topK).length;
  const firstRelevantRank = relevantRanks[0] || null;
  return {
    id: testCase.id,
    query: testCase.query,
    kind: testCase.kind,
    resultCount: matches.length,
    relevantCount: relevantUrls.size,
    relevantFoundAtK: foundAtK,
    recallAtK: relevantUrls.size ? rounded(foundAtK / relevantUrls.size) : 0,
    reciprocalRank: firstRelevantRank ? rounded(1 / firstRelevantRank) : 0,
    firstRelevantRank,
    relevantRanks,
    topResults: ranked.map((resource, index) => {
      const result = {
        rank: index + 1,
        title: resource.title,
        url: resource.url,
        collection: resource.category,
        topic: resource.section,
        relevant: relevantUrls.has(normalizedUrl(resource.url)),
      };
      if (index < EXPLANATION_REPORT_DEPTH && explanations[index]) result.matchExplanation = explanations[index];
      return result;
    }),
  };
}

async function main() {
  const catalogPath = path.resolve(optionValue("--catalog", defaultCatalogPath));
  const fixturePath = path.resolve(optionValue("--fixture", defaultFixturePath));
  const algorithmPath = path.resolve(optionValue("--algorithm", defaultAlgorithmPath));
  const outputOption = optionValue("--output");
  const verifyOption = optionValue("--verify");
  if (outputOption && verifyOption) throw new Error("Use either --output or --verify, not both.");
  const [catalogText, fixtureText, algorithmText] = await Promise.all([
    readFile(catalogPath, "utf8"),
    readFile(fixturePath, "utf8"),
    readFile(algorithmPath, "utf8"),
  ]);
  const algorithm = await import(`${pathToFileURL(algorithmPath).href}?source=${digest(algorithmText)}`);
  if (typeof algorithm.SEARCH_ALGORITHM_ID !== "string" || !algorithm.SEARCH_ALGORITHM_ID) throw new Error("Search algorithm must export SEARCH_ALGORITHM_ID.");
  const catalog = JSON.parse(catalogText);
  const fixture = JSON.parse(fixtureText);
  if (fixture.schemaVersion !== 1 || !Array.isArray(fixture.cases) || !fixture.cases.length) throw new Error("Unsupported or empty search evaluation fixture.");
  if (!Array.isArray(catalog.resources) || !catalog.resources.length) throw new Error("The generated catalog has no resources. Run node scripts/build-site.mjs first.");
  const topK = Number(optionValue("--top-k", String(fixture.topK || 10)));
  if (!Number.isInteger(topK) || topK < 1) throw new Error("--top-k must be a positive integer.");

  const catalogUrls = new Set(catalog.resources.map((resource) => normalizedUrl(resource.url)));
  const caseIds = new Set();
  const queries = new Set();
  for (const testCase of fixture.cases) {
    if (!testCase.id || !testCase.query || !["natural-language", "exact-identifier"].includes(testCase.kind) || typeof testCase.rationale !== "string" || !testCase.rationale.trim() || !Array.isArray(testCase.relevantUrls) || !testCase.relevantUrls.length || !Array.isArray(testCase.safetyInvariants) || !testCase.safetyInvariants.length || testCase.safetyInvariants.some((invariant) => typeof invariant !== "string" || !invariant.trim())) throw new Error(`Incomplete evaluation case: ${testCase.id || "unknown"}.`);
    if (caseIds.has(testCase.id)) throw new Error(`Duplicate evaluation case ID: ${testCase.id}.`);
    caseIds.add(testCase.id);
    const normalizedQuery = testCase.query.trim().toLocaleLowerCase("en-US");
    if (queries.has(normalizedQuery)) throw new Error(`Duplicate evaluation query: ${testCase.query}.`);
    queries.add(normalizedQuery);
    const relevantUrls = testCase.relevantUrls.map(normalizedUrl);
    if (new Set(relevantUrls).size !== relevantUrls.length) throw new Error(`Evaluation case ${testCase.id} contains duplicate relevant URLs.`);
    const missingUrls = testCase.relevantUrls.filter((url) => !catalogUrls.has(normalizedUrl(url)));
    if (missingUrls.length) throw new Error(`Evaluation case ${testCase.id} references resources outside the catalog: ${missingUrls.join(", ")}`);
  }

  const cases = fixture.cases.map((testCase) => evaluateCase(testCase, catalog.resources, topK, algorithm));
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
    summary: {
      caseCount: cases.length,
      zeroResultCount: cases.filter((testCase) => testCase.resultCount === 0).length,
      casesWithRelevantAtK: cases.filter((testCase) => testCase.relevantFoundAtK > 0).length,
      meanRecallAtK: rounded(cases.reduce((sum, testCase) => sum + testCase.recallAtK, 0) / cases.length),
      meanReciprocalRank: rounded(cases.reduce((sum, testCase) => sum + testCase.reciprocalRank, 0) / cases.length),
    },
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

await main();
