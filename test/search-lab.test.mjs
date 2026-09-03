import assert from "node:assert/strict";
import test from "node:test";
import {
  buildReportFileName,
  nearestRankPercentile,
  normalizeResourceTiming,
  summarizeDurations,
  summarizeLongTasks,
} from "../site/search-lab-metrics.js";

test("browser measurement summaries use deterministic nearest-rank percentiles", () => {
  assert.equal(nearestRankPercentile([5, 1, 4, 2, 3], 0.5), 3);
  assert.deepEqual(summarizeDurations([5, 1, 4, 2, 3]), {
    operationCount: 5,
    meanMilliseconds: 3,
    medianMilliseconds: 3,
    p95Milliseconds: 5,
    p99Milliseconds: 5,
    maximumMilliseconds: 5,
  });
});

test("browser measurement summaries reject invalid samples", () => {
  assert.throws(() => nearestRankPercentile([1], 0), /Percentile/);
  assert.throws(() => summarizeDurations([]), /non-empty/);
  assert.throws(() => summarizeDurations([1, -1]), /non-negative/);
});

test("long-task summaries report total and threshold-relative blocking time", () => {
  assert.deepEqual(summarizeLongTasks([{ duration: 75.12345 }, { duration: 50 }, { duration: 125 }]), {
    taskCount: 3,
    totalDurationMilliseconds: 250.1235,
    estimatedBlockingMilliseconds: 100.1235,
    maximumDurationMilliseconds: 125,
  });
  assert.deepEqual(summarizeLongTasks([]), {
    taskCount: 0,
    totalDurationMilliseconds: 0,
    estimatedBlockingMilliseconds: 0,
    maximumDurationMilliseconds: 0,
  });
});

test("resource timings preserve unavailable values and identify cache and compression signals", () => {
  assert.equal(normalizeResourceTiming(null), null);
  assert.deepEqual(normalizeResourceTiming({
    duration: 12.34567,
    transferSize: 0,
    encodedBodySize: 100,
    decodedBodySize: 250,
    nextHopProtocol: "h2",
    deliveryType: "cache",
    responseStatus: 200,
  }), {
    durationMilliseconds: 12.3457,
    transferSizeBytes: 0,
    encodedBodySizeBytes: 100,
    decodedBodySizeBytes: 250,
    nextHopProtocol: "h2",
    deliveryType: "cache",
    responseStatus: 200,
    reportedCacheHit: true,
    reportedCompressed: true,
  });
});

test("report file names are stable and filesystem-safe", () => {
  assert.equal(buildReportFileName("2026-09-02T23:30:01.123Z"), "akashic-search-browser-2026-09-02T23-30-01-123Z.json");
  assert.throws(() => buildReportFileName("not-a-date"), /valid report timestamp/);
});
