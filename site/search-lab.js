import { buildSearchIndex, searchResources, SEARCH_ALGORITHM_ID } from "./search.js";
import {
  buildReportFileName,
  normalizeResourceTiming,
  summarizeDurations,
  summarizeLongTasks,
} from "./search-lab-metrics.js";

const CATALOG_URL = new URL("./data/catalog.json", import.meta.url);
const FIXTURE_URL = new URL("./data/search-evaluation-v1.json", import.meta.url);
const SEARCH_ASSETS = [
  "search.js",
  "search/concepts-v1.js",
  "search/weighted-lexical-v2.js",
];
const THEME_KEY = "akashic-theme";
const LEGACY_THEME_KEY = "ego-awesome-theme";
const WARMUP_PASSES = 1;
const ALLOWED_MEASUREMENT_PASSES = new Set([1, 3, 5]);
const prefersReducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
const crossOriginIsolatedContext = globalThis.crossOriginIsolated === true;

const elements = {
  clear: document.querySelector("#clear-search-report"),
  download: document.querySelector("#download-search-report"),
  environment: document.querySelector("#environment-details"),
  metrics: document.querySelector("#lab-metrics"),
  passes: document.querySelector("#measurement-passes"),
  raw: document.querySelector("#report-json"),
  results: document.querySelector("#lab-results"),
  resultsTitle: document.querySelector("#results-title"),
  run: document.querySelector("#run-search-lab"),
  slowestRows: document.querySelector("#slowest-rows"),
  status: document.querySelector("#search-lab-status"),
  theme: document.querySelector("#theme-toggle"),
  transferRows: document.querySelector("#transfer-rows"),
};

let currentReport = null;
let resultsFocusTimer = null;

const round = (value) => Math.round(value * 10000) / 10000;
const formatMilliseconds = (value) => Number.isFinite(value) ? `${value.toFixed(value >= 100 ? 1 : 2)} ms` : "Unavailable";
const formatBytes = (value) => {
  if (!Number.isFinite(value)) return "Unavailable";
  if (value < 1024) return `${value} B`;
  return `${(value / 1024).toFixed(value >= 1024 * 100 ? 0 : 1)} KiB`;
};

function readStorage(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}

function writeStorage(key, value) {
  try { localStorage.setItem(key, value); } catch {}
}

function updateThemeControl() {
  const light = document.documentElement.dataset.theme === "light";
  elements.theme.setAttribute("aria-label", light ? "Switch to dark theme" : "Switch to light theme");
  elements.theme.firstElementChild.textContent = light ? "☾" : "☼";
  document.querySelector('meta[name="theme-color"]').content = light ? "#f7f3fb" : "#090711";
}

