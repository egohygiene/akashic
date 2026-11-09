import { mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import { LEGACY_ROUTES, ROUTE_REGISTRY, publicationProfile, validateCurrentSourcePlan } from "./lib/intelligence-publication-profile.mjs";

// Historical inventory compatibility only; verification selects by exact pin.
export const REQUIRED_ROUTES = Object.freeze([
  "/",
  ...LEGACY_ROUTES
]);

const REDIRECT_STATUSES = new Set([301, 302, 307, 308]);
const FULL_SHA = /^[0-9a-f]{40}$/;
const POSITIVE_INTEGER = /^[1-9][0-9]*$/;
const MAX_PUBLIC_JSON_BYTES = 1024 * 1024;

function fail(message) {
  throw new Error(`Repository Intelligence publication verification failed: ${message}`);
}

export function normalizeOrigin(value, label) {
  let origin;
  try {
    origin = new URL(value);
  } catch {
    fail(`${label} must be an absolute URL`);
  }
  if (
    origin.protocol !== "https:"
    || origin.username
    || origin.password
    || origin.search
    || origin.hash
    || !origin.hostname
    || !origin.pathname.endsWith("/")
  ) {
    fail(`${label} must be a credential-free HTTPS directory URL`);
  }
  return origin;
}

export function routeUrl(origin, route) {
  const relative = route === "/" ? "" : route.slice(1);
  return new URL(relative, origin).toString();
}

function parsePositiveInteger(value, label, maximum) {
  if (!POSITIVE_INTEGER.test(value || "")) fail(`${label} must be a positive integer`);
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed > maximum) fail(`${label} exceeds ${maximum}`);
  return parsed;
}

export function parseArguments(arguments_) {
  const values = new Map();
  for (let index = 0; index < arguments_.length; index += 2) {
    const key = arguments_[index];
    const value = arguments_[index + 1];
    if (!key?.startsWith("--") || value === undefined || values.has(key)) {
      fail("arguments must be unique --name value pairs");
    }
    values.set(key, value);
  }
  const allowed = new Set([
    "--attempts",
    "--delay-seconds",
    "--expected-relay-revision",
    "--fallback-origin",
    "--origin",
    "--output",
    "--represented-revision",
    "--workflow-run-attempt",
    "--workflow-run-id"
  ]);
  for (const key of values.keys()) {
    if (!allowed.has(key)) fail(`unsupported argument ${key}`);
  }
  for (const required of allowed) {
    if (!values.has(required)) fail(`missing ${required}`);
  }
  const representedRevision = values.get("--represented-revision");
  if (!FULL_SHA.test(representedRevision || "")) fail("represented revision must be a full SHA");
  const expectedRelayRevision = values.get("--expected-relay-revision");
  publicationProfile(expectedRelayRevision, representedRevision);
  const output = values.get("--output");
  if (
    !/^[A-Za-z0-9._-]+(?:\/[A-Za-z0-9._-]+)*$/.test(output || "")
    || output.split("/").some((segment) => segment === "." || segment === "..")
  ) {
    fail("output must be a canonical repository-relative path");
  }
  return {
    attempts: parsePositiveInteger(values.get("--attempts"), "attempts", 30),
    delayMilliseconds: parsePositiveInteger(values.get("--delay-seconds"), "delay seconds", 60) * 1000,
    expectedRelayRevision,
    fallbackOrigin: normalizeOrigin(values.get("--fallback-origin"), "fallback origin"),
    origin: normalizeOrigin(values.get("--origin"), "canonical origin"),
    output,
    representedRevision,
    workflowRunAttempt: parsePositiveInteger(values.get("--workflow-run-attempt"), "workflow run attempt", Number.MAX_SAFE_INTEGER),
    workflowRunId: parsePositiveInteger(values.get("--workflow-run-id"), "workflow run ID", Number.MAX_SAFE_INTEGER)
  };
}

async function boundedFetch(url, options, fetchImplementation, consume = (response) => response) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetchImplementation(url, {
      ...options,
      headers: { "user-agent": "egohygiene-akashic-publication-verifier/1" },
      signal: controller.signal
    });
    return await consume(response);
  } finally {
    clearTimeout(timeout);
  }
}

