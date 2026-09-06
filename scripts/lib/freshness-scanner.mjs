import { createHash } from "node:crypto";
import { lookup as dnsLookup } from "node:dns/promises";
import http from "node:http";
import https from "node:https";
import { isIP } from "node:net";
import { performance } from "node:perf_hooks";
import { repositoryIndexDigest } from "./bookmark-intake.mjs";
import { validateFreshnessObservationBundle } from "./freshness.mjs";
import { inspectBookmarkUrl, isPrivateNetworkHostname, urlIdentity } from "./url-identity.mjs";

const REDIRECT_CODES = new Set([300, 301, 302, 303, 307, 308]);
const HEAD_FALLBACK_CODES = new Set([400, 403, 405, 406, 409, 415, 418, 422, 501]);
const TRANSIENT_CODES = new Set([408, 425]);
const GITHUB_REPOSITORY_PATTERN = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;

function positiveInteger(value, label, maximum = Number.MAX_SAFE_INTEGER) {
  if (!Number.isInteger(value) || value < 1 || value > maximum) throw new Error(`${label} must be an integer between 1 and ${maximum}.`);
  return value;
}

function nonNegativeInteger(value, label, maximum = Number.MAX_SAFE_INTEGER) {
  if (!Number.isInteger(value) || value < 0 || value > maximum) throw new Error(`${label} must be an integer between 0 and ${maximum}.`);
  return value;
}

function normalizedHostname(value) {
  return new URL(value).hostname.toLocaleLowerCase("en-US").replace(/^www\./, "");
}

export function freshnessShardForUrl(url, shardCount) {
  positiveInteger(shardCount, "shardCount", 256);
  return createHash("sha256").update(normalizedHostname(url)).digest().readUInt32BE(0) % shardCount;
}

export function changedResourceKeysFromDiff(diff) {
  const keys = new Set();
  let source = null;
  for (const line of diff.split("\n")) {
    if (line.startsWith("+++ ")) {
      const target = line.slice(4).trim();
      source = target === "/dev/null" ? null : target.replace(/^b\//, "");
      continue;
    }
    if (!source || !line.startsWith("+") || line.startsWith("+++")) continue;
    const link = line.slice(1).match(/\]\((https?:\/\/[^)\s]+)(?:\s+"[^"]*")?\)/i);
    if (!link) continue;
    try {
      keys.add(`${source}\u0000${urlIdentity(link[1])}`);
    } catch {
      // Collection validation owns malformed entries; the scanner only selects safe current resources.
    }
  }
  return keys;
}

export function selectFreshnessTargets({ index, changedDiff = null, shardIndex = 0, shardCount = 1 }) {
  positiveInteger(shardCount, "shardCount", 256);
  nonNegativeInteger(shardIndex, "shardIndex", shardCount - 1);
  const changedKeys = changedDiff === null ? null : changedResourceKeysFromDiff(changedDiff);
  return index.resources.filter((resource) => {
    if (changedKeys && !changedKeys.has(`${resource.source}\u0000${urlIdentity(resource.url)}`)) return false;
    return freshnessShardForUrl(resource.url, shardCount) === shardIndex;
  }).sort((left, right) => left.source.localeCompare(right.source) || left.id.localeCompare(right.id));
}

export function createDomainThrottle({ delayMs = 1_000, now = Date.now, sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)) } = {}) {
  nonNegativeInteger(delayMs, "delayMs", 60_000);
  const tails = new Map();
  const lastStartedAt = new Map();
  return {
    async wait(hostname) {
      const domain = hostname.toLocaleLowerCase("en-US");
      const previous = tails.get(domain) || Promise.resolve();
      const current = previous.catch(() => {}).then(async () => {
        const remaining = lastStartedAt.has(domain) ? lastStartedAt.get(domain) + delayMs - now() : 0;
        if (remaining > 0) await sleep(remaining);
        lastStartedAt.set(domain, now());
      });
      tails.set(domain, current);
      await current;
      if (tails.get(domain) === current) tails.delete(domain);
    },
  };
}

function publicAddressRecords(records, hostname) {
  if (!records.length) throw Object.assign(new Error(`No address records for ${hostname}.`), { code: "ENOTFOUND" });
  if (records.some((record) => isPrivateNetworkHostname(record.address))) {
    throw Object.assign(new Error(`Refusing a non-public address for ${hostname}.`), { code: "EHOSTUNREACH" });
  }
  return records;
}

export async function resolvePublicAddresses(hostname, lookup = dnsLookup) {
  const unbracketed = hostname.replace(/^\[|\]$/g, "");
  const literalFamily = isIP(unbracketed);
  if (literalFamily) return publicAddressRecords([{ address: unbracketed, family: literalFamily }], hostname);
  return publicAddressRecords(await lookup(hostname, { all: true, verbatim: true }), hostname);
}

