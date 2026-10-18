import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import { decodeCatalog } from "../site/catalog-data.js";
import { createDiscoveryResolver } from "../site/discovery-search.js";
import { NEED_PATHS } from "../site/needs.js";
import { buildSearchIndex, SEARCH_ALGORITHM_ID, searchResources } from "../site/search.js";
import { createContentSources, validateContentOverlays } from "./lib/content-overlays.mjs";
import { loadEvaluationFixture } from "./lib/search-evaluation.mjs";

const FIXTURE_PATH = "research/search/evaluations/localization-discovery-v1.json";
const REGRESSION_PATHS = ["research/search/evaluations/natural-language-v1.json", "research/search/evaluations/natural-language-v2.json"];
const sha256 = (value) => createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value)).digest("hex");
const identity = (entry) => JSON.stringify([entry.locale, entry.kind || entry.target.kind, entry.target?.id || entry.id, entry.field]);

function optionValue(name, fallback = "") {
  const index = process.argv.indexOf(name);
  if (index === -1) return fallback;
  const value = process.argv[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`${name} requires a value.`);
  return value;
}

function rankingSummary(resources, positiveIds, negativeIds, topK) {
  const rankedIds = resources.map((resource) => resource.id);
  const ranks = (ids) => ids.map((id) => ({ id, rank: rankedIds.indexOf(id) + 1 || null }));
  const relevant = ranks(positiveIds);
  const knownIrrelevant = ranks(negativeIds);
  return {
    resultCount: resources.length,
    topResourceIds: rankedIds.slice(0, topK),
    relevant,
    relevantFoundAtK: relevant.filter(({ rank }) => rank !== null && rank <= topK).length,
    knownIrrelevant,
    knownIrrelevantFoundAtK: knownIrrelevant.filter(({ rank }) => rank !== null && rank <= topK).length,
  };
}

export function evaluateLocalizationCase(testCase, resources, resolve, topK) {
  const resolution = resolve(testCase.query);
  if (resolution.status !== testCase.expectedStatus) throw new Error(`Unexpected localization resolution for ${testCase.id}: ${resolution.status}.`);
  return {
    id: testCase.id,
    query: testCase.query,
    resolvedQuery: resolution.query,
    status: resolution.status,
    ...(resolution.target ? { target: resolution.target } : {}),
    note: testCase.note,
    before: rankingSummary(searchResources(resources, testCase.query), testCase.relevantResourceIds, testCase.knownIrrelevantResourceIds, topK),
    after: rankingSummary(searchResources(resources, resolution.query), testCase.relevantResourceIds, testCase.knownIrrelevantResourceIds, topK),
  };
}

function validateFixture(fixture, resourceIds) {
  if (fixture.schemaVersion !== 1 || fixture.mode !== "controlled-publication-fixture" || fixture.locale !== "ru"
    || !Array.isArray(fixture.controlledAliases) || !Array.isArray(fixture.cases) || fixture.cases.length !== 12
    || !Number.isSafeInteger(fixture.topK) || fixture.topK < 1) throw new Error("Invalid bounded localization evaluation fixture.");
  const ids = new Set();
  for (const testCase of fixture.cases) {
    if (typeof testCase.id !== "string" || !testCase.id || ids.has(testCase.id) || typeof testCase.query !== "string" || !testCase.query.trim()
      || !["mapped", "unchanged", "ambiguous", "protected"].includes(testCase.expectedStatus)
      || !Array.isArray(testCase.relevantResourceIds) || !Array.isArray(testCase.knownIrrelevantResourceIds)
      || typeof testCase.note !== "string") throw new Error("Invalid localization evaluation case.");
    ids.add(testCase.id);
    for (const id of [...testCase.relevantResourceIds, ...testCase.knownIrrelevantResourceIds]) if (!resourceIds.has(id)) throw new Error(`Unknown canonical resource ID ${id} in ${testCase.id}.`);
    if (testCase.relevantResourceIds.some((id) => testCase.knownIrrelevantResourceIds.includes(id))) throw new Error(`Conflicting resource judgments in ${testCase.id}.`);
  }
}