async function readPublicJson(origin, relativePath, fetchImplementation) {
  const expectedUrl = new URL(relativePath, origin).toString();
  return boundedFetch(expectedUrl, { redirect: "error" }, fetchImplementation, async (response) => {
    if (!response.ok || response.url !== expectedUrl || !response.body) {
      fail(`public evidence ${relativePath} is unavailable at the canonical origin`);
    }
    const declaredBytes = Number(response.headers.get("content-length"));
    if (Number.isFinite(declaredBytes) && declaredBytes > MAX_PUBLIC_JSON_BYTES) {
      fail(`public evidence ${relativePath} exceeds the bounded JSON limit`);
    }
    const reader = response.body.getReader();
    const chunks = [];
    let byteLength = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        byteLength += value.byteLength;
        if (byteLength > MAX_PUBLIC_JSON_BYTES) {
          await reader.cancel();
          fail(`public evidence ${relativePath} exceeds the bounded JSON limit`);
        }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }
    const bytes = Buffer.concat(chunks, byteLength);
    let document;
    try {
      document = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
    } catch {
      fail(`public evidence ${relativePath} is not a valid UTF-8 JSON object`);
    }
    if (!document || typeof document !== "object" || Array.isArray(document)) {
      fail(`public evidence ${relativePath} is not a JSON object`);
    }
    return { document, bytes: byteLength, sha256: `sha256:${createHash("sha256").update(bytes).digest("hex")}` };
  });
}

export async function verifyPublicationOnce({ fallbackOrigin, origin, representedRevision, expectedRelayRevision }, fetchImplementation = fetch) {
  const profile = publicationProfile(expectedRelayRevision, representedRevision);
  const routes = [];
  const aliases = [];
  for (const route of ["/", ...profile.routes]) {
    const expectedUrl = routeUrl(origin, route);
    const response = await boundedFetch(expectedUrl, { redirect: "follow" }, fetchImplementation);
    if (!response.ok || response.url !== expectedUrl) {
      fail(`canonical route ${route} returned ${response.status} at ${response.url}`);
    }
    routes.push({ route, status: response.status, url: response.url });

    const fallbackUrl = routeUrl(fallbackOrigin, route);
    const fallbackResponse = await boundedFetch(fallbackUrl, { redirect: "manual" }, fetchImplementation);
    const location = fallbackResponse.headers.get("location");
    if (!REDIRECT_STATUSES.has(fallbackResponse.status) || location !== expectedUrl) {
      fail(`fallback route ${route} is not a redirect-only alias to the canonical origin`);
    }
    aliases.push({
      location,
      route,
      status: fallbackResponse.status,
      url: fallbackUrl
    });
  }
  const provenanceEvidence = await readPublicJson(origin, "intelligence/provenance.json", fetchImplementation);
  const provenance = provenanceEvidence.document;
  if (
    provenance.schema !== "egohygiene.relay.repository-intelligence-provenance/v1"
    || provenance.schema_version !== 1
    || provenance.consumer?.repository !== "egohygiene/akashic"
    || provenance.consumer?.source_commit !== representedRevision
    || provenance.consumer?.visibility !== "public"
    || provenance.generator?.name !== "egohygiene/relay/actions/repository-intelligence"
    || provenance.generator?.repository !== "egohygiene/relay"
    || provenance.generator?.source_commit !== profile.relayRevision
    || provenance.generator?.source_ref !== profile.relayRevision
    || provenance.generator?.version !== profile.relayVersion
    || provenance.generator?.immutable !== true
    || provenance.projection?.route !== "/intelligence/"
    || provenance.projection?.classification !== "public-safe"
    || provenance.projection?.deployment_authority !== "consumer"
  ) {
    fail("served provenance does not match the exact expected generator, represented source and publication profile");
  }
  const sourceBinding = { provenance_sha256: provenanceEvidence.sha256 };
  if (profile.manifest) {
    validateCurrentSourcePlan(provenance, representedRevision, { requireCapturedSources: true });
    const manifestEvidence = await readPublicJson(origin, "intelligence/build-manifest.json", fetchImplementation);
    const manifest = manifestEvidence.document;
    if (
      manifest.schema !== "egohygiene.relay.repository-intelligence-build-manifest/v1"
      || manifest.schema_version !== 1
      || manifest.consumer?.repository !== "egohygiene/akashic"
      || manifest.consumer?.revision !== representedRevision
      || manifest.generator?.repository !== "egohygiene/relay"
      || manifest.generator?.revision !== profile.relayRevision
      || manifest.generator?.version !== profile.relayVersion
      || JSON.stringify(manifest.enabled_routes) !== JSON.stringify(profile.routes)
      || !/^sha256:[0-9a-f]{64}$/.test(manifest.bundle?.digest || "")
    ) {
      fail("served build manifest does not match the exact expected publication profile");
    }
    const routeEvidence = await readPublicJson(origin, "intelligence/routes.json", fetchImplementation);
    const routeManifest = routeEvidence.document;
    if (
      routeManifest.schema !== "egohygiene.relay.repository-intelligence-routes/v1"
      || routeManifest.schema_version !== 1
      || routeManifest.profile !== "repository"
      || routeManifest.repository !== "egohygiene/akashic"
      || routeManifest.represented_commit !== representedRevision
      || Object.keys(ROUTE_REGISTRY).some((key) => routeManifest.registry?.[key] !== ROUTE_REGISTRY[key])
      || !Array.isArray(routeManifest.routes)
      || JSON.stringify(routeManifest.routes.map((route) => route?.canonical_route).sort()) !== JSON.stringify(profile.routes)
    ) {
      fail("served routes do not match the expected repository registry profile");
    }
    for (const [relativePath, evidence] of [
      ["provenance.json", provenanceEvidence],
      ["routes.json", routeEvidence]
    ]) {
      const records = Array.isArray(manifest.bundle?.files)
        ? manifest.bundle.files.filter((record) => record?.path === relativePath)
        : [];
      if (records.length !== 1 || records[0].sha256 !== evidence.sha256 || records[0].bytes !== evidence.bytes) {
        fail("served public source evidence does not match the build manifest inventory");
      }
    }
    Object.assign(sourceBinding, {
      build_manifest_sha256: manifestEvidence.sha256,
      declared_bundle_digest: manifest.bundle.digest,
      routes_sha256: routeEvidence.sha256
    });
  }
  return { aliases, routes, profile, sourceBinding };
}

