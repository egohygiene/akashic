import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { lstat, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

if (process.argv.length > 2) throw new Error("The intelligence check accepts no arguments.");

const intelligenceDirectory = path.join(process.cwd(), "dist", "intelligence");
const expectedFiles = [
  "build-manifest.json",
  "compare",
  "dashboard",
  "decisions",
  "dependencies",
  "explorer.js",
  "health",
  "index.html",
  "journey",
  "now",
  "provenance.json",
  "releases",
  "roadmap",
  "search",
  "site.css",
  "site.js",
  "styles.css",
  "summary.json",
  "work"
];
const generatedFiles = (await readdir(intelligenceDirectory, { withFileTypes: true }))
  .map((entry) => entry.name)
  .sort();

if (JSON.stringify(generatedFiles) !== JSON.stringify(expectedFiles)) {
  throw new Error(`The repository intelligence subtree has unexpected entries: ${generatedFiles.join(", ")}`);
}

const intelligence = JSON.parse(await readFile(path.join(intelligenceDirectory, "summary.json"), "utf8"));
if (intelligence.schema !== "egohygiene.repository-intelligence-dashboard/v3" || intelligence.schema_version !== 1) {
  throw new Error("The repository intelligence dashboard has an unsupported schema.");
}

const provenance = JSON.parse(await readFile(path.join(intelligenceDirectory, "provenance.json"), "utf8"));
if (
  provenance.schema !== "egohygiene.relay.repository-intelligence-provenance/v1"
  || provenance.schema_version !== 1
) {
  throw new Error("The repository intelligence provenance has an unsupported schema.");
}

const buildManifest = JSON.parse(await readFile(path.join(intelligenceDirectory, "build-manifest.json"), "utf8"));
if (
  buildManifest.schema !== "egohygiene.relay.repository-intelligence-build-manifest/v1"
  || buildManifest.schema_version !== 1
) {
  throw new Error("The Repository Intelligence build manifest has an unsupported schema.");
}

const sourceCommit = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
if (
  intelligence.repository?.name !== "egohygiene/akashic"
  || intelligence.repository?.source_commit !== sourceCommit
) {
  throw new Error("The repository intelligence summary does not represent this Akashic revision.");
}

if (
  provenance.consumer?.repository !== "egohygiene/akashic"
  || provenance.consumer?.source_commit !== sourceCommit
  || provenance.consumer?.visibility !== "public"
) {
  throw new Error("The repository intelligence consumer provenance is inconsistent.");
}

if (
  provenance.generator?.name !== "egohygiene/relay/actions/repository-intelligence"
  || provenance.generator?.version !== "1.6.0"
  || provenance.generator?.repository !== "egohygiene/relay"
  || provenance.generator?.immutable !== true
  || provenance.generator?.source_commit !== "04bd32c8ef492418f47d6df6faee425d6888f341"
  || provenance.generator?.source_ref !== provenance.generator?.source_commit
) {
  throw new Error("The repository intelligence generator provenance is not the reviewed immutable Relay v1.6 package.");
}

if (
  provenance.projection?.route !== "/intelligence/"
  || provenance.projection?.classification !== "public-safe"
  || provenance.projection?.deployment_authority !== "consumer"
) {
  throw new Error("The repository intelligence bundle is not approved for Akashic Pages composition.");
}

if (
  buildManifest.consumer?.repository !== "egohygiene/akashic"
  || buildManifest.consumer?.revision !== sourceCommit
  || buildManifest.generator?.repository !== "egohygiene/relay"
  || buildManifest.generator?.revision !== "04bd32c8ef492418f47d6df6faee425d6888f341"
  || buildManifest.generator?.version !== "1.6.0"
) {
  throw new Error("The deterministic build manifest identities are inconsistent.");
}

const expectedContracts = {
  action_inputs: { schema: "egohygiene.relay.repository-intelligence-inputs/v1", version: 1 },
  analytics: { schema: "egohygiene.repository-analytics/v1", version: 1 },
  build_manifest: { schema: "egohygiene.relay.repository-intelligence-build-manifest/v1", version: 1 },
  dashboard: { schema: "egohygiene.repository-intelligence-dashboard/v3", version: 1 },
  observatory_comparison: { schema: "egohygiene.observatory.repository-intelligence-compare/v1", version: "1.0.0-alpha.1" },
  observatory_snapshot: { schema: "egohygiene.observatory.repository-intelligence-read-model/v1", version: 1 },
  provenance: { schema: "egohygiene.relay.repository-intelligence-provenance/v1", version: 1 },
  repository_report: { schema: "egohygiene.repository-report-summary/v1", version: 1 },
  repository_tree: { schema: "egohygiene.repository-tree/v1", version: 1 }
};
if (JSON.stringify(buildManifest.contracts) !== JSON.stringify(expectedContracts)) {
  throw new Error("The deterministic build manifest contract versions are incompatible.");
}

const sourceEpoch = Number(execFileSync("git", ["show", "--no-patch", "--format=%ct", sourceCommit], { encoding: "utf8" }).trim());
if (!Number.isSafeInteger(buildManifest.source_epoch) || buildManifest.source_epoch !== sourceEpoch) {
  throw new Error("The deterministic build manifest source epoch is inconsistent.");
}

const expectedRoutes = [
  "/intelligence/",
  "/intelligence/compare/",
  "/intelligence/dashboard/",
  "/intelligence/decisions/",
  "/intelligence/dependencies/",
  "/intelligence/health/",
  "/intelligence/journey/",
  "/intelligence/now/",
  "/intelligence/releases/",
  "/intelligence/roadmap/",
  "/intelligence/search/",
  "/intelligence/work/"
];
if (JSON.stringify(buildManifest.enabled_routes) !== JSON.stringify(expectedRoutes)) {
  throw new Error("The deterministic build manifest route inventory is incomplete.");
}

const manifestFiles = [];
let totalBytes = 0;
let previousPath = "";
for (const record of buildManifest.bundle?.files || []) {
  if (
    !record
    || typeof record.path !== "string"
    || !/^[A-Za-z0-9._-]+(?:\/[A-Za-z0-9._-]+)*$/.test(record.path)
    || record.path <= previousPath
    || !Number.isSafeInteger(record.bytes)
    || record.bytes <= 0
    || !/^sha256:[0-9a-f]{64}$/.test(record.sha256 || "")
  ) {
    throw new Error("The deterministic build manifest file inventory is malformed.");
  }
  const filePath = path.join(intelligenceDirectory, ...record.path.split("/"));
  const fileStat = await lstat(filePath);
  const payload = await readFile(filePath);
  const digest = `sha256:${createHash("sha256").update(payload).digest("hex")}`;
  if (fileStat.isSymbolicLink() || !fileStat.isFile() || fileStat.size !== record.bytes || digest !== record.sha256) {
    throw new Error(`The deterministic build manifest does not match ${record.path}.`);
  }
  manifestFiles.push({ bytes: record.bytes, path: record.path, sha256: record.sha256 });
  previousPath = record.path;
  totalBytes += record.bytes;
}
const canonicalInventory = `${JSON.stringify(manifestFiles)}\n`;
const bundleDigest = `sha256:${createHash("sha256").update(canonicalInventory).digest("hex")}`;
if (
  buildManifest.bundle?.algorithm !== "sha256-canonical-file-inventory-v1"
  || buildManifest.bundle?.file_count !== manifestFiles.length
  || buildManifest.bundle?.total_bytes !== totalBytes
  || buildManifest.bundle?.digest !== bundleDigest
) {
  throw new Error("The deterministic build manifest bundle digest is inconsistent.");
}

console.log("Verified the immutable, public-safe Relay v1.6 intelligence bundle for Akashic.");