function pinnedLookup(records) {
  return (_hostname, options, callback) => {
    const family = typeof options === "number" ? options : options?.family || 0;
    const candidates = family ? records.filter((record) => record.family === family) : records;
    const selected = candidates.length ? candidates : records;
    if (typeof options === "object" && options.all) callback(null, selected);
    else callback(null, selected[0].address, selected[0].family);
  };
}

async function withinTimeout(promise, timeoutMs) {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(Object.assign(new Error("Request timed out."), { code: "ETIMEDOUT" })), timeoutMs);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

function requestHeaders(url, { method, timeoutMs, headers, addresses }) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const request = (parsed.protocol === "https:" ? https : http).request({
      protocol: parsed.protocol,
      hostname: parsed.hostname.replace(/^\[|\]$/g, ""),
      port: parsed.port || undefined,
      path: `${parsed.pathname}${parsed.search}`,
      method,
      headers,
      lookup: pinnedLookup(addresses),
      agent: false,
    }, (response) => {
      const result = { statusCode: response.statusCode, location: response.headers.location || null };
      response.destroy();
      resolve(result);
    });
    request.setTimeout(timeoutMs, () => request.destroy(Object.assign(new Error("Request timed out."), { code: "ETIMEDOUT" })));
    request.once("error", reject);
    request.end();
  });
}

export function classifyNetworkError(error) {
  if (["ETIMEDOUT", "ABORT_ERR"].includes(error?.code) || /timed? out/i.test(error?.message || "")) return "timeout";
  if (["ENOTFOUND", "EAI_AGAIN", "EAI_FAIL", "ENODATA"].includes(error?.code)) return "dns-error";
  if (/^(?:CERT_|ERR_OSSL_|ERR_SSL_|ERR_TLS_|DEPTH_ZERO_SELF_SIGNED_CERT|SELF_SIGNED_CERT|UNABLE_TO_GET_ISSUER_CERT|UNABLE_TO_VERIFY_LEAF_SIGNATURE)/.test(error?.code || "")) return "tls-error";
  return "connection-error";
}

export function createFreshnessTransport({
  throttle = createDomainThrottle(),
  lookup = dnsLookup,
  clock = () => performance.now(),
  request = requestHeaders,
  maxRedirects = 5,
  userAgent = "akashic-freshness-observer/1 (+https://github.com/egohygiene/akashic)",
} = {}) {
  nonNegativeInteger(maxRedirects, "maxRedirects", 10);
  return {
    throttle,
    async request({ url, method, timeoutMs }) {
      const startedAt = clock();
      let currentUrl = url;
      try {
        for (let redirects = 0; ; redirects += 1) {
          const inspected = inspectBookmarkUrl(currentUrl);
          if (!inspected.accepted) throw Object.assign(new Error(`Unsafe request target: ${inspected.reason}.`), { code: "EHOSTUNREACH" });
          currentUrl = inspected.canonicalUrl;
          const parsed = new URL(currentUrl);
          await throttle.wait(parsed.hostname);
          let remainingMs = Math.max(0, timeoutMs - Math.round(clock() - startedAt));
          if (!remainingMs) throw Object.assign(new Error("Request timed out."), { code: "ETIMEDOUT" });
          const addresses = await withinTimeout(resolvePublicAddresses(parsed.hostname, lookup), remainingMs);
          remainingMs = Math.max(0, timeoutMs - Math.round(clock() - startedAt));
          if (!remainingMs) throw Object.assign(new Error("Request timed out."), { code: "ETIMEDOUT" });
          const response = await withinTimeout(request(currentUrl, {
            method,
            timeoutMs: remainingMs,
            addresses,
            headers: {
              Accept: "*/*",
              Connection: "close",
              "User-Agent": userAgent,
              ...(method === "GET" ? { Range: "bytes=0-0" } : {}),
            },
          }), remainingMs);
          if (!REDIRECT_CODES.has(response.statusCode) || !response.location || redirects >= maxRedirects) {
            return { outcome: "response", statusCode: response.statusCode, durationMs: Math.max(0, Math.round(clock() - startedAt)), finalUrl: currentUrl };
          }
          const destination = new URL(response.location, currentUrl).toString();
          const destinationInspection = inspectBookmarkUrl(destination);
          if (!destinationInspection.accepted) {
            return { outcome: "response", statusCode: response.statusCode, durationMs: Math.max(0, Math.round(clock() - startedAt)), finalUrl: currentUrl };
          }
          currentUrl = destinationInspection.canonicalUrl;
        }
      } catch (error) {
        return { outcome: classifyNetworkError(error), statusCode: null, durationMs: Math.max(0, Math.round(clock() - startedAt)), finalUrl: null };
      }
    },
  };
}

function isTransientAttempt(attempt) {
  return attempt.outcome !== "response" || TRANSIENT_CODES.has(attempt.statusCode) || attempt.statusCode >= 500;
}