function initializeTheme() {
  const saved = readStorage(THEME_KEY) || readStorage(LEGACY_THEME_KEY);
  if (!document.documentElement.dataset.theme) document.documentElement.dataset.theme = saved || (matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
  updateThemeControl();
  elements.theme.addEventListener("click", () => {
    const theme = document.documentElement.dataset.theme === "light" ? "dark" : "light";
    document.documentElement.dataset.theme = theme;
    writeStorage(THEME_KEY, theme);
    updateThemeControl();
  });
}

function setStatus(message, state = "") {
  elements.status.textContent = message;
  elements.status.classList.toggle("is-error", state === "error");
  elements.status.classList.toggle("is-complete", state === "complete");
}

function yieldToBrowser() {
  if (document.visibilityState === "visible") return new Promise((resolve) => requestAnimationFrame(() => resolve()));
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function validateFixture(fixture) {
  if (fixture?.schemaVersion !== 1 || typeof fixture.id !== "string" || !Number.isInteger(fixture.topK) || fixture.topK < 1 || !Array.isArray(fixture.cases) || fixture.cases.length === 0) throw new Error("The browser evaluation fixture is invalid.");
  const ids = new Set();
  for (const testCase of fixture.cases) {
    if (!testCase?.id || !testCase?.query || ids.has(testCase.id)) throw new Error("The browser evaluation fixture contains an invalid or duplicate case.");
    ids.add(testCase.id);
  }
}

async function fetchJson(url) {
  const response = await fetch(url, { cache: "default", credentials: "same-origin" });
  if (!response.ok) throw new Error(`Request failed with status ${response.status}.`);
  const text = await response.text();
  return { data: JSON.parse(text), text };
}

async function sha256(text) {
  if (!globalThis.crypto?.subtle) return null;
  const digest = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function fingerprintSearchAssets() {
  return Promise.all(SEARCH_ASSETS.map(async (relativePath) => {
    const url = new URL(relativePath, import.meta.url);
    const response = await fetch(url, { cache: "default", credentials: "same-origin" });
    if (!response.ok) throw new Error(`Search asset request failed with status ${response.status}: ${relativePath}`);
    const text = await response.text();
    return {
      path: relativePath,
      bytes: new TextEncoder().encode(text).byteLength,
      sha256: await sha256(text),
    };
  }));
}

function matchingResourceTiming(url) {
  const entries = performance.getEntriesByName(url, "resource");
  return normalizeResourceTiming(entries.at(-1));
}

async function fetchCatalogText(url, cacheMode) {
  performance.clearResourceTimings();
  const startedAt = performance.now();
  const response = await fetch(url, { cache: cacheMode, credentials: "same-origin" });
  if (!response.ok) throw new Error(`Catalog request failed with status ${response.status}.`);
  const text = await response.text();
  const elapsedMilliseconds = round(performance.now() - startedAt);
  await Promise.resolve();
  return {
    cacheMode,
    elapsedMilliseconds,
    decodedTextBytes: new TextEncoder().encode(text).byteLength,
    resourceTiming: matchingResourceTiming(response.url || url.href),
    text,
  };
}

function observeLongTasks() {
  const supported = typeof PerformanceObserver === "function" && PerformanceObserver.supportedEntryTypes?.includes("longtask");
  if (!supported) return { supported: false, stop: async () => null };
  const entries = [];
  const startedAt = performance.now();
  const observer = new PerformanceObserver((list) => entries.push(...list.getEntries()));
  observer.observe({ type: "longtask", buffered: false });
  return {
    supported: true,
    stop: async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
      entries.push(...observer.takeRecords());
      observer.disconnect();
      return summarizeLongTasks(entries.filter((entry) => entry.startTime >= startedAt));
    },
  };
}

function legacyHeapSnapshot() {
  const memory = performance.memory;
  if (!memory) return null;
  return {
    usedJSHeapBytes: Number.isFinite(memory.usedJSHeapSize) ? memory.usedJSHeapSize : null,
    totalJSHeapBytes: Number.isFinite(memory.totalJSHeapSize) ? memory.totalJSHeapSize : null,
    jsHeapLimitBytes: Number.isFinite(memory.jsHeapSizeLimit) ? memory.jsHeapSizeLimit : null,
  };
}

async function userAgentMemorySnapshot() {
  const supported = crossOriginIsolatedContext && typeof performance.measureUserAgentSpecificMemory === "function";
  if (!supported) return null;
  try {
    const result = await performance.measureUserAgentSpecificMemory();
    return {
      bytes: Number.isFinite(result.bytes) ? result.bytes : null,
      breakdownCount: Array.isArray(result.breakdown) ? result.breakdown.length : null,
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}

function environmentSnapshot() {
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  return {
    userAgent: navigator.userAgent,
    platform: navigator.userAgentData?.platform || navigator.platform || null,
    hardwareConcurrency: navigator.hardwareConcurrency || null,
    deviceMemoryGigabytes: navigator.deviceMemory || null,
    maximumTouchPoints: navigator.maxTouchPoints || 0,
    viewport: {
      widthCssPixels: innerWidth,
      heightCssPixels: innerHeight,
      devicePixelRatio,
    },
    connection: connection ? {
      effectiveType: connection.effectiveType || null,
      downlinkMegabitsPerSecond: Number.isFinite(connection.downlink) ? connection.downlink : null,
      roundTripTimeMilliseconds: Number.isFinite(connection.rtt) ? connection.rtt : null,
      saveData: typeof connection.saveData === "boolean" ? connection.saveData : null,
    } : null,
    preferences: {
      reducedMotion: prefersReducedMotion.matches,
      colorScheme: matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark",
    },
    documentVisibilityAtStart: document.visibilityState,
    secureContext: globalThis.isSecureContext === true,
    crossOriginIsolated: crossOriginIsolatedContext,
  };
}

function buildPerCaseSummaries(samples) {
  const grouped = new Map();
  for (const sample of samples) {
    if (!grouped.has(sample.caseId)) grouped.set(sample.caseId, []);
    grouped.get(sample.caseId).push(sample);
  }
  return [...grouped].map(([caseId, caseSamples]) => ({
    caseId,
    summary: summarizeDurations(caseSamples.map((sample) => sample.durationMilliseconds)),
    resultCount: caseSamples.at(-1).resultCount,
    firstResultId: caseSamples.at(-1).firstResultId,
  })).sort((left, right) => right.summary.maximumMilliseconds - left.summary.maximumMilliseconds || left.caseId.localeCompare(right.caseId));
}

async function runQueries(resources, fixture, measurementPasses) {
  for (let pass = 1; pass <= WARMUP_PASSES; pass += 1) {
    setStatus(`Warming the search kernel · pass ${pass} of ${WARMUP_PASSES}…`);
    for (const testCase of fixture.cases) {
      await yieldToBrowser();
      searchResources(resources, testCase.query).slice(0, fixture.topK);
    }
  }

  const samples = [];
  for (let pass = 1; pass <= measurementPasses; pass += 1) {
    setStatus(`Measuring public queries · pass ${pass} of ${measurementPasses}…`);
    for (const testCase of fixture.cases) {
      await yieldToBrowser();
      const startedAt = performance.now();
      const results = searchResources(resources, testCase.query).slice(0, fixture.topK);
      samples.push({
        caseId: testCase.id,
        pass,
        durationMilliseconds: round(performance.now() - startedAt),
        resultCount: results.length,
        firstResultId: results[0]?.id || null,
      });
    }
  }
  return {
    summary: summarizeDurations(samples.map((sample) => sample.durationMilliseconds)),
    byCase: buildPerCaseSummaries(samples),
    samples,
  };
}

function renderMetrics(report) {
  const longTasks = report.timings.mainThread.longTasks;
  const values = [
    [report.inputs.catalog.resourceCount.toLocaleString(), "Catalog resources"],
    [formatMilliseconds(report.timings.catalogParseMilliseconds), "Catalog parse"],
    [formatMilliseconds(report.timings.indexBuildMilliseconds), "Index build"],
    [formatMilliseconds(report.timings.queries.summary.medianMilliseconds), "Median query"],
    [formatMilliseconds(report.timings.queries.summary.p95Milliseconds), "P95 query"],
    [longTasks ? String(longTasks.taskCount) : "N/A", "Observed long tasks"],
  ];
  elements.metrics.replaceChildren(...values.map(([value, label]) => {
    const wrapper = document.createElement("div");
    const term = document.createElement("dt");
    const description = document.createElement("dd");
    term.textContent = value;
    description.textContent = label;
    wrapper.append(term, description);
    return wrapper;
  }));
}

function appendTableCell(row, primary, secondary = "") {
  const cell = document.createElement("td");
  const strong = document.createElement("strong");
  strong.textContent = primary;
  cell.append(strong);
  if (secondary) {
    const small = document.createElement("small");
    small.textContent = secondary;
    cell.append(small);
  }
  row.append(cell);
}

function renderTransfer(report) {
  const requests = [
    ["Reload", report.transfer.catalogReload],
    ["Repeat", report.transfer.catalogRepeat],
  ];
  elements.transferRows.replaceChildren(...requests.map(([label, request]) => {
    const row = document.createElement("tr");
    appendTableCell(row, label, request.cacheMode);
    appendTableCell(row, formatMilliseconds(request.elapsedMilliseconds));
    appendTableCell(row, formatBytes(request.resourceTiming?.transferSizeBytes), `${formatBytes(request.decodedTextBytes)} decoded text`);
    appendTableCell(row, formatBytes(request.resourceTiming?.encodedBodySizeBytes));
    appendTableCell(row, request.resourceTiming ? (request.resourceTiming.reportedCacheHit ? "Reported cache hit" : "No cache hit reported") : "Timing unavailable");
    return row;
  }));
}

function printable(value, formatter = String) {
  return value === null || value === undefined ? "Unavailable" : formatter(value);
}

function renderEnvironment(report) {
  const environment = report.environment;
  const connection = environment.connection;
  const longTasks = report.timings.mainThread;
  const memory = report.memory;
  const values = [
    ["Browser", environment.userAgent],
    ["Platform", printable(environment.platform)],
    ["Viewport", `${environment.viewport.widthCssPixels} × ${environment.viewport.heightCssPixels} CSS px · ${environment.viewport.devicePixelRatio}×`],
    ["Logical processors", printable(environment.hardwareConcurrency)],
    ["Approx. device memory", printable(environment.deviceMemoryGigabytes, (value) => `${value} GiB`)],
    ["Connection", connection ? [connection.effectiveType, connection.downlinkMegabitsPerSecond ? `${connection.downlinkMegabitsPerSecond} Mb/s` : null, connection.roundTripTimeMilliseconds ? `${connection.roundTripTimeMilliseconds} ms RTT` : null].filter(Boolean).join(" · ") || "API available" : "API unavailable"],
    ["Long-task API", longTasks.supported ? "Supported" : "Unavailable"],
    ["UA memory API", memory.userAgentSpecific ? (memory.userAgentSpecific.error ? "Measurement failed" : formatBytes(memory.userAgentSpecific.bytes)) : "Unavailable"],
    ["Cross-origin isolated", environment.crossOriginIsolated ? "Yes" : "No"],
    ["Document visibility", `${environment.documentVisibilityAtStart} → ${environment.documentVisibilityAtEnd}${environment.hiddenDuringRun ? " · hidden during run" : ""}`],
  ];
  elements.environment.replaceChildren(...values.map(([label, value]) => {
    const wrapper = document.createElement("div");
    const term = document.createElement("dt");
    const description = document.createElement("dd");
    term.textContent = label;
    description.textContent = value;
    wrapper.append(term, description);
    return wrapper;
  }));
}

function renderSlowest(report) {
  elements.slowestRows.replaceChildren(...report.timings.queries.byCase.slice(0, 7).map((entry) => {
    const row = document.createElement("tr");
    appendTableCell(row, entry.caseId, entry.firstResultId ? `First result: ${entry.firstResultId}` : "No result");
    appendTableCell(row, formatMilliseconds(entry.summary.maximumMilliseconds));
    appendTableCell(row, formatMilliseconds(entry.summary.meanMilliseconds));
    appendTableCell(row, String(entry.resultCount));
    return row;
  }));
}

function renderReport(report) {
  currentReport = report;
  elements.raw.textContent = `${JSON.stringify(report, null, 2)}\n`;
  renderMetrics(report);
  renderTransfer(report);
  renderEnvironment(report);
  renderSlowest(report);
  elements.download.disabled = false;
  elements.results.hidden = false;
  elements.results.scrollIntoView({ behavior: prefersReducedMotion.matches ? "auto" : "smooth", block: "start" });
  clearTimeout(resultsFocusTimer);
  resultsFocusTimer = setTimeout(() => elements.resultsTitle.focus({ preventScroll: true }), prefersReducedMotion.matches ? 0 : 350);
}

function transferRecord(measurement) {
  return {
    cacheMode: measurement.cacheMode,
    elapsedMilliseconds: measurement.elapsedMilliseconds,
    decodedTextBytes: measurement.decodedTextBytes,
    resourceTiming: measurement.resourceTiming,
  };
}

async function runBenchmark() {
  const measurementPasses = Number(elements.passes.value);
  if (!ALLOWED_MEASUREMENT_PASSES.has(measurementPasses)) {
    setStatus("Choose one of the available sample depths.", "error");
    return;
  }
  elements.run.disabled = true;
  elements.passes.disabled = true;
  elements.download.disabled = true;
  elements.results.hidden = true;
  currentReport = null;
  const visibilityStates = new Set([document.visibilityState]);
  const recordVisibility = () => visibilityStates.add(document.visibilityState);
  document.addEventListener("visibilitychange", recordVisibility);

  try {
    setStatus("Loading the public evaluation fixture…");
    const fixtureResponse = await fetchJson(FIXTURE_URL);
    const fixture = fixtureResponse.data;
    validateFixture(fixture);
    const environment = environmentSnapshot();
    const heapBefore = legacyHeapSnapshot();
    const longTaskObservation = observeLongTasks();
    const wallStartedAt = performance.now();

    const catalogRequestUrl = new URL(CATALOG_URL);
    catalogRequestUrl.searchParams.set("labRun", String(Date.now()));
    setStatus("Measuring a network-first catalog request…");
    const reload = await fetchCatalogText(catalogRequestUrl, "reload");

    setStatus("Parsing the catalog…");
    const parseStartedAt = performance.now();
    const catalog = JSON.parse(reload.text);
    const catalogParseMilliseconds = round(performance.now() - parseStartedAt);
    if (catalog?.schemaVersion !== 2 || !Array.isArray(catalog.resources) || catalog.resources.length !== catalog.resourceCount) throw new Error("The generated catalog is invalid.");

    setStatus("Measuring the repeat catalog request…");
    const repeat = await fetchCatalogText(catalogRequestUrl, "default");

    setStatus("Building the in-memory search index…");
    const indexStartedAt = performance.now();
    for (const resource of catalog.resources) resource.searchIndex = buildSearchIndex(resource);
    const indexBuildMilliseconds = round(performance.now() - indexStartedAt);

    const queries = await runQueries(catalog.resources, fixture, measurementPasses);
    const benchmarkWallMilliseconds = round(performance.now() - wallStartedAt);
    const longTasks = await longTaskObservation.stop();
    const heapAfter = legacyHeapSnapshot();
    environment.documentVisibilityAtEnd = document.visibilityState;
    environment.visibilityStatesObserved = [...visibilityStates];
    environment.hiddenDuringRun = visibilityStates.has("hidden");
    setStatus("Checking optional browser memory support…");
    const userAgentSpecific = await userAgentMemorySnapshot();
    setStatus("Fingerprinting the exact benchmark inputs…");
    const [catalogSha256, fixtureSha256, searchAssets] = await Promise.all([
      sha256(reload.text),
      sha256(fixtureResponse.text),
      fingerprintSearchAssets(),
    ]);
    const generatedAt = new Date().toISOString();

    const report = {
      schemaVersion: 1,
      id: "akashic-browser-search-measurement-v1",
      generatedAt,
      searchAlgorithm: SEARCH_ALGORITHM_ID,
      inputs: {
        catalog: {
          path: "data/catalog.json",
          schemaVersion: catalog.schemaVersion,
          resourceCount: catalog.resourceCount,
          sha256: catalogSha256,
        },
        fixture: {
          path: "data/search-evaluation-v1.json",
          schemaVersion: fixture.schemaVersion,
          id: fixture.id,
          caseCount: fixture.cases.length,
          topK: fixture.topK,
          sha256: fixtureSha256,
        },
        searchAssets,
      },
      configuration: {
        warmupPasses: WARMUP_PASSES,
        measurementPasses,
        yieldBetweenQueries: true,
      },
      privacy: {
        querySource: "versioned-public-fixture-only",
        acceptsUserQueries: false,
        storedByLab: false,
        transmittedByLab: false,
        exportRequiresExplicitAction: true,
      },
      environment,
      capabilities: {
        resourceTiming: typeof PerformanceResourceTiming === "function",
        longTasks: longTaskObservation.supported,
        legacyPerformanceMemory: heapAfter !== null,
        userAgentSpecificMemory: crossOriginIsolatedContext && typeof performance.measureUserAgentSpecificMemory === "function",
        webCryptoDigest: typeof globalThis.crypto?.subtle === "object",
      },
      transfer: {
        catalogReload: transferRecord(reload),
        catalogRepeat: transferRecord(repeat),
      },
      timings: {
        benchmarkWallMilliseconds,
        catalogParseMilliseconds,
        indexBuildMilliseconds,
        queries,
        mainThread: {
          supported: longTaskObservation.supported,
          longTasks,
        },
      },
      memory: {
        legacyJSHeapBefore: heapBefore,
        legacyJSHeapAfter: heapAfter,
        legacyUsedJSHeapDeltaBytes: Number.isFinite(heapBefore?.usedJSHeapBytes) && Number.isFinite(heapAfter?.usedJSHeapBytes) ? heapAfter.usedJSHeapBytes - heapBefore.usedJSHeapBytes : null,
        userAgentSpecific,
      },
      method: {
        catalogReload: "A unique same-origin catalog URL is fetched with Request.cache=reload, then fully consumed as text.",
        catalogRepeat: "The identical URL is fetched again with Request.cache=default, preserving the browser's ordinary cache behavior.",
        resourceBytes: "Transfer, encoded-body, and decoded-body values come from same-origin PerformanceResourceTiming when exposed by the browser.",
        queryTiming: "performance.now() surrounds each synchronous top-k lexical search; the event loop yields before every fixture query.",
        longTasks: "When supported, PerformanceObserver records longtask entries during catalog fetch, parse, index construction, warm-up, and measured searches. Estimated blocking subtracts 50 ms from each observed duration.",
        memory: "Legacy JS heap values are non-standard snapshots. User-agent-specific memory is recorded only when the browser exposes it in a cross-origin-isolated context.",
        inputIdentity: "SHA-256 digests identify the exact catalog, fixture, and active lexical modules when Web Crypto is available. Asset fetches and hashing occur after the timed benchmark.",
        interpretation: "This is an environment-specific observation. Compare reports only with their complete environment and configuration context.",
      },
    };

    renderReport(report);
    setStatus(`Complete · ${queries.summary.operationCount} measured searches across ${fixture.cases.length} public cases.`, "complete");
  } catch (error) {
    console.error(error);
    setStatus(`The benchmark could not finish: ${error instanceof Error ? error.message : String(error)}`, "error");
  } finally {
    document.removeEventListener("visibilitychange", recordVisibility);
    elements.run.disabled = false;
    elements.passes.disabled = false;
  }
}

function downloadReport() {
  if (!currentReport) return;
  const blob = new Blob([`${JSON.stringify(currentReport, null, 2)}\n`], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = buildReportFileName(currentReport.generatedAt);
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function clearReport() {
  clearTimeout(resultsFocusTimer);
  resultsFocusTimer = null;
  currentReport = null;
  elements.results.hidden = true;
  elements.download.disabled = true;
  elements.raw.textContent = "";
  setStatus("Report cleared. Nothing was stored or submitted.");
  elements.run.focus();
}

initializeTheme();
elements.run.addEventListener("click", runBenchmark);
elements.download.addEventListener("click", downloadReport);
elements.clear.addEventListener("click", clearReport);