export async function buildLocalizationReport(root = process.cwd(), catalogPath = "dist/data/catalog-v3.json") {
  const inputPaths = [
    catalogPath, FIXTURE_PATH, "localization/content-overlays-v1.json", "dist/data/atlas.json", "site/i18n/locales.json", "site/i18n/en.json",
    "site/discovery-search.js", "site/search/weighted-lexical-v2.js", "site/search/concepts-v1.js", "site/needs.js",
    ...REGRESSION_PATHS,
  ];
  const texts = new Map(await Promise.all(inputPaths.map(async (file) => [file, await readFile(path.resolve(root, file), "utf8")])));
  const catalog = decodeCatalog(JSON.parse(texts.get(catalogPath)));
  const resources = catalog.resources.map((resource) => ({ ...resource, searchIndex: buildSearchIndex(resource) }));
  const fixture = JSON.parse(texts.get(FIXTURE_PATH));
  validateFixture(fixture, new Set(resources.map((resource) => resource.id)));
  const resolve = createDiscoveryResolver({ locale: fixture.locale, aliases: fixture.controlledAliases, catalog, needs: NEED_PATHS });
  const cases = fixture.cases.map((testCase) => evaluateLocalizationCase(testCase, resources, resolve, fixture.topK));

  // Prove that actual authored AI drafts never enter the public search adapter.
  // This path consumes the same canonical binding validator used by the build.
  const overlays = JSON.parse(texts.get("localization/content-overlays-v1.json"));
  const sources = createContentSources({ catalog, atlas: JSON.parse(texts.get("dist/data/atlas.json")), needs: NEED_PATHS, englishMessages: JSON.parse(texts.get("site/i18n/en.json")).messages });
  const actual = validateContentOverlays(overlays, { sources, locales: JSON.parse(texts.get("site/i18n/locales.json")) });
  const publishedKeys = new Set(actual.published.map(identity));
  const excluded = actual.report.entries.filter((entry) => entry.effectiveStatus !== "reviewed");
  if (excluded.some((entry) => publishedKeys.has(identity(entry)))) throw new Error("An unreviewed or non-current authored entry reached the publication projection.");
  const actualAliases = actual.published.filter((entry) => entry.field === "aliases");
  const actualResolve = createDiscoveryResolver({ locale: fixture.locale, aliases: actualAliases, catalog, needs: NEED_PATHS });
  const actualChanges = fixture.cases.filter((testCase) => actualResolve(testCase.query).query !== testCase.query).map((testCase) => testCase.id);
  if (!actualAliases.length && actualChanges.length) throw new Error("Empty actual alias publication changed search behavior.");

  // Existing corpora, judgments, concepts, and ranking implementations are never
  // rewritten. Compare complete ordered result sets, not only top-K metrics.
  const materialized = await Promise.all(REGRESSION_PATHS.map((file) => loadEvaluationFixture(path.resolve(root, file))));
  const languageById = new Map(materialized.flatMap((suite) => suite.cases.filter((testCase) => testCase.language).map((testCase) => [testCase.id, testCase.language])));
  const regressions = materialized.map((suite, index) => {
    const englishCases = suite.cases.filter((testCase) => (testCase.language || languageById.get(testCase.id) || "en") === "en");
    const before = englishCases.map((testCase) => ({ id: testCase.id, query: testCase.query, rankedIds: searchResources(resources, testCase.query).map((resource) => resource.id) }));
    const after = englishCases.map((testCase) => ({ id: testCase.id, query: resolve(testCase.query).query, rankedIds: searchResources(resources, resolve(testCase.query).query).map((resource) => resource.id) }));
    if (JSON.stringify(before) !== JSON.stringify(after)) throw new Error(`Localization changed canonical English search in ${suite.id}.`);
    return { suite: suite.id, fixtureSha256: sha256(texts.get(REGRESSION_PATHS[index])), englishCaseCount: englishCases.length, completeRankingBeforeSha256: sha256(before), completeRankingAfterSha256: sha256(after), unchanged: true };
  });
  const sum = (side, field) => cases.reduce((count, entry) => count + entry[side][field], 0);
  return {
    schemaVersion: 1,
    suite: fixture.id,
    mode: fixture.mode,
    publicationNotice: "Controlled test-only hypothetical published aliases. Actual AI-authored translations require human review; this report does not confer review or publish translations.",
    searchAlgorithm: SEARCH_ALGORITHM_ID,
    catalogResourceCount: resources.length,
    topK: fixture.topK,
    inputs: {
      catalogSha256: sha256({ categories: catalog.categories, resources: catalog.resources }),
      fixtureSha256: sha256(texts.get(FIXTURE_PATH)),
      authoredOverlaysSha256: sha256(texts.get("localization/content-overlays-v1.json")),
      implementationSha256: sha256(texts.get("site/discovery-search.js")),
      rankerSha256: sha256(texts.get("site/search/weighted-lexical-v2.js")),
      conceptsSha256: sha256(texts.get("site/search/concepts-v1.js")),
      needsSha256: sha256(texts.get("site/needs.js")),
    },
    actualPublication: { counts: actual.report.counts, aliasEntryCount: actualAliases.length, excludedEntryCount: excluded.length, excludedEntriesPublished: 0, changedEvaluationCaseIds: actualChanges },
    englishRegression: regressions,
    summary: {
      caseCount: cases.length,
      mappedCaseCount: cases.filter((entry) => entry.status === "mapped").length,
      guardedCaseCount: cases.filter((entry) => entry.status !== "mapped").length,
      relevantResourceJudgmentCount: fixture.cases.reduce((count, entry) => count + entry.relevantResourceIds.length, 0),
      relevantFoundAtKBefore: sum("before", "relevantFoundAtK"),
      relevantFoundAtKAfter: sum("after", "relevantFoundAtK"),
      knownIrrelevantResourceJudgmentCount: fixture.cases.reduce((count, entry) => count + entry.knownIrrelevantResourceIds.length, 0),
      knownIrrelevantFoundAtKBefore: sum("before", "knownIrrelevantFoundAtK"),
      knownIrrelevantFoundAtKAfter: sum("after", "knownIrrelevantFoundAtK"),
      limitation: "Canonical query expansion inherits the frozen ranker's broad-query false positives. Known negatives are reported, not suppressed or treated as a production quality pass.",
    },
    cases,
  };
}

async function main() {
  const output = optionValue("--output");
  const verify = optionValue("--verify-report");
  if (output && verify) throw new Error("Use either --output or --verify-report, not both.");
  const report = await buildLocalizationReport(process.cwd(), optionValue("--catalog", "dist/data/catalog-v3.json"));
  const serialized = `${JSON.stringify(report, null, 2)}\n`;
  if (verify) {
    if (await readFile(path.resolve(verify), "utf8") !== serialized) throw new Error(`Localization report differs from ${verify}. Regenerate and review intentionally.`);
    console.log(`Verified ${verify}.`);
  } else if (output) {
    await mkdir(path.dirname(path.resolve(output)), { recursive: true });
    await writeFile(path.resolve(output), serialized);
    console.log(`Wrote ${output}.`);
  } else process.stdout.write(serialized);
  console.error(`Evaluated ${report.summary.caseCount} controlled localization cases; ${report.actualPublication.aliasEntryCount} actual alias entries published; English regression unchanged.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) await main();