function needsGetFallback(attempt) {
  return attempt.outcome !== "response" || TRANSIENT_CODES.has(attempt.statusCode) || HEAD_FALLBACK_CODES.has(attempt.statusCode) || attempt.statusCode >= 500;
}

async function runMethod({ method, url, transport, timeoutMs, retries, wait }) {
  const attempts = [];
  for (let retry = 0; retry <= retries; retry += 1) {
    const attempt = await transport.request({ url, method, timeoutMs });
    attempts.push({ method, outcome: attempt.outcome, statusCode: attempt.statusCode, durationMs: attempt.durationMs });
    if (!isTransientAttempt(attempt) || retry === retries) return { attempts, finalUrl: attempt.finalUrl };
    await wait(250 * (2 ** retry));
  }
  throw new Error("Unreachable retry state.");
}

function githubRepositoryFromUrl(url) {
  const parsed = new URL(url);
  if (normalizedHostname(url) !== "github.com") return null;
  const parts = parsed.pathname.split("/").filter(Boolean).slice(0, 2);
  if (parts.length !== 2) return null;
  const repository = `${parts[0]}/${parts[1].replace(/\.git$/i, "")}`;
  return GITHUB_REPOSITORY_PATTERN.test(repository) ? repository : null;
}

async function readLimitedJson(response, maximumBytes = 65_536) {
  const chunks = [];
  let bytes = 0;
  for await (const chunk of response.body || []) {
    bytes += chunk.length;
    if (bytes > maximumBytes) throw new Error("GitHub response exceeded the size limit.");
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

export async function lookupGitHubRepository(repository, { token = "", fetchImplementation = fetch, timeoutMs = 10_000, throttle = null } = {}) {
  if (!GITHUB_REPOSITORY_PATTERN.test(repository)) throw new Error("GitHub repository must use owner/name.");
  let url = `https://api.github.com/repos/${repository}`;
  for (let redirects = 0; redirects <= 3; redirects += 1) {
    if (throttle) await throttle.wait("api.github.com");
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImplementation(url, {
        redirect: "manual",
        signal: controller.signal,
        headers: {
          Accept: "application/vnd.github+json",
          "User-Agent": "akashic-freshness-observer/1",
          "X-GitHub-Api-Version": "2022-11-28",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (REDIRECT_CODES.has(response.status) && response.headers.get("location") && redirects < 3) {
        const destination = new URL(response.headers.get("location"), url);
        if (destination.protocol !== "https:" || destination.hostname !== "api.github.com") return null;
        url = destination.toString();
        continue;
      }
      if (!response.ok) return null;
      const payload = await readLimitedJson(response);
      if (!GITHUB_REPOSITORY_PATTERN.test(payload.full_name || "") || typeof payload.archived !== "boolean") return null;
      return { repository, canonicalRepository: payload.full_name, archived: payload.archived };
    } finally {
      clearTimeout(timer);
    }
  }
  return null;
}

export async function scanFreshnessResource(resource, {
  transport,
  timeoutMs = 10_000,
  retries = 1,
  wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)),
  githubLookup = lookupGitHubRepository,
  githubToken = "",
} = {}) {
  positiveInteger(timeoutMs, "timeoutMs", 60_000);
  nonNegativeInteger(retries, "retries", 1);
  if (!transport?.request) throw new Error("A freshness transport is required.");
  const head = await runMethod({ method: "HEAD", url: resource.url, transport, timeoutMs, retries, wait });
  let attempts = head.attempts;
  let finalUrl = head.finalUrl;
  if (needsGetFallback({ ...attempts.at(-1), finalUrl })) {
    const get = await runMethod({ method: "GET", url: resource.url, transport, timeoutMs, retries, wait });
    attempts = [...attempts, ...get.attempts];
    finalUrl = get.finalUrl;
  }
  const repository = githubRepositoryFromUrl(resource.url);
  let github = null;
  if (repository) {
    try {
      github = await githubLookup(repository, { token: githubToken, timeoutMs, throttle: transport.throttle || null });
    } catch {
      github = null;
    }
  }
  return {
    resourceId: resource.id,
    source: resource.source,
    url: resource.url,
    attempts,
    finalUrl,
    github,
  };
}

export async function scanFreshnessTargets({ index, targets, observedAt = new Date().toISOString(), concurrency = 8, ...options }) {
  positiveInteger(concurrency, "concurrency", 32);
  if (!targets.length) return null;
  const observations = new Array(targets.length);
  let cursor = 0;
  async function worker() {
    while (cursor < targets.length) {
      const targetIndex = cursor;
      cursor += 1;
      observations[targetIndex] = await scanFreshnessResource(targets[targetIndex], options);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, targets.length) }, () => worker()));
  const bundle = {
    schemaVersion: 1,
    catalogSha256: repositoryIndexDigest(index),
    observedAt,
    observations,
  };
  validateFreshnessObservationBundle(bundle, index);
  return bundle;
}
