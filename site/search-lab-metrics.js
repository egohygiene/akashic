const LONG_TASK_THRESHOLD_MILLISECONDS = 50;

const round = (value) => Math.round(value * 10000) / 10000;

function validateDurations(durations) {
  if (!Array.isArray(durations) || durations.length === 0) throw new Error("Durations must be a non-empty array.");
  if (durations.some((duration) => !Number.isFinite(duration) || duration < 0)) throw new Error("Durations must contain non-negative finite numbers.");
}

export function nearestRankPercentile(durations, percentile) {
  validateDurations(durations);
  if (!Number.isFinite(percentile) || percentile <= 0 || percentile > 1) throw new Error("Percentile must be greater than zero and at most one.");
  const sorted = [...durations].sort((left, right) => left - right);
  return sorted[Math.ceil(percentile * sorted.length) - 1];
}

export function summarizeDurations(durations) {
  validateDurations(durations);
  const mean = durations.reduce((sum, duration) => sum + duration, 0) / durations.length;
  return {
    operationCount: durations.length,
    meanMilliseconds: round(mean),
    medianMilliseconds: round(nearestRankPercentile(durations, 0.5)),
    p95Milliseconds: round(nearestRankPercentile(durations, 0.95)),
    p99Milliseconds: round(nearestRankPercentile(durations, 0.99)),
    maximumMilliseconds: round(Math.max(...durations)),
  };
}

export function summarizeLongTasks(entries) {
  if (!Array.isArray(entries)) throw new Error("Long-task entries must be an array.");
  const durations = entries.map((entry) => entry?.duration);
  if (durations.some((duration) => !Number.isFinite(duration) || duration < 0)) throw new Error("Long-task durations must be non-negative finite numbers.");
  return {
    taskCount: durations.length,
    totalDurationMilliseconds: round(durations.reduce((sum, duration) => sum + duration, 0)),
    estimatedBlockingMilliseconds: round(durations.reduce((sum, duration) => sum + Math.max(0, duration - LONG_TASK_THRESHOLD_MILLISECONDS), 0)),
    maximumDurationMilliseconds: round(durations.length ? Math.max(...durations) : 0),
  };
}

export function normalizeResourceTiming(entry) {
  if (!entry) return null;
  const number = (value) => Number.isFinite(value) ? round(value) : null;
  const transferSize = number(entry.transferSize);
  const encodedBodySize = number(entry.encodedBodySize);
  const decodedBodySize = number(entry.decodedBodySize);
  return {
    durationMilliseconds: number(entry.duration),
    transferSizeBytes: transferSize,
    encodedBodySizeBytes: encodedBodySize,
    decodedBodySizeBytes: decodedBodySize,
    nextHopProtocol: entry.nextHopProtocol || null,
    deliveryType: entry.deliveryType || null,
    responseStatus: Number.isInteger(entry.responseStatus) ? entry.responseStatus : null,
    reportedCacheHit: transferSize === 0 && decodedBodySize > 0,
    reportedCompressed: encodedBodySize > 0 && decodedBodySize > encodedBodySize,
  };
}

export function buildReportFileName(generatedAt) {
  const timestamp = new Date(generatedAt);
  if (Number.isNaN(timestamp.getTime())) throw new Error("A valid report timestamp is required.");
  return `akashic-search-browser-${timestamp.toISOString().replace(/[:.]/g, "-")}.json`;
}
