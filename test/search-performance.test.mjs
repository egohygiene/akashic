import assert from "node:assert/strict";
import test from "node:test";
import {
  summarizeDurations,
  validatePerformanceBudget,
} from "../scripts/benchmark-search.mjs";

const budget = {
  schemaVersion: 1,
  id: "test-performance",
  searchAlgorithm: "test-search",
  compression: {
    gzipLevel: 9,
    brotliQuality: 11,
  },
  transferGroups: [
    {
      id: "test-group",
      paths: ["dist/test.js"],
      maximumRawBytes: 100,
      maximumGzipBytes: 100,
      maximumBrotliBytes: 100,
    },
  ],
  timingProfiles: {
    standard: {
      warmupPasses: 1,
      measurementPasses: 2,
      requiredNodeFlags: [],
      maximumCatalogParseMilliseconds: 100,
      maximumIndexBuildMilliseconds: 100,
      maximumMedianQueryMilliseconds: 100,
      maximumP95QueryMilliseconds: 100,
      maximumQueryMilliseconds: 100,
    },
  },
};

test("search performance summaries use deterministic nearest-rank percentiles", () => {
  assert.deepEqual(summarizeDurations([5, 1, 4, 2, 3]), {
    operationCount: 5,
    meanMilliseconds: 3,
    medianMilliseconds: 3,
    p95Milliseconds: 5,
    p99Milliseconds: 5,
    maximumMilliseconds: 5,
  });
});

test("search performance budget accepts explicit transfer and timing constraints", () => {
  assert.doesNotThrow(() => validatePerformanceBudget(budget));
});

test("search performance budget rejects unsafe paths, duplicate groups, and invalid flags", () => {
  const unsafePath = structuredClone(budget);
  unsafePath.transferGroups[0].paths = ["site/test.js"];
  assert.throws(() => validatePerformanceBudget(unsafePath), /generated dist paths/);

  const traversalPath = structuredClone(budget);
  traversalPath.transferGroups[0].paths = ["dist/../site/test.js"];
  assert.throws(() => validatePerformanceBudget(traversalPath), /generated dist paths/);

  const duplicateGroup = structuredClone(budget);
  duplicateGroup.transferGroups.push(structuredClone(duplicateGroup.transferGroups[0]));
  assert.throws(() => validatePerformanceBudget(duplicateGroup), /duplicate transfer group/);

  const shortFlag = structuredClone(budget);
  shortFlag.timingProfiles.standard.requiredNodeFlags = ["-x"];
  assert.throws(() => validatePerformanceBudget(shortFlag), /long-form Node.js flags/);
});

test("search performance summaries reject missing or invalid measurements", () => {
  assert.throws(() => summarizeDurations([]), /non-empty array/);
  assert.throws(() => summarizeDurations([1, -1]), /non-negative numbers/);
});