async function verifyWithRetries(options) {
  let lastError;
  for (let attempt = 1; attempt <= options.attempts; attempt += 1) {
    try {
      return { attempt, evidence: await verifyPublicationOnce(options) };
    } catch (error) {
      lastError = error;
      if (attempt < options.attempts) {
        await new Promise((resolve) => setTimeout(resolve, options.delayMilliseconds));
      }
    }
  }
  throw lastError;
}

export async function main(arguments_ = process.argv.slice(2)) {
  const options = parseArguments(arguments_);
  if (options.origin.hostname === options.fallbackOrigin.hostname) {
    fail("canonical and fallback origins must be distinct");
  }
  const { attempt, evidence } = await verifyWithRetries(options);
  const report = {
    schema: "egohygiene.akashic.repository-intelligence-live-verification/v1",
    schema_version: 1,
    repository: "egohygiene/akashic",
    represented_revision: options.representedRevision,
    publisher: {
      revision: evidence.profile.relayRevision,
      version: evidence.profile.relayVersion,
      bundle_profile: evidence.profile.id
    },
    source_binding: evidence.sourceBinding,
    workflow: {
      run_attempt: options.workflowRunAttempt,
      run_id: options.workflowRunId
    },
    observed_at: new Date().toISOString(),
    canonical_origin: options.origin.toString(),
    fallback_origin: options.fallbackOrigin.toString(),
    attempt,
    conclusion: "success",
    routes: evidence.routes,
    redirect_only_aliases: evidence.aliases
  };
  await mkdir(path.dirname(options.output), { recursive: true });
  await writeFile(options.output, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(`Verified ${evidence.routes.length} canonical routes and redirect-only aliases.`);
  return report;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
